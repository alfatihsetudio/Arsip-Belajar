import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { parseNoteContent, serializeNoteContent } from '@/lib/utils/flashcardHelper';

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

    // Fetch note
    const { data: note, error: fetchError } = await supabase
      .from('notes')
      .select('transcribed_text')
      .eq('id', id)
      .single();

    if (fetchError || !note) {
      return NextResponse.json({ error: 'Catatan tidak ditemukan' }, { status: 404 });
    }

    const { textContent } = parseNoteContent(note.transcribed_text);

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

    // Store mindmap back inside note transcribed_text using another delimiter: ---MINDMAP---
    // Let's check how we serialize it. Since serializeNoteContent only takes flashcards, we can write a helper to serialize multiple metadata blocks or keep mindmap dynamically cached in local storage / session state since generating it is fast, OR append it cleanly:
    // Let's modify the delimiter logic in our helpers to support multiple items, or simply store it appended in transcribed_text.
    // For absolute simplicity and robustness, we can append it as:
    // ---MINDMAP---
    // [JSON data]
    // Let's write a route that returns the generated JSON, and the client component will save it in LocalStorage or we can write a database-free dynamic query.
    // Wait, the best UX is to save it in Supabase!
    // Let's update serializeNoteContent or write a simple custom append in the database query!
    // Yes! Let's update `transcribed_text` by appending:
    // \n\n---MINDMAP---\n[JSON string]
    // Let's see: we can parse it from `transcribed_text` on fetch.

    // Let's retrieve the existing transcribed_text, remove any existing ---MINDMAP--- block, and append the new one.
    let baseText = note.transcribed_text;
    const mindmapIndex = baseText.indexOf('---MINDMAP---');
    if (mindmapIndex !== -1) {
      baseText = baseText.substring(0, mindmapIndex).trim();
    }
    
    const updatedFullText = `${baseText}\n\n---MINDMAP---\n${JSON.stringify(mindmapData, null, 2)}`;

    const { error: updateError } = await supabase
      .from('notes')
      .update({ transcribed_text: updatedFullText })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: 'Gagal menyimpan peta pikiran ke database' }, { status: 500 });
    }

    return NextResponse.json({ success: true, mindmap: mindmapData });
  } catch (err: any) {
    console.error('API Mindmap Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
