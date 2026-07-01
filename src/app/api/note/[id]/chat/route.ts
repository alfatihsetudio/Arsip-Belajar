import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { parseNoteContent } from '@/lib/utils/flashcardHelper';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, history } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Pesan kosong' }, { status: 400 });
    }

    // Fetch note text
    const { data: note, error: fetchError } = await supabase
      .from('notes')
      .select('transcribed_text')
      .eq('id', id)
      .single();

    if (fetchError || !note) {
      return NextResponse.json({ error: 'Catatan tidak ditemukan' }, { status: 404 });
    }

    const { textContent } = parseNoteContent(note.transcribed_text);

    // Call Gemini API
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });

    // Format chat history for prompt
    const formattedHistory = (history || [])
      .map((msg: any) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');

    const prompt = `Anda adalah asisten belajar pribadi yang ramah dan cerdas. Tugas Anda adalah berdiskusi dengan siswa dan menjawab pertanyaan mereka berdasarkan materi catatan di bawah ini.
    
    ATURAN JAWABAN:
    - Jawab secara ringkas, padat, mudah dipahami siswa, dan ramah.
    - Gunakan bahasa Indonesia.
    - Jawab HANYA berdasarkan materi catatan yang diberikan. Jika pertanyaan siswa tidak ada kaitannya dengan catatan, ingatkan mereka secara halus untuk bertanya mengenai materi catatan ini saja.
    - Keluarkan hasil dalam teks biasa, jangan gunakan format markdown yang tebal seperti #, **, atau tabel. Gunakan bahasa yang natural.
    
    Catatan Siswa:
    ${textContent}
    
    Riwayat Percakapan Sebelumnya:
    ${formattedHistory}
    
    Pertanyaan Siswa Terbaru:
    ${message}`;

    const result = await model.generateContent(prompt);
    const reply = result.response.text().trim();

    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error('API Note Chat Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
