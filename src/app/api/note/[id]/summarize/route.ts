import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Get note contents
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select('transcribed_text')
      .eq('id', noteId)
      .eq('user_id', user.id)
      .single();

    if (noteError || !note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    const { textContent, flashcards, mindmap } = parseNoteContent(note.transcribed_text);

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

    const { error: updateError } = await supabase
      .from('notes')
      .update({ transcribed_text: updatedText })
      .eq('id', noteId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Database update error for summary:', updateError);
      return NextResponse.json({ error: 'Gagal menyimpan ringkasan ke database' }, { status: 500 });
    }

    return NextResponse.json({ success: true, summary: summaryText });
  } catch (error: any) {
    console.error('Summarize API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
