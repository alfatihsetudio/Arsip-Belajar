import { GoogleGenerativeAI, ModelParams } from '@google/generative-ai';

export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export function getGeminiModel(params?: Partial<ModelParams>) {
  return genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    ...params,
  });
}
