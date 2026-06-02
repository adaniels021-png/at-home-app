import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

console.log('GEMINI KEY STARTS WITH:', GEMINI_API_KEY?.slice(0, 8));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { type, prompt } = body;

    if (!GEMINI_API_KEY) {
      return jsonResponse({ success: false, error: 'Missing GEMINI_API_KEY' }, 500);
    }

    if (!prompt || typeof prompt !== 'string') {
      return jsonResponse({ success: false, error: 'Missing prompt' }, 400);
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    const data = await geminiResponse.json();

    console.log('FULL GEMINI RESPONSE:', JSON.stringify(data, null, 2));

    if (!geminiResponse.ok) {
      console.error('Gemini API error:', data);

      return jsonResponse(
        {
          success: false,
          error: data?.error?.message || 'Gemini request failed',
          raw: data,
          type,
        },
        geminiResponse.status
      );
    }

    const text =
  data?.candidates?.[0]?.content?.parts
    ?.map((part: any) => part?.text || '')
    .join('')
    .trim() || '';

    if (!text) {
      console.error('Gemini returned empty text:', data);

      return jsonResponse(
        {
          success: false,
          error: 'Gemini returned empty lesson text',
          raw: data,
          type,
        },
        500
      );
    }

    return jsonResponse({
      success: true,
      result: text,
      type,
    });
  } catch (error) {
    console.error('generate-daily-lessons crash:', error);

    return jsonResponse(
      {
        success: false,
        error: String(error),
      },
      500
    );
  }
});

function jsonResponse(payload: any, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}