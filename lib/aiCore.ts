import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

export const ai = apiKey

  ? new GoogleGenAI({

      apiKey,

    })

  : null;

const TRANSIENT_RETRY_MARKERS = [

  '503',

  '429',

  'UNAVAILABLE',

  'RESOURCE_EXHAUSTED',

  'RATE LIMIT',

];

function stripBulletPrefix(value: string): string {

  return value

    .replace(/^\s*[-•*]\s*/, '')

    .replace(/^\s*\d+[\.\)]\s*/, '')

    .trim();

}

function splitStringToArray(value: string): string[] {

  const normalized = value

    .replace(/\r/g, '\n')

    .replace(/\n•/g, '\n• ')

    .replace(/\n-/g, '\n- ')

    .trim();

  if (!normalized) return [];

  const newlineSplit = normalized

    .split(/\n+/)

    .map(stripBulletPrefix)

    .filter(Boolean);

  if (newlineSplit.length > 1) {

    return newlineSplit;

  }

  return [stripBulletPrefix(normalized)].filter(Boolean);

}


export function safeString(

  value: unknown,

  fallback = ''

): string {

  if (typeof value === 'string' && value.trim()) {

    return value.trim();

  }

  return fallback;

}

export function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') {
          return item.trim();
        }

        if (item && typeof item === 'object') {
          const obj = item as any;

          if (obj.description && obj.type) {
            return `${obj.type}: ${obj.description}`.trim();
          }

          if (obj.description && obj.context) {
            return `${obj.context}: ${obj.description}`.trim();
          }

          if (obj.description && obj.title) {
            return `${obj.title}: ${obj.description}`.trim();
          }

          if (obj.description) {
            return String(obj.description).trim();
          }

          return Object.values(obj)
            .filter(Boolean)
            .map(String)
            .join(': ')
            .trim();
        }

        return String(item ?? '').trim();
      })
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return splitStringToArray(value);
  }

  return [];
}

export function safeStringArray(

  value: unknown,

  fallback: string[] = []

): string[] {

  const cleaned = toStringArray(value);

  return cleaned.length ? cleaned : fallback;

}

export function extractJsonFromText(text: string): any {

  const cleaned = text

    .replace(/```json/g, '')

    .replace(/```/g, '')

    .trim();

  try {

    return JSON.parse(cleaned);

  } catch {}

  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);

  if (arrayMatch) {

    try {

      return JSON.parse(arrayMatch[0]);

    } catch {}

  }

  const objectMatch = cleaned.match(/\{[\s\S]*\}/);

  if (objectMatch) {

    try {

      return JSON.parse(objectMatch[0]);

    } catch {}

  }

  return null;

}

function isTransientAiError(error: unknown): boolean {

  const message = String(

    (error as any)?.message || error || ''

  ).toUpperCase();

  return TRANSIENT_RETRY_MARKERS.some((marker) =>

    message.includes(marker)

  );

}

async function delay(ms: number) {

  await new Promise((resolve) =>

    setTimeout(resolve, ms)

  );

}

export async function retryWithBackoff<T>(

  fn: () => Promise<T>,

  retries = 3,

  initialDelayMs = 1000

): Promise<T> {

  let attempt = 0;

  let lastError: unknown;

  while (attempt < retries) {

    try {

      return await fn();

    } catch (error) {

      lastError = error;

      attempt += 1;

      const shouldRetry =

        attempt < retries &&

        isTransientAiError(error);

      if (!shouldRetry) {

        throw error;

      }

      const waitMs =

        initialDelayMs * Math.pow(2, attempt - 1);

      await delay(waitMs);

    }

  }

  throw lastError;

}