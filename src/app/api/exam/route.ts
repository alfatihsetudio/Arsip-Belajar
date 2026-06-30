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

    const { noteId, count = 5 } = await req.json();
    if (!noteId) return NextResponse.json({ error: 'noteId is required' }, { status: 400 });

    const { data: note } = await supabase
      .from('notes')
      .select('title, transcribed_text')
      .eq('id', noteId)
      .eq('user_id', user.id)
      .single();

    if (!note) return NextResponse.json({ error: 'Note not found' }, { status: 404 });

    const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });

    const prompt = `You are an exam question generator. Based on the following study note, generate exactly ${count} multiple-choice questions to test understanding.

STUDY NOTE:
Title: ${note.title}
Content:
${note.transcribed_text}

OUTPUT FORMAT (strict JSON only, no markdown, no explanation):
{
  "questions": [
    {
      "question": "...",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "answer": "A. ..."
    }
  ]
}

Rules:
- Each question must have exactly 4 options labeled A, B, C, D
- The "answer" field must be one of the 4 options (exact match)
- Questions should test factual recall and understanding
- Output ONLY the JSON, nothing else`;

    const result = await model.generateContent(prompt);
    const rawText = result.response.text();

    // Parse JSON from response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid AI response format');
    
    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.questions || !Array.isArray(parsed.questions)) throw new Error('Invalid questions format');

    return NextResponse.json({ questions: parsed.questions });
  } catch (error: any) {
    console.error('Exam API error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate exam' }, { status: 500 });
  }
}
