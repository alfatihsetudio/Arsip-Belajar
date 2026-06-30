import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function GET(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not set' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Using the client to list models
    // Note: listModels is a method on the GoogleGenerativeAI class in older versions,
    // or we can fetch it directly from the API endpoint.
    // Let's call the API endpoint directly using fetch to be 100% safe and get raw data.
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    ).catch(e => {
      console.error('Fetch error:', e);
      throw new Error(`Fetch failed: ${e.message}. Cause: ${JSON.stringify(e.cause || {})}`);
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json({ error: data }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message, cause: error.cause }, { status: 500 });
  }
}
