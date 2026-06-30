import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Vercel deployment: increase max duration for slow AI processing
export const maxDuration = 60; 

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // 1. Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 2. Upload to Supabase Storage
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    
    const { data: storageData, error: storageError } = await supabase.storage
      .from('note-images')
      .upload(fileName, buffer, {
        contentType: file.type || 'image/jpeg',
      });

    if (storageError) {
      console.error('Storage error:', storageError);
      return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
    }

    // Get a long-lived signed URL to display the image
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('note-images')
      .createSignedUrl(fileName, 60 * 60 * 24 * 365 * 10); // 10 years
      
    if (signedUrlError || !signedUrlData) {
      return NextResponse.json({ error: 'Failed to generate image URL' }, { status: 500 });
    }
    
    const imageUrl = signedUrlData.signedUrl;

    // 3. Process with Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = "You are a strict Optical Character Recognition (OCR) machine. Your ONLY task is to read the text from the provided image and transcribe it accurately. Format the output with clear paragraphs or bullet points if necessary for readability. YOU ARE STRICTLY FORBIDDEN from adding any explanations, summaries, additional context, or teaching the material. Output ONLY the transcribed text.";

    const imageParts = [
      {
        inlineData: {
          data: buffer.toString("base64"),
          mimeType: file.type || "image/jpeg"
        }
      }
    ];

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const transcribedText = response.text();

    // 4. Save to Database
    const { data: noteData, error: dbError } = await supabase
      .from('notes')
      .insert({
        user_id: user.id,
        image_url: imageUrl,
        transcribed_text: transcribedText
      })
      .select()
      .single();

    if (dbError) {
      console.error('DB error:', dbError);
      return NextResponse.json({ error: 'Failed to save note' }, { status: 500 });
    }

    return NextResponse.json({ noteId: noteData.id });

  } catch (error: any) {
    console.error('Error processing upload:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
