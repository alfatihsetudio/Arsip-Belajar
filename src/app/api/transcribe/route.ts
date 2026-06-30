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

    const prompt = `You are an OCR and formatting assistant. You will receive ${imageFiles.length} sequential image(s) of a whiteboard or handwritten notes. Follow these strict rules:
1. Extract all readable text from ALL the images.
2. The images are sequential; later images may contain text already seen in earlier images. DO NOT duplicate text.
3. Merge the information from all images into one logical, coherent flow.
4. Format the final output strictly in Markdown (use # Headings, - Bullet Points, **Bold text** for key terms). 
5. Do not add conversational filler, explanations, or commentary. Output ONLY the formatted note content.`;

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
