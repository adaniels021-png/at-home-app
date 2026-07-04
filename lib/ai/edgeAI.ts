import { extractJsonFromText } from '../aiCore';
import { supabase } from '../supabase';

/**
 * Shared helper for calling the Supabase Edge Function.
 * Every AI engine should use this instead of invoking
 * Supabase directly.
 */

export async function generateJsonWithEdgeFunction<T>(
  prompt: string,
  fallback: T,
  type = 'lesson'
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(
    'generate-daily-lessons',
    {
      body: {
        type,
        prompt,
      },
    }
  );

  console.log(`🤖 Edge AI (${type}) Response:`, data);

  if (error) {
    console.error('Edge Function Error:', error);

    const context = (error as any)?.context;

    if (context) {
      try {
        const errorText = await context.text();
        console.error('Edge Function Body:', errorText);
      } catch (readError) {
        console.error(
          'Unable to read edge function response:',
          readError
        );
      }
    }

    throw error;
  }

  const rawText =
    typeof data?.result === 'string'
      ? data.result.trim()
      : JSON.stringify(data?.result ?? '');

  if (!rawText) {
    console.error('AI returned empty response.', data);
    return fallback;
  }

  const parsed = extractJsonFromText(rawText);

  if (!parsed) {
    console.error('AI JSON Parse Failed');
    console.error(rawText);
    return fallback;
  }

  return parsed as T;
}

/**
 * Simple helper for generating plain text instead of JSON.
 * Useful later for parent encouragement, explanations,
 * summaries, etc.
 */
export async function generateText(
  prompt: string,
  fallback = '',
  type = 'text'
): Promise<string> {
  const { data, error } = await supabase.functions.invoke(
    'generate-daily-lessons',
    {
      body: {
        type,
        prompt,
      },
    }
  );

  if (error) {
    console.error(error);
    return fallback;
  }

  if (typeof data?.result === 'string') {
    return data.result.trim();
  }

  return fallback;
}

/**
 * Generic AI request helper.
 * Future-proof for worksheets, videos,
 * recommendations, etc.
 */
export async function requestAI<T>(
  options: {
    prompt: string;
    type: string;
    fallback: T;
  }
): Promise<T> {
  return generateJsonWithEdgeFunction<T>(
    options.prompt,
    options.fallback,
    options.type
  );
}