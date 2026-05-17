import { serve } from 'https://deno.land/std/http/server.ts'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')

serve(async (req) => {
  try {
    const { type, payload } = await req.json()

    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing API key' }), { status: 500 })
    }

    let prompt = ''

    // 🔹 LESSON GENERATION
    if (type === 'lesson') {
      const { childName, category, lessonNumber } = payload

      prompt = `
You are an ABA therapist.

Create a structured lesson.

Child: ${childName}
Skill: ${category}
Lesson #: ${lessonNumber}

Return JSON only.
`
    }

    // 🔹 ACTIVITIES
    if (type === 'activities') {
      const { childName, skillFocus } = payload

      prompt = `
Create 3 ABA activities.

Child: ${childName}
Focus: ${skillFocus}

Return JSON array.
`
    }

    // 🔹 PROGRESS SUMMARY
    if (type === 'summary') {
      const { logs } = payload

      prompt = `
Summarize this ABA progress:

${JSON.stringify(logs)}

2-3 sentences, simple.
`
    }

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    )

    const data = await response.json()

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}'

    return new Response(JSON.stringify({ result: text }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})