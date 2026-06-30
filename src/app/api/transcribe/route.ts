import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 60;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await req.formData();
    const title = formData.get('title') as string;
    const folderId = formData.get('folder_id') as string | null;
    const imageFiles = formData.getAll('images') as File[];

    if (!imageFiles || imageFiles.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
    }
    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // 1. Upload all images to Supabase Storage
    const uploadedUrls: { url: string; order: number }[] = [];

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${user.id}/${Date.now()}-${i}.${fileExt}`;

      const { error: storageError } = await supabase.storage
        .from('media')
        .upload(fileName, buffer, { contentType: file.type || 'image/jpeg' });

      if (storageError) {
        console.error('Storage error:', storageError);
        return NextResponse.json({ error: `Failed to upload image ${i + 1}: ${storageError.message}` }, { status: 500 });
      }

      const { data: signedUrl } = await supabase.storage
        .from('media')
        .createSignedUrl(fileName, 60 * 60 * 24 * 365 * 10); // 10 years

      if (!signedUrl) return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 });
      uploadedUrls.push({ url: signedUrl.signedUrl, order: i });
    }

    // 2. Process all images with Gemini (sequential OCR)
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });

    const imageParts = await Promise.all(
      imageFiles.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        return {
          inlineData: {
            data: Buffer.from(arrayBuffer).toString('base64'),
            mimeType: file.type || 'image/jpeg',
          },
        };
      })
    );

    const prompt = `You are an intelligent study note OCR and formatting assistant. Your task is to extract text from the provided sequential whiteboard or notebook image(s), understand the academic material, and organize it into a highly structured, clean, and logical study guide.

Follow these rules:
1. Extract all readable text from ALL the images. 
2. The images are sequential; later images may contain text already seen in earlier images. Merge them logically and DO NOT duplicate text.
3. Understand the subject matter (e.g. grammar, mathematics, science) and rewrite/restructure the text to make it clean, cohesive, and easy to study. Fix any obvious typos or handwriting errors.
4. Format the final output in clean Markdown:
   - Use clear Headings (#, ##, ###) to separate topics and concepts.
   - Use Markdown Tables (e.g. | Subject | Auxiliary | Verb |) to represent columns, grids, or comparative data.
   - Use clean bullet points or numbered lists for sequential steps or list items.
   - Use bold text for key terminology.
5. Output ONLY the structured study notes. Do not include conversational filler, greetings, or meta-commentary.`;

    const result = await model.generateContent([prompt, ...imageParts]);
    const transcribedText = result.response.text();

    // 3. Save note to database
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .insert({ 
        user_id: user.id, 
        title: title.trim(), 
        transcribed_text: transcribedText,
        folder_id: folderId || null
      })
      .select()
      .single();

    if (noteError || !note) {
      console.error('DB error:', noteError);
      return NextResponse.json({ error: 'Failed to save note' }, { status: 500 });
    }

    // 4. Save media records
    const mediaInserts = uploadedUrls.map(({ url, order }) => ({
      note_id: note.id,
      media_url: url,
      media_type: 'image',
      order_index: order,
    }));

    await supabase.from('note_media').insert(mediaInserts);

    return NextResponse.json({ noteId: note.id });
  } catch (error: any) {
    console.error('Transcribe error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
