import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import pool from '@/lib/db';
import { getGeminiModel } from '@/lib/gemini';
import { s3, R2_BUCKET } from '@/lib/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';

export const maxDuration = 60;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: noteId } = await params;
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Verify note ownership
    const noteOwnerCheck = await pool.query(
      'SELECT id FROM public.notes WHERE id = $1 AND user_id = $2 LIMIT 1',
      [noteId, userId]
    );
    if (noteOwnerCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Catatan tidak ditemukan' }, { status: 404 });
    }

    const mediaRes = await pool.query(
      'SELECT media_url, order_index, media_type FROM public.note_media WHERE note_id = $1 ORDER BY order_index ASC',
      [noteId]
    );
    const media = mediaRes.rows;

    if (!media || media.length === 0) {
      return NextResponse.json(
        { error: 'No media files found for this note to regenerate' },
        { status: 404 }
      );
    }

    const getImageMimeType = (type?: string, url?: string) => {
      if (type && type.startsWith('image/')) return type;
      const ext = url?.split('?')[0].split('.').pop()?.toLowerCase();
      if (ext === 'png') return 'image/png';
      if (ext === 'webp') return 'image/webp';
      if (ext === 'gif') return 'image/gif';
      if (ext === 'heic') return 'image/heic';
      if (ext === 'heif') return 'image/heif';
      return 'image/jpeg';
    };

    // 2. Fetch images from R2 or URL and convert to base64
    const imageParts = await Promise.all(
      media
        .filter((m) => m.media_type === 'image')
        .map(async (m) => {
          let buffer: Buffer;
          let contentType = 'image/jpeg';

          if (m.media_url.startsWith('/api/media/') || !m.media_url.startsWith('http')) {
            const key = m.media_url.replace(/^\/?api\/media\//, '');
            const command = new GetObjectCommand({ Bucket: R2_BUCKET, Key: key });
            const response = await s3.send(command);
            const byteArray = await response.Body?.transformToByteArray();
            if (!byteArray) throw new Error(`Failed to download ${key}`);
            buffer = Buffer.from(byteArray);
            contentType = getImageMimeType(response.ContentType, key);
          } else {
            const res = await fetch(m.media_url);
            if (!res.ok) {
              throw new Error(`Failed to fetch media image from: ${m.media_url}`);
            }
            const arrayBuffer = await res.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
            contentType = getImageMimeType(res.headers.get('content-type') || undefined, m.media_url);
          }

          return {
            inlineData: {
              data: buffer.toString('base64'),
              mimeType: contentType,
            },
          };
        })
    );

    if (imageParts.length === 0) {
      return NextResponse.json(
        { error: 'No image media found to process' },
        { status: 400 }
      );
    }

    // 3. Process with Gemini using the prioritizing prompt
    const model = getGeminiModel();
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

    // 4. Update the note in the database
    await pool.query(
      'UPDATE public.notes SET transcribed_text = $1 WHERE id = $2 AND user_id = $3',
      [transcribedText, noteId, userId]
    );

    return NextResponse.json({ success: true, text: transcribedText });
  } catch (error: any) {
    console.error('Regenerate error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
