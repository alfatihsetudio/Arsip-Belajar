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
    const folderIdRaw = formData.get('folder_id') as string | null;
    
    console.log('API RECEIVED folder_id:', folderIdRaw);
    
    const folderId = (folderIdRaw && folderIdRaw !== 'null' && folderIdRaw !== 'undefined' && folderIdRaw.trim() !== '')
      ? folderIdRaw.trim()
      : null;

    if (folderId) {
      const { data: folderCheck } = await supabase.from('folders').select('id').eq('id', folderId).eq('user_id', user.id).single();
      if (!folderCheck) {
        return NextResponse.json({ error: 'Folder not found or access denied' }, { status: 403 });
      }
    }
      
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

    const prompt = `You are an expert educational notes transcriber. 
Understand the material from the whiteboard/images deeply. Do NOT transcribe strictly chronologically or spatially (e.g., left to right, top to bottom) if that doesn't make educational sense.
Instead, understand the whiteboard content, analyze the topic, and write the notes structured by educational priority:
1. Identify and write the MOST IMPORTANT concepts, main formulas, or core theories first.
2. Follow up with sub-points, detailed explanations, examples, and secondary details.
3. Organize everything into a beautiful, neat, and highly structured format.

CRITICAL RULES: 
- Output strictly in PLAIN TEXT. 
- NEVER use Markdown symbols (do NOT use #, ##, ###, **, *, _, backticks, or markdown tables).
- For headings, use UPPERCASE text on their own line.
- For bullet points, use simple dashes (e.g. - text) without any bolding or symbols.
- Do not lose any words or equations.`;

    const result = await model.generateContent([prompt, ...imageParts]);
    const transcribedText = result.response.text();

    // AI Smart Tagging generation
    let aiTags: string[] = [];
    try {
      const tagPrompt = `Analyze this educational note and suggest 1 to 3 single-word tags (lowercase, simple, e.g. "grammar", "math", "physics", "indonesia") that represent its subjects. 
      Output strictly as a valid JSON string array (e.g. ["grammar", "english"]). Do not wrap in markdown, do not write explanations.
      
      Note:
      ${transcribedText}`;
      const tagResult = await model.generateContent(tagPrompt);
      const tagResultText = tagResult.response.text().trim();
      let cleanedTagJson = tagResultText;
      if (cleanedTagJson.startsWith('```')) {
        cleanedTagJson = cleanedTagJson.replace(/^```json\s*/, '').replace(/```$/, '').trim();
      }
      aiTags = JSON.parse(cleanedTagJson);
    } catch (tagErr) {
      console.error('Failed to generate AI tags:', tagErr);
    }

    // 3. Save note to database
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .insert({ 
        user_id: user.id, 
        title: title.trim(), 
        transcribed_text: transcribedText,
        folder_id: folderId
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

    // 5. Connect AI generated tags
    if (Array.isArray(aiTags) && aiTags.length > 0) {
      for (const tagName of aiTags) {
        const cleanName = tagName.trim().toLowerCase();
        if (!cleanName) continue;
        try {
          let { data: existingTag } = await supabase
            .from('tags')
            .select('id')
            .eq('name', cleanName)
            .eq('user_id', user.id)
            .maybeSingle();
            
          let tagId = existingTag?.id;
          
          if (!tagId) {
            const { data: newTag, error: newTagErr } = await supabase
              .from('tags')
              .insert({ name: cleanName, user_id: user.id })
              .select('id')
              .single();
            if (!newTagErr && newTag) {
              tagId = newTag.id;
            }
          }
          
          if (tagId) {
            await supabase
              .from('note_tags')
              .insert({ note_id: note.id, tag_id: tagId });
          }
        } catch (tagLinkErr) {
          console.error('Tag link error:', tagLinkErr);
        }
      }
    }

    return NextResponse.json({ noteId: note.id });
  } catch (error: any) {
    console.error('Transcribe error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
