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
    const mergeStrategy = formData.get('merge_strategy') as 'gabung' | 'pisah' | null;
    const existingNoteId = formData.get('existing_note_id') as string | null;
    
    console.log('API RECEIVED folder_id:', folderIdRaw, 'merge_strategy:', mergeStrategy, 'existing_note_id:', existingNoteId);
    
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

    // Fetch existing note if appending
    let existingText = '';
    if (existingNoteId) {
      const { data: exNote, error: exErr } = await supabase.from('notes').select('transcribed_text').eq('id', existingNoteId).single();
      if (!exErr && exNote) {
        existingText = exNote.transcribed_text || '';
      }
    }

    // 2. Process with Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });

    const getAudioPart = async (file: File) => {
      const arrayBuffer = await file.arrayBuffer();
      let finalMimeType = file.type || 'audio/mpeg';
      if (finalMimeType.startsWith('video/')) finalMimeType = 'audio/mp4';
      else if (!finalMimeType.startsWith('audio/')) finalMimeType = 'audio/mpeg';
      return { inlineData: { data: Buffer.from(arrayBuffer).toString('base64'), mimeType: finalMimeType } };
    };

    const getImageParts = async (files: File[]) => {
      return Promise.all(files.map(async (file) => ({
        inlineData: { data: Buffer.from(await file.arrayBuffer()).toString('base64'), mimeType: file.type || 'image/jpeg' }
      })));
    };

    const audioPart = audioFile ? await getAudioPart(audioFile) : null;
    const imageParts = imageFiles.length > 0 ? await getImageParts(imageFiles) : [];
    
    let transcribedText = '';

    const basePrompt = `You are an expert educational notes transcriber.
CRITICAL LANGUAGE RULE: 
- DO NOT TRANSLATE! You MUST write the notes in the EXACT SAME LANGUAGE that is spoken or written in the media.
- If Arabic, write in Arabic. If English, in English. If Indonesian, in Indonesian.
- Do not let the English instructions in this prompt trick you into writing in English or translating to another language.

STRUCTURE RULES:
1. Identify and write the MOST IMPORTANT concepts, main formulas, or core theories first.
2. Follow up with sub-points, detailed explanations, examples, and secondary details.
3. Organize everything into a beautiful, neat, and highly structured format.

CRITICAL FORMATTING RULES: 
- Output strictly in PLAIN TEXT. 
- NEVER use Markdown symbols (do NOT use #, ##, ###, **, *, _, backticks, or markdown tables).
- For headings, use UPPERCASE text on their own line.
- For bullet points, use simple dashes (e.g. - text) without any bolding or symbols.
- Do not lose any key words, concepts, or equations.`;

    const getAudioResult = async () => {
      const prompt = `${basePrompt}\n\nListen to the audio recording carefully and extract and structure the educational content.`;
      const res = await model.generateContent([prompt, audioPart!]);
      return res.response.text();
    };

    const getImageResult = async () => {
      const prompt = `${basePrompt}\n\nUnderstand the material from the whiteboard/images deeply and extract and structure the educational content.`;
      const res = await model.generateContent([prompt, ...imageParts]);
      return res.response.text();
    };

    if (mergeStrategy === 'gabung' || (existingNoteId && mergeStrategy !== 'pisah')) {
      // IF GABUNG, or Appending without explicit 'pisah':
      const hasBothNew = audioFile && imageFiles.length > 0;
      
      let mergePrompt = `${basePrompt}\n\n`;
      const mediaParts = [];

      if (existingNoteId) {
        mergePrompt += `I have an EXISTING NOTE. I am adding new media (audio and/or images) to it.\n\nEXISTING NOTE:\n"""\n${existingText}\n"""\n\nYour task: COMBINE the existing note with the insights from the NEW media attached. Rewrite and integrate them coherently into a single structured note.\n`;
        if (audioPart) mediaParts.push(audioPart);
        if (imageParts.length > 0) mediaParts.push(...imageParts);
      } else if (hasBothNew) {
         mergePrompt += `You are provided with BOTH whiteboard images AND an audio recording of a teacher explaining them. Your task: COMBINE the visual information (what is written) with the audio explanation (what is spoken). Create a single, cohesive, comprehensive educational note that integrates both sources perfectly.\n`;
         mediaParts.push(audioPart!);
         mediaParts.push(...imageParts);
      } else {
         // Fallback if Gabung selected but only one media type provided and not appending
         if (audioFile) mediaParts.push(audioPart!);
         if (imageFiles.length > 0) mediaParts.push(...imageParts);
      }

      const res = await model.generateContent([mergePrompt, ...mediaParts]);
      transcribedText = res.response.text();
    } else {
      // PISAH
      let audioResult = '';
      let imageResult = '';
      
      if (audioFile && imageFiles.length > 0) {
        [audioResult, imageResult] = await Promise.all([getAudioResult(), getImageResult()]);
        transcribedText = `TRANSKRIPSI FOTO PAPAN TULIS:\n\n${imageResult}\n\n------------------------------------------------------------\n\nTRANSKRIPSI REKAMAN AUDIO:\n\n${audioResult}`;
      } else if (audioFile) {
        transcribedText = await getAudioResult();
      } else if (imageFiles.length > 0) {
        transcribedText = await getImageResult();
      }

      if (existingNoteId) {
        transcribedText = `${existingText}\n\n------------------------------------------------------------\n\nTAMBAHAN BARU:\n\n${transcribedText}`;
      }
    }

    // AI Smart Tagging and Title generation
    let aiTags: string[] = [];
    let finalTitle = title?.trim();
    
    try {
      const tagPrompt = `Analyze this educational note and suggest 1 to 3 single-word tags (lowercase, simple, e.g. "grammar", "math", "physics", "indonesia") that represent its subjects. 
      Output strictly as a valid JSON string array (e.g. ["grammar", "english"]). Do not wrap in markdown, do not write explanations.
      
      Note:
      ${transcribedText}`;
      
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
      if (cleanedTagJson.startsWith('\`\`\`')) {
        cleanedTagJson = cleanedTagJson.replace(/^\`\`\`json\s*/, '').replace(/\`\`\`$/, '').trim();
      }
      aiTags = JSON.parse(cleanedTagJson);
    } catch (tagErr) {
      console.error('Failed to generate AI tags or title:', tagErr);
    }
    
    if (!finalTitle) {
      finalTitle = `Note ${new Date().toLocaleDateString()}`;
    }

    let noteIdToReturn = existingNoteId;

    if (existingNoteId) {
      // Update existing note
      const updateData: any = { transcribed_text: transcribedText };
      if (!existingText && uploadedUrls.length > 0) {
        updateData.image_url = uploadedUrls[0].url;
      }

      const { error: noteError } = await supabase
        .from('notes')
        .update(updateData)
        .eq('id', existingNoteId);

      if (noteError) {
        console.error('DB update error:', noteError);
        return NextResponse.json({ error: 'Failed to update existing note' }, { status: 500 });
      }
    } else {
      // 3. Save new note to database
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
      noteIdToReturn = note.id;
    }

    // 4. Save media records
    const mediaInserts = uploadedUrls.map(({ url, order, type }) => ({
      note_id: noteIdToReturn,
      media_url: url,
      media_type: type,
      order_index: order,
    }));

    if (mediaInserts.length > 0) {
      const { error: mediaError } = await supabase.from('note_media').insert(mediaInserts);
      if (mediaError) {
        console.error('Media insert error:', mediaError);
      }
    }

    // 5. Connect AI generated tags
    if (Array.isArray(aiTags) && aiTags.length > 0 && noteIdToReturn) {
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
            const { data: newTag } = await supabase
              .from('tags')
              .insert({ name: cleanName, user_id: user.id })
              .select('id')
              .single();
            tagId = newTag?.id;
          }
          
          if (tagId) {
            await supabase.from('note_tags').insert({
              note_id: noteIdToReturn,
              tag_id: tagId
            });
          }
        } catch (e) {
          console.error('Error adding tag:', tagName, e);
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      noteId: noteIdToReturn,
      transcription: transcribedText,
    });
    
  } catch (error: any) {
    console.error('Transcribe error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal Server Error',
      details: error.stack 
    }, { status: 500 });
  }
}
