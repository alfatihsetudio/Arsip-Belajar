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
    const audioFile = formData.get('audio') as File | null;

    if ((!imageFiles || imageFiles.length === 0) && !audioFile) {
      return NextResponse.json({ error: 'No images or audio provided' }, { status: 400 });
    }

    // 1. Upload files to Supabase Storage
    const uploadedUrls: { url: string; order: number; type: 'image' | 'audio' }[] = [];

    if (imageFiles.length > 0) {
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
          .createSignedUrl(fileName, 60 * 60 * 24 * 365 * 10);

        if (!signedUrl) return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 });
        uploadedUrls.push({ url: signedUrl.signedUrl, order: i, type: 'image' });
      }
    }

    if (audioFile) {
      const arrayBuffer = await audioFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const fileExt = audioFile.name.split('.').pop() || 'mp3';
      const fileName = `${user.id}/${Date.now()}-audio.${fileExt}`;

      const { error: storageError } = await supabase.storage
        .from('media')
        .upload(fileName, buffer, { contentType: audioFile.type || 'audio/mpeg' });

      if (storageError) {
        console.error('Storage error:', storageError);
        return NextResponse.json({ error: `Failed to upload audio: ${storageError.message}` }, { status: 500 });
      }

      const { data: signedUrl } = await supabase.storage
        .from('media')
        .createSignedUrl(fileName, 60 * 60 * 24 * 365 * 10);

      if (!signedUrl) return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 });
      uploadedUrls.push({ url: signedUrl.signedUrl, order: 0, type: 'audio' });
    }

    // 2. Process with Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });

    let mediaParts: { inlineData: { data: string; mimeType: string } }[] = [];
    let prompt = '';

    if (audioFile) {
      const arrayBuffer = await audioFile.arrayBuffer();
      let finalMimeType = audioFile.type || 'audio/mpeg';
      if (finalMimeType.startsWith('video/')) {
        finalMimeType = 'audio/mp4';
      } else if (!finalMimeType.startsWith('audio/')) {
        finalMimeType = 'audio/mpeg';
      }
      
      mediaParts = [{
        inlineData: {
          data: Buffer.from(arrayBuffer).toString('base64'),
          mimeType: finalMimeType,
        }
      }];
      prompt = `You are an expert educational notes transcriber.
Listen to the audio recording carefully and transcribe its contents. Do NOT transcribe strictly word-for-word if it's rambling, but extract and structure the educational content:
1. Identify and write the MOST IMPORTANT concepts, main formulas, or core theories first.
2. Follow up with sub-points, detailed explanations, examples, and secondary details.
3. Organize everything into a beautiful, neat, and highly structured format.

CRITICAL RULES: 
- Output strictly in PLAIN TEXT. 
- NEVER use Markdown symbols (do NOT use #, ##, ###, **, *, _, backticks, or markdown tables).
- For headings, use UPPERCASE text on their own line.
- For bullet points, use simple dashes (e.g. - text) without any bolding or symbols.
- Do not lose any key educational points.`;
    } else {
      mediaParts = await Promise.all(
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
      prompt = `You are an expert educational notes transcriber. 
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
    }

    const result = await model.generateContent([prompt, ...mediaParts]);
    const transcribedText = result.response.text();

    // AI Smart Tagging and Title generation
    let aiTags: string[] = [];
    let finalTitle = title?.trim();
    
    try {
      const tagPrompt = `Analyze this educational note and suggest 1 to 3 single-word tags (lowercase, simple, e.g. "grammar", "math", "physics", "indonesia") that represent its subjects. 
      Output strictly as a valid JSON string array (e.g. ["grammar", "english"]). Do not wrap in markdown, do not write explanations.
      
      Note:
      ${transcribedText}`;
      
      // If title is missing, ask for a title as well!
      // But since they have different formats, it's easier to run a parallel prompt for the title.
      const tagPromise = model.generateContent(tagPrompt);
      const titlePromise = !finalTitle 
        ? model.generateContent(`Based on the following transcription of an educational note, generate a very short, clear, and descriptive title (1-4 words). Output ONLY the raw title text, nothing else, no quotes, no markdown. Transcription: ${transcribedText}`)
        : Promise.resolve(null);
      
      const [tagResult, titleResult] = await Promise.all([tagPromise, titlePromise]);
      
      if (titleResult) {
        finalTitle = titleResult.response.text().trim();
      }
      
      const tagResultText = tagResult.response.text().trim();
      let cleanedTagJson = tagResultText;
      if (cleanedTagJson.startsWith('```')) {
        cleanedTagJson = cleanedTagJson.replace(/^```json\s*/, '').replace(/```$/, '').trim();
      }
      aiTags = JSON.parse(cleanedTagJson);
    } catch (tagErr) {
      console.error('Failed to generate AI tags or title:', tagErr);
    }
    
    if (!finalTitle) {
      finalTitle = `Note ${new Date().toLocaleDateString()}`;
    }

    // 3. Save note to database
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .insert({ 
        user_id: user.id, 
        title: finalTitle, 
        transcribed_text: transcribedText,
        folder_id: folderId,
        image_url: uploadedUrls[0]?.url || null
      })
      .select()
      .single();

    if (noteError || !note) {
      console.error('DB error:', noteError);
      return NextResponse.json({ error: 'Failed to save note' }, { status: 500 });
    }

    // 4. Save media records
    const mediaInserts = uploadedUrls.map(({ url, order, type }) => ({
      note_id: note.id,
      media_url: url,
      media_type: type,
      order_index: order,
    }));

    await supabase.from('note_media').insert(mediaInserts);

    // 5. Connect AI generated tags
    if (Array.isArray(aiTags) && aiTags.length > 0) {
      for (const tagName of aiTags) {
        const cleanName = tagName.trim().toLowerCase();
        if (!cleanName) continue;
        try {
          const { data: existingTag } = await supabase
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
