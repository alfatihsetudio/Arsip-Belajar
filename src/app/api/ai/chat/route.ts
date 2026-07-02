import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, history } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Pesan kosong' }, { status: 400 });
    }

    // Call Gemini API
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });

    // Format chat history for prompt
    const formattedHistory = (history || [])
      .map((msg: any) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');

    const prompt = `Anda adalah asisten belajar pribadi yang ramah, santun, asyik, dan sangat cerdas untuk platform 'Arsip Belajar'. Tugas Anda adalah membantu siswa belajar, menjelaskan konsep pelajaran secara sederhana, memotivasi mereka, dan menjadi teman belajar yang interaktif.
    
    ATURAN JAWABAN:
    - Jawab secara ringkas, ramah, dan mudah dipahami oleh siswa.
    - Gunakan bahasa Indonesia.
    - Hindari format markdown tebal yang berlebihan seperti # atau tabel rumit. Gunakan gaya bahasa yang natural, suportif, dan ramah seperti seorang mentor belajar sebaya.
    
    Riwayat Percakapan Sebelumnya:
    ${formattedHistory}
    
    Pertanyaan Siswa Terbaru:
    ${message}`;

    const result = await model.generateContent(prompt);
    const reply = result.response.text().trim();

    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error('API General Chat Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
