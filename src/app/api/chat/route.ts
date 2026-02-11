import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { PROMPT_ENGINEER_SYSTEM } from '@/lib/prompts';

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

export async function POST(req: NextRequest) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  try {
    const { messages, panelImages } = await req.json();

    const panelParts: Array<Record<string, unknown>> = [];
    if (panelImages && Array.isArray(panelImages) && panelImages.length > 0) {
      panelParts.push({ text: 'These are the reference images from the panel:' });
      for (const dataUrl of panelImages) {
        const base64 = dataUrl.split(',')[1];
        const mime = dataUrl.split(';')[0].split(':')[1];
        panelParts.push({ inlineData: { mimeType: mime, data: base64 } });
      }
    }

    const contents = messages.map(
      (m: { role: string; text: string; images?: string[] }, i: number) => {
        const parts: Array<Record<string, unknown>> = [];

        if (i === 0 && panelParts.length > 0) {
          parts.push(...panelParts);
        }

        if (m.images) {
          for (const dataUrl of m.images) {
            const base64 = dataUrl.split(',')[1];
            const mime = dataUrl.split(';')[0].split(':')[1];
            parts.push({ inlineData: { mimeType: mime, data: base64 } });
          }
        }

        if (m.text) {
          parts.push({ text: m.text });
        }

        return {
          role: m.role === 'user' ? 'user' : 'model',
          parts,
        };
      }
    );

    const response = await callWithRetry(() =>
      ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        config: { systemInstruction: PROMPT_ENGINEER_SYSTEM },
        contents,
      })
    ) as { text?: string };

    return NextResponse.json({ text: response.text ?? '' });
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string };
    const status = err.status || 500;
    const msg =
      status === 503 ? 'Gemini is overloaded — try again in a moment'
      : status === 429 ? 'Rate limited — slow down a bit'
      : 'Something went wrong';
    return NextResponse.json({ error: msg }, { status });
  }
}

export const maxDuration = 120;
