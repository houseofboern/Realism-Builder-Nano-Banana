import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

async function callWithRetry(fn: () => Promise<unknown>, retries = 2): Promise<unknown> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (e: unknown) {
      const err = e as { status?: number };
      if (i === retries || (err.status && err.status < 500)) throw e;
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
    }
  }
}

interface GeminiCandidate {
  finishReason?: string;
  content?: {
    parts?: Array<{
      inlineData?: { mimeType: string; data: string };
      text?: string;
    }>;
  };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, images } = await req.json();

    const parts: Array<Record<string, unknown>> = [];

    if (images && Array.isArray(images)) {
      for (const dataUrl of images) {
        const base64 = dataUrl.split(',')[1];
        const mime = dataUrl.split(';')[0].split(':')[1];
        parts.push({ inlineData: { mimeType: mime, data: base64 } });
      }
    }

    parts.push({ text: prompt });

    const response = await callWithRetry(() =>
      ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: [{ role: 'user', parts }],
        config: {
          responseModalities: ['IMAGE', 'TEXT'],
          imageConfig: {
            imageSize: '2K',
          },
        },
      })
    ) as GeminiResponse;

    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      return NextResponse.json({ error: 'No response from model' }, { status: 500 });
    }

    const candidate = candidates[0];
    const finishReason = candidate.finishReason;

    if (finishReason === 'SAFETY') {
      return NextResponse.json({ error: 'Blocked by safety filter — try rephrasing your prompt' }, { status: 400 });
    }

    if (finishReason === 'RECITATION') {
      return NextResponse.json({ error: 'Blocked — content too similar to existing work' }, { status: 400 });
    }

    const responseParts = candidate.content?.parts ?? [];

    for (const part of responseParts) {
      if (part.inlineData) {
        const dataUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        return NextResponse.json({ image: dataUrl });
      }
    }

    const textResponse = responseParts.map((p) => p.text).filter(Boolean).join('\n');
    return NextResponse.json({
      error: textResponse || 'No image generated — model returned text only'
    }, { status: 500 });
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string };
    const status = err.status || 500;
    const msg =
      status === 503 ? 'Gemini is overloaded — try again in a moment'
      : status === 429 ? 'Rate limited — slow down a bit'
      : err.message?.includes('SAFETY') ? 'Blocked by safety filter — try rephrasing'
      : 'Something went wrong';
    return NextResponse.json({ error: msg }, { status });
  }
}

export const maxDuration = 120;
