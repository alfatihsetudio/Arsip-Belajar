import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import pool from '@/lib/db';
import { getPublicUrl, s3, R2_BUCKET } from '@/lib/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 60;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch user profile for storage check (via Neon)
    const profileRes = await pool.query('SELECT storage_used, subscription_tier FROM public.profiles WHERE id = $1 LIMIT 1', [userId]);
    const profile = profileRes.rows[0] || {};
    const subscriptionTier = profile.subscription_tier || 'free';
    const storageUsed = profile.storage_used || 0;

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
      const folderCheck = await pool.query('SELECT id FROM public.folders WHERE id = $1 AND user_id = $2 LIMIT 1', [folderId, userId]);
      if (folderCheck.rows.length === 0) {
        return NextResponse.json({ error: 'Folder not found or access denied' }, { status: 403 });
      }
    }
      
    // New direct upload paths from frontend (R2 keys)
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
    
    // Helper to download from R2 for Gemini processing
    const downloadFromStorage = async (path: string) => {
      const command = new GetObjectCommand({ Bucket: R2_BUCKET, Key: path });
      const response = await s3.send(command);
      const byteArray = await response.Body?.transformToByteArray();
      if (!byteArray) throw new Error(`Failed to download ${path}`);
      return { buffer: Buffer.from(byteArray), type: response.ContentType };
    };

    const imageParts: { inlineData: { data: string, mimeType: string } }[] = [];
    let audioPart: { inlineData: { data: string, mimeType: string } } | null = null;

    // Process Images
    if (imagePaths.length > 0) {
      for (let i = 0; i < imagePaths.length; i++) {
        const path = imagePaths[i];
        const { buffer, type } = await downloadFromStorage(path);
        imageParts.push({ inlineData: { data: buffer.toString('base64'), mimeType: type || 'image/jpeg' } });
        
        const publicUrl = await getPublicUrl(path);
        if (publicUrl) uploadedUrls.push({ url: publicUrl, order: i, type: 'image' });
      }
    } else if (legacyImageFiles.length > 0) {
      // Legacy handling (Should not happen in new upload flow, but kept for fallback)
      for (let i = 0; i < legacyImageFiles.length; i++) {
        const file = legacyImageFiles[i];
        const buffer = Buffer.from(await file.arrayBuffer());
        imageParts.push({ inlineData: { data: buffer.toString('base64'), mimeType: file.type || 'image/jpeg' } });
        // Legacy file will NOT be saved to storage permanently in this flow.
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
        const publicUrl = await getPublicUrl(audioPath);
        if (publicUrl) uploadedUrls.push({ url: publicUrl, order: 0, type: 'audio' });
      }
    } else if (legacyAudioFile) {
      const buffer = Buffer.from(await legacyAudioFile.arrayBuffer());
      let finalMimeType = legacyAudioFile.type || 'audio/mpeg';
      if (finalMimeType.startsWith('video/')) finalMimeType = 'audio/mp4';
      else if (!finalMimeType.startsWith('audio/')) finalMimeType = 'audio/mpeg';
      audioPart = { inlineData: { data: buffer.toString('base64'), mimeType: finalMimeType } };
    }

    // Fetch existing note if appending
    let existingText = '';
    if (existingNoteId) {
      const exNoteRes = await pool.query('SELECT transcribed_text FROM public.notes WHERE id = $1 AND user_id = $2 LIMIT 1', [existingNoteId, userId]);
      if (exNoteRes.rows.length > 0) {
        existingText = exNoteRes.rows[0].transcribed_text || '';
      }
    }

    // 2. Process with Gemini
    const model = genAI.getGenerativeModel({ model: 'models/gemini-flash-lite-latest' });
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
      const updateQuery = `
        UPDATE public.notes 
        SET transcribed_text = $1 ${(!existingText && uploadedUrls.length > 0 && uploadedUrls[0].type === 'image') ? ', image_url = $2' : ''}
        WHERE id = ${(!existingText && uploadedUrls.length > 0 && uploadedUrls[0].type === 'image') ? '$3' : '$2'}
      `;
      const updateParams = [transcribedText];
      if (!existingText && uploadedUrls.length > 0 && uploadedUrls[0].type === 'image') {
        updateParams.push(uploadedUrls[0].url);
      }
      updateParams.push(existingNoteId);

      await pool.query(updateQuery, updateParams);
    } else {
      const insertRes = await pool.query(
        `INSERT INTO public.notes (user_id, title, transcribed_text, folder_id, image_url)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [userId, finalTitle, transcribedText, folderId, uploadedUrls.find(u => u.type === 'image')?.url || null]
      );
      noteIdToReturn = insertRes.rows[0].id;
    }

    // Save media records
    if (uploadedUrls.length > 0) {
      const values = uploadedUrls.map((u, i) => `($1, $${i*3 + 2}, $${i*3 + 3}, $${i*3 + 4})`).join(', ');
      const params: any[] = [noteIdToReturn];
      uploadedUrls.forEach(u => params.push(u.url, u.type, u.order));
      await pool.query(`INSERT INTO public.note_media (note_id, media_url, media_type, order_index) VALUES ${values}`, params);
    }

    // Connect AI generated tags
    if (Array.isArray(aiTags) && aiTags.length > 0 && noteIdToReturn) {
      for (const tagName of aiTags) {
        const cleanName = tagName.trim().toLowerCase();
        if (!cleanName) continue;
        try {
          const tagCheck = await pool.query('SELECT id FROM public.tags WHERE name = $1 AND user_id = $2 LIMIT 1', [cleanName, userId]);
          let tagId = tagCheck.rows[0]?.id;
          if (!tagId) {
            const newTag = await pool.query('INSERT INTO public.tags (name, user_id) VALUES ($1, $2) RETURNING id', [cleanName, userId]);
            tagId = newTag.rows[0]?.id;
          }
          if (tagId) {
            await pool.query('INSERT INTO public.note_tags (note_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [noteIdToReturn, tagId]);
          }
        } catch (e) {
          console.error('Failed to insert tag:', e);
        }
      }
    }

    // Ephemeral Audio Deletion: Delete from R2 after successful processing
    if (audioPath && subscriptionTier === 'free') {
      const { deleteS3Object } = await import('@/lib/s3');
      await deleteS3Object(audioPath);
      console.log('Ephemeral audio deleted from R2:', audioPath);
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
