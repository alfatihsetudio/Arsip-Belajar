import { GoogleGenerativeAI, ModelParams } from '@google/generative-ai';

export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export function getGeminiModel(params?: Partial<ModelParams>) {
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    ...params,
  });

  const originalGenerateContent = model.generateContent.bind(model);
  model.generateContent = (async (...args: any[]) => {
    let lastError: any;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await originalGenerateContent(...(args as [any]));
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || '');
        const status = err?.status;
        const isRetryable =
          status === 503 ||
          status === 429 ||
          msg.includes('503') ||
          msg.includes('high demand') ||
          msg.includes('Resource has been exhausted') ||
          msg.includes('RESOURCE_EXHAUSTED');
        if (isRetryable && attempt < 2) {
          console.warn(`[Gemini] Attempt ${attempt + 1} failed (${msg}). Retrying in ${(attempt + 1) * 1500}ms...`);
          await new Promise((r) => setTimeout(r, (attempt + 1) * 1500));
          continue;
        }
        throw err;
      }
    }
    throw lastError;
  }) as typeof model.generateContent;

  return model;
}
