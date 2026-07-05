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

    // Fetch user profile for storage check
    const { data: profile } = await supabase.from('profiles').select('storage_used, subscription_tier').eq('id', user.id).single();
    const subscriptionTier = profile?.subscription_tier || 'free';
    const storageUsed = profile?.storage_used || 0;

    // Optional: Check quota before processing (though frontend also checks)
    const QUOTA = subscriptionTier === 'free' ? 100 * 1024 * 1024 : 
                  subscriptionTier === 'premium_1' ? 1024 * 1024 * 1024 : 
                  3 * 1024 * 1024 * 1024;
    
    if (storageUsed > QUOTA) {
       return NextResponse.json({ error: 'Storage Quota Exceeded. Silakan hapus catatan lama atau upgrade ke Premium.' }, { status: 403 });
    }

    const formData = await req.formData();
    const title = formData.get('title') as string;
    const folderIdRaw = formData.get('folder_id') as string | null;
    const mergeStrategy = formData.get('merge_strategy') as 'gabung' | 'pisah' | null;
    const existingNoteId = formData.get('existing_note_id') as string | null;
    
    const folderId = (folderIdRaw && folderIdRaw !== 'null' && folderIdRaw !== 'undefined' && folderIdRaw.trim() !== '')
      ? folderIdRaw.trim()
      : null;

    if (folderId) {
      const { data: folderCheck } = await supabase.from('folders').select('id').eq('id', folderId).eq('user_id', user.id).single();
      if (!folderCheck) {
        return NextResponse.json({ error: 'Folder not found or access denied' }, { status: 403 });
      }
    }
      
    // New direct upload paths from frontend
    const imagePathsStr = formData.get('image_paths') as string | null;
    const audioPath = formData.get('audio_path') as string | null;
    
    // Legacy support just in case
    const legacyImageFiles = formData.getAll('images') as File[];
    const legacyAudioFile = formData.get('audio') as File | null;

    let imagePaths: string[] = [];
    if (imagePathsStr) {
      try { imagePaths = JSON.parse(imagePathsStr); } catch(e) {}
    }

    if (imagePaths.length === 0 && !audioPath && legacyImageFiles.length === 0 && !legacyAudioFile) {
      return NextResponse.json({ error: 'No media provided' }, { status: 400 });
    }

    const uploadedUrls: { url: string; order: number; type: 'image' | 'audio' }[] = [];
    
    // Helper to download from Supabase Storage for Gemini processing
    const downloadFromStorage = async (path: string) => {
      const { data, error } = await supabase.storage.from('media').download(path);
      if (error || !data) throw new Error(`Failed to download ${path}`);
      return { buffer: Buffer.from(await data.arrayBuffer()), type: data.type };
    };

    // Helper to generate signed url
    const getSignedUrl = async (path: string) => {
      const { data } = await supabase.storage.from('media').createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      return data?.signedUrl;
    };

    const imageParts: { inlineData: { data: string, mimeType: string } }[] = [];
    let audioPart: { inlineData: { data: string, mimeType: string } } | null = null;

    // Process Images
    if (imagePaths.length > 0) {
      for (let i = 0; i < imagePaths.length; i++) {
        const path = imagePaths[i];
        const { buffer, type } = await downloadFromStorage(path);
        imageParts.push({ inlineData: { data: buffer.toString('base64'), mimeType: type || 'image/jpeg' } });
        
        const signedUrl = await getSignedUrl(path);
        if (signedUrl) uploadedUrls.push({ url: signedUrl, order: i, type: 'image' });
      }
    } else if (legacyImageFiles.length > 0) {
      // Legacy handling
      for (let i = 0; i < legacyImageFiles.length; i++) {
        const file = legacyImageFiles[i];
        const buffer = Buffer.from(await file.arrayBuffer());
        imageParts.push({ inlineData: { data: buffer.toString('base64'), mimeType: file.type || 'image/jpeg' } });
        
        const fileExt = file.name.split('.').pop() || 'jpg';
        const fileName = `${user.id}/${Date.now()}-${i}.${fileExt}`;
        await supabase.storage.from('media').upload(fileName, buffer, { contentType: file.type || 'image/jpeg' });
        const signedUrl = await getSignedUrl(fileName);
        if (signedUrl) uploadedUrls.push({ url: signedUrl, order: i, type: 'image' });
      }
    }

    // Process Audio
    if (audioPath) {
      const { buffer, type } = await downloadFromStorage(audioPath);
      let finalMimeType = type || 'audio/mpeg';
      if (finalMimeType.startsWith('video/')) finalMimeType = 'audio/mp4';
      else if (!finalMimeType.startsWith('audio/')) finalMimeType = 'audio/mpeg';
      
      audioPart = { inlineData: { data: buffer.toString('base64'), mimeType: finalMimeType } };
      
      // Ephemeral Audio Logic: ONLY save to note_media if Premium
      if (subscriptionTier !== 'free') {
        const signedUrl = await getSignedUrl(audioPath);
        if (signedUrl) uploadedUrls.push({ url: signedUrl, order: 0, type: 'audio' });
      } else {
        // Free user: Schedule deletion (we can delete right away after AI processing)
        // Wait, if we delete it right away, they won't be able to listen to it. That's the design!
        // We will execute the deletion at the end of this function.
      }
    } else if (legacyAudioFile) {
      const buffer = Buffer.from(await legacyAudioFile.arrayBuffer());
      let finalMimeType = legacyAudioFile.type || 'audio/mpeg';
      if (finalMimeType.startsWith('video/')) finalMimeType = 'audio/mp4';
      else if (!finalMimeType.startsWith('audio/')) finalMimeType = 'audio/mpeg';
      
      audioPart = { inlineData: { data: buffer.toString('base64'), mimeType: finalMimeType } };
      
      const fileExt = legacyAudioFile.name.split('.').pop() || 'mp3';
      const fileName = `${user.id}/${Date.now()}-audio.${fileExt}`;
      await supabase.storage.from('media').upload(fileName, buffer, { contentType: legacyAudioFile.type || 'audio/mpeg' });
      
      if (subscriptionTier !== 'free') {
         const signedUrl = await getSignedUrl(fileName);
         if (signedUrl) uploadedUrls.push({ url: signedUrl, order: 0, type: 'audio' });
      } else {
         // Free user ephemeral deletion
         await supabase.storage.from('media').remove([fileName]);
      }
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
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
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
      const hasBothNew = audioPart && imageParts.length > 0;
      
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
         if (audioPart) mediaParts.push(audioPart);
         if (imageParts.length > 0) mediaParts.push(...imageParts);
      }

      const res = await model.generateContent([mergePrompt, ...mediaParts]);
      transcribedText = res.response.text();
    } else {
      let audioResult = '';
      let imageResult = '';
      
      if (audioPart && imageParts.length > 0) {
        [audioResult, imageResult] = await Promise.all([getAudioResult(), getImageResult()]);
        transcribedText = `TRANSKRIPSI FOTO PAPAN TULIS:\n\n${imageResult}\n\n------------------------------------------------------------\n\nTRANSKRIPSI REKAMAN AUDIO:\n\n${audioResult}`;
      } else if (audioPart) {
        transcribedText = await getAudioResult();
      } else if (imageParts.length > 0) {
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
      const updateData: any = { transcribed_text: transcribedText };
      if (!existingText && uploadedUrls.length > 0 && uploadedUrls[0].type === 'image') {
        updateData.image_url = uploadedUrls[0].url;
      }

      const { error: noteError } = await supabase
        .from('notes')
        .update(updateData)
        .eq('id', existingNoteId);

      if (noteError) throw new Error('Failed to update existing note');
    } else {
      const { data: note, error: noteError } = await supabase
        .from('notes')
        .insert({ 
          user_id: user.id, 
          title: finalTitle, 
          transcribed_text: transcribedText,
          folder_id: folderId,
          image_url: uploadedUrls.find(u => u.type === 'image')?.url || null
        })
        .select()
        .single();

      if (noteError || !note) throw new Error('Failed to save note');
      noteIdToReturn = note.id;
    }

    // Save media records
    const mediaInserts = uploadedUrls.map(({ url, order, type }) => ({
      note_id: noteIdToReturn,
      media_url: url,
      media_type: type,
      order_index: order,
    }));

    if (mediaInserts.length > 0) {
      await supabase.from('note_media').insert(mediaInserts);
    }

    // Connect AI generated tags
    if (Array.isArray(aiTags) && aiTags.length > 0 && noteIdToReturn) {
      for (const tagName of aiTags) {
        const cleanName = tagName.trim().toLowerCase();
        if (!cleanName) continue;
        try {
          const { data: existingTag } = await supabase.from('tags').select('id').eq('name', cleanName).eq('user_id', user.id).maybeSingle();
          let tagId = existingTag?.id;
          if (!tagId) {
            const { data: newTag } = await supabase.from('tags').insert({ name: cleanName, user_id: user.id }).select('id').single();
            tagId = newTag?.id;
          }
          if (tagId) {
            await supabase.from('note_tags').insert({ note_id: noteIdToReturn, tag_id: tagId });
          }
        } catch (e) {}
      }
    }

    // Ephemeral Audio Deletion: Delete from Supabase Storage after successful processing
    if (audioPath && subscriptionTier === 'free') {
       await supabase.storage.from('media').remove([audioPath]);
       console.log('Ephemeral audio deleted:', audioPath);
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
