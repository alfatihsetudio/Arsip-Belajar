import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import pool from '@/lib/db';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { parseNoteContent, serializeNoteContent } from '@/lib/utils/flashcardHelper';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch note
    const noteRes = await pool.query(
      'SELECT transcribed_text FROM public.notes WHERE id = $1 AND user_id = $2 LIMIT 1',
      [id, userId]
    );

    if (noteRes.rows.length === 0) {
      return NextResponse.json({ error: 'Catatan tidak ditemukan' }, { status: 404 });
    }

    const { textContent, flashcards, summary } = parseNoteContent(noteRes.rows[0].transcribed_text);

    if (!textContent.trim()) {
      return NextResponse.json({ error: 'Isi catatan kosong' }, { status: 400 });
    }

    // Prompt Gemini for Mind Map structure
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });
    const prompt = `Anda adalah seorang desainer kurikulum edukasi. Ubah catatan pelajaran di bawah ini menjadi struktur Peta Pikiran (Mind Map) hierarkis yang logis untuk membantu siswa memvisualisasikan konsep.
    
Output harus berupa string JSON objek murni yang memuat tree node dengan format:
{
  "name": "Topik Utama",
  "children": [
    {
      "name": "Konsep Penting A",
      "children": [
        { "name": "Detail penjelasan A1" },
        { "name": "Detail penjelasan A2" }
      ]
    },
    {
      "name": "Konsep Penting B",
      "children": [
        { "name": "Detail penjelasan B1" }
      ]
    }
  ]
}

ATURAN:
- Kedalaman hierarki maksimal 3 level (Root -> Anak -> Cucu) agar tidak terlalu rumit.
- Setiap node name harus singkat (maksimal 4-6 kata).
- Output harus berupa array/objek JSON valid saja, tanpa pembungkus markdown, penjelasan pembuka/penutup.

Catatan Pelajaran:
${textContent}`;

    const result = await model.generateContent(prompt);
    const resultText = result.response.text().trim();

    // Clean JSON wrapper
    let cleanedJson = resultText;
    if (cleanedJson.startsWith('```')) {
      cleanedJson = cleanedJson.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    }

    // Validate JSON
    let mindmapData = null;
    try {
      mindmapData = JSON.parse(cleanedJson);
      if (!mindmapData.name) {
        throw new Error('Format root name tidak ditemukan');
      }
    } catch (parseErr) {
      console.error('Gemini output invalid mindmap JSON:', resultText);
      return NextResponse.json({ error: 'Gagal membuat struktur peta pikiran AI' }, { status: 500 });
    }

    const updatedFullText = serializeNoteContent(textContent, flashcards, mindmapData, summary);

    await pool.query(
      'UPDATE public.notes SET transcribed_text = $1 WHERE id = $2 AND user_id = $3',
      [updatedFullText, id, userId]
    );

    return NextResponse.json({ success: true, mindmap: mindmapData });
  } catch (err: any) {
    console.error('API Mindmap Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
