import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return jsonResponse({ ok: true });
  }

  try {
    const { type, payload, prompt: directPrompt } = await req.json();

    if (!GEMINI_API_KEY) {
      return jsonResponse(
        { success: false, error: 'Missing GEMINI_API_KEY' },
        500
      );
    }

    if (!type) {
      return jsonResponse(
        { success: false, error: 'Missing type' },
        400
      );
    }

    let prompt = '';
    let responseMimeType = 'text/plain';

    if (typeof directPrompt === 'string' && directPrompt.trim()) {
      prompt = directPrompt.trim();
      responseMimeType = type === 'summary' ? 'text/plain' : 'application/json';
    } else if (type === 'lesson' || type === 'premium-lesson') {
      const { childName, category, skill, lessonNumber } = payload || {};
      const finalCategory = category || skill || 'Communication';

      responseMimeType = 'application/json';

      prompt = `
Create one parent-friendly ABA home lesson.

Child name: ${childName || 'your child'}
Category: ${finalCategory}
Lesson number: ${lessonNumber || 1}

Return ONLY compact valid JSON. No markdown. No bullets. No asterisks.

JSON shape:
{
  "lesson_name": "string",
  "setting": "Home",
  "focus_skill": "string",
  "objective": "string",
  "materials": ["string"],
  "setup": ["string"],
  "prompting_hierarchy": ["string"],
  "teaching_steps": ["string"],
  "reinforcement": ["string"],
  "error_correction": ["string"],
  "generalization": ["string"],
  "success_criteria": "string",
  "difficulty_level": "support",
  "difficulty_reason": "string",
  "parent_coaching_note": "string",
  "lesson_variation": "string",
  "abc_strategy": "string"
}

Rules:
- Make the lesson specific to ${finalCategory}.
- Use simple home materials.
- Use 2-4 materials.
- Use 2 setup steps.
- Use 4 prompting steps.
- Use exactly 5 teaching steps.
- Each teaching step must be under 240 characters.
- Objective must be under 550 characters.
- parent_coaching_note must be under 250 characters.
- No markdown formatting inside string values.
- difficulty_level must be one of: support, balanced, challenge.
`;
    } else if (type === 'activities') {
      const { childName, skillFocus } = payload || {};

      responseMimeType = 'application/json';

      prompt = `
Create 3 short parent-friendly ABA home activities.

Child name: ${childName || 'your child'}
Skill focus: ${skillFocus || 'Communication, play, routines, and daily living'}

Return ONLY valid compact JSON array. No markdown.

Each item:
{
  "name": "string",
  "materials": ["string"],
  "instructions": ["string"],
  "success_criteria": "string"
}

Rules:
- Each activity must use simple home materials.
- Each activity must have 3-5 instructions.
- Each instruction must be under 220 characters.
`;
    } else if (type === 'summary') {
      const { logs } = payload || {};

      prompt = `
Summarize this ABA progress in 2-3 simple parent-friendly sentences.

Lesson logs:
${JSON.stringify(logs || [])}
`;
    }

    if (!prompt) {
      return jsonResponse(
        { success: false, error: `Unsupported type: ${type}` },
        400
      );
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
            temperature: type === 'summary' ? 0.4 : 0.55,
            maxOutputTokens:
             type === 'summary' ? 500 :
             type === 'activities' ? 1800 :
             4096,
            responseMimeType,
          },
        }),
      }
    );

    const data = await geminiResponse.json();

    if (!geminiResponse.ok) {
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

    const finishReason = data?.candidates?.[0]?.finishReason;

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((part: any) => part?.text || '')
        .join('')
        .trim() || '';

    if (!text) {
      return jsonResponse(
        {
          success: false,
          error: 'Gemini returned empty text',
          finishReason,
          raw: data,
          type,
        },
        500
      );
    }

    return jsonResponse({
      success: true,
      result: text,
      finishReason,
      type,
    });
  } catch (err) {
    return jsonResponse(
      {
        success: false,
        error: err instanceof Error ? err.message : String(err),
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