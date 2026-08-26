import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import pool from '@/lib/db';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 60;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

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

    // 2. Fetch images from signed URLs and convert to base64
    const imageParts = await Promise.all(
      media
        .filter((m) => m.media_type === 'image')
        .map(async (m) => {
          const res = await fetch(m.media_url);
          if (!res.ok) {
            throw new Error(`Failed to fetch media image from: ${m.media_url}`);
          }
          const arrayBuffer = await res.arrayBuffer();
          const contentType = res.headers.get('content-type') || 'image/jpeg';
          return {
            inlineData: {
              data: Buffer.from(arrayBuffer).toString('base64'),
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
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });
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
