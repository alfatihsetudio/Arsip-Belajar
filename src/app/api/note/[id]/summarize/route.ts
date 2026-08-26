import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import pool from '@/lib/db';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { parseNoteContent, serializeNoteContent } from '@/lib/utils/flashcardHelper';

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

    // 1. Get note contents
    const noteRes = await pool.query(
      'SELECT transcribed_text FROM public.notes WHERE id = $1 AND user_id = $2 LIMIT 1',
      [noteId, userId]
    );

    if (noteRes.rows.length === 0) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    const { textContent, flashcards, mindmap } = parseNoteContent(noteRes.rows[0].transcribed_text);

    if (!textContent || textContent.trim().length === 0) {
      return NextResponse.json({ error: 'Teks catatan kosong. Silakan regenerate terlebih dahulu.' }, { status: 400 });
    }

    // 2. Process summary using Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });
    const prompt = `You are an expert educational designer. 
Your goal is to deeply analyze the provided note content and extract ONLY the absolute core learning takeaways, high-level concepts, or formulas.
Do NOT just shorten the text, and do NOT transcribe everything. 
Actively synthesize and understand the content, explaining the core essence in a few high-impact, easy-to-read points.
Format the output beautifully:
- Use plain text.
- Do NOT use markdown symbols (do NOT use #, ##, ###, **, *, _, backticks, or markdown tables).
- For subheadings, use UPPERCASE text on their own line.
- For bullet points, use simple dashes (- text).
- Keep it extremely concise and focused only on the absolute essentials.

NOTE CONTENT:
${textContent}`;

    const result = await model.generateContent(prompt);
    const summaryText = result.response.text().trim();

    // 3. Serialize back and update database
    const updatedText = serializeNoteContent(textContent, flashcards, mindmap, summaryText);

    await pool.query(
      'UPDATE public.notes SET transcribed_text = $1 WHERE id = $2 AND user_id = $3',
      [updatedText, noteId, userId]
    );

    return NextResponse.json({ success: true, summary: summaryText });
  } catch (error: any) {
    console.error('Summarize API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
