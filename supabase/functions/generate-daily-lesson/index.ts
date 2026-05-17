import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Lesson = {
  lesson_name: string;
  setting: string;
  focus_skill: string;
  objective: string;
  materials: string[];
  setup: string[];
  prompting_hierarchy: string[];
  teaching_steps: string[];
  reinforcement: string[];
  error_correction: string[];
  generalization: string[];
  success_criteria: string;
  difficulty_level: 'support' | 'balanced' | 'challenge';
  difficulty_reason: string;
};

function fallbackLesson(category: string): Lesson {
  return {
    lesson_name: `${category} Practice`,
    setting: 'Home',
    focus_skill: category,
    objective: `Practice ${category.toLowerCase()} skills using a simple home-based ABA activity.`,
    materials: ['Preferred toy or snack', 'Simple visual support', 'Quiet space'],
    setup: [
      'Choose a calm area with limited distractions.',
      'Place preferred items nearby but slightly out of reach.',
    ],
    prompting_hierarchy: [
      'Wait briefly for an independent response.',
      'Use a verbal prompt.',
      'Use a gesture prompt.',
      'Model the response.',
      'Use gentle physical support only if appropriate.',
    ],
    teaching_steps: [
      'Present one simple opportunity to respond.',
      'Pause and wait for the child to try.',
      'Prompt only as much as needed.',
      'Reinforce the correct attempt right away.',
      'Repeat for 3 to 5 short trials.',
    ],
    reinforcement: [
      'Use specific praise.',
      'Give access to a preferred item.',
      'Keep the interaction positive and brief.',
    ],
    error_correction: [
      'Pause calmly.',
      'Model the correct response.',
      'Try the step again with more support.',
    ],
    generalization: [
      'Practice in another room later today.',
      'Try the same skill with another caregiver.',
    ],
    success_criteria: 'Complete 3 successful responses with support as needed.',
    difficulty_level: 'balanced',
    difficulty_reason: 'Standard lesson used while personalized content is unavailable.',
  };
}

async function callGemini(prompt: string): Promise<Lesson> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY secret');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini error ${response.status}: ${text}`);
  }

  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) throw new Error('Gemini returned empty response');

  return JSON.parse(text);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing auth header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const adminClient = createClient(supabaseUrl, serviceKey);

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();

    const childId = String(body.childId || '');
    const category = String(body.category || 'Communication');
    const childName = String(body.childName || 'your child');
    const lessonNumber = Number(body.lessonNumber || 1);
    const lessonDate =
      typeof body.lessonDate === 'string'
        ? body.lessonDate
        : new Date().toISOString().split('T')[0];

    if (!childId) {
      return new Response(JSON.stringify({ error: 'Missing childId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: existing } = await adminClient
      .from('daily_lesson_instances')
      .select('*')
      .eq('user_id', user.id)
      .eq('child_id', childId)
      .eq('category', category)
      .eq('lesson_date', lessonDate)
      .maybeSingle();

    if (existing?.lesson_payload) {
      return new Response(
        JSON.stringify({
          status: 'cached',
          lesson: existing.lesson_payload,
          instance: existing,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: recentLogs } = await adminClient
      .from('lesson_logs')
      .select('lesson_number, lesson_name, status, performance_score, completed_at')
      .eq('child_id', childId)
      .eq('category', category)
      .order('completed_at', { ascending: false })
      .limit(8);

    const scored = (recentLogs || []).filter(
      (row) => typeof row.performance_score === 'number'
    );

    const avg =
      scored.length > 0
        ? scored.reduce((sum, row) => sum + Number(row.performance_score), 0) /
          scored.length
        : null;

    const difficulty =
      avg !== null && avg < 60
        ? 'support'
        : avg !== null && avg >= 85
          ? 'challenge'
          : 'balanced';

    const prompt = `
You are a senior BCBA-style parent coaching assistant.

Create one home-based ABA daily lesson.

Child name: ${childName}
Skill category: ${category}
Lesson number: ${lessonNumber}
Recommended difficulty: ${difficulty}
Recent lesson logs:
${JSON.stringify(recentLogs || [])}

Rules:
- Parent-friendly language
- Practical at-home steps
- No punishment or unsafe strategies
- Use least-to-most prompting
- Make the lesson specific to ${category}
- Return ONLY valid JSON

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
  "difficulty_level": "support | balanced | challenge",
  "difficulty_reason": "string"
}
`;

    let lesson: Lesson;
    let source: 'ai' | 'fallback' = 'ai';

    try {
      lesson = await callGemini(prompt);
    } catch (error) {
      console.error('Gemini lesson generation failed:', error);
      lesson = fallbackLesson(category);
      source = 'fallback';
    }

    const now = new Date().toISOString();

    const { data: instance, error: upsertError } = await adminClient
      .from('daily_lesson_instances')
      .upsert(
        {
          user_id: user.id,
          child_id: childId,
          lesson_date: lessonDate,
          category,
          lesson_number: lessonNumber,
          lesson_payload: lesson,
          source,
          status: 'generated',
          last_opened_at: now,
          is_resumed: false,
          resumed_from_date: null,
        },
        {
          onConflict: 'user_id,child_id,category,lesson_date',
        }
      )
      .select()
      .single();

    if (upsertError) throw upsertError;

    return new Response(
      JSON.stringify({
        status: source,
        lesson,
        instance,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Function error:', error);

    return new Response(
      JSON.stringify({
        error: String(error?.message || error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});