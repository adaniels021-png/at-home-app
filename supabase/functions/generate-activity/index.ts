import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { OpenAI } from "https://esm.sh/openai@4.28.0"

serve(async (req) => {
  const { childName, age, level } = await req.json()
  
  const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') })

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: "You are an expert ABA therapist and play coach." },
      { role: "user", content: `Create a fun activity for ${childName}, age ${age} months, level: ${level}. Include: Title, Items Needed, and Step-by-Step Instructions.` }
    ],
  })

  return new Response(JSON.stringify(response.choices[0].message), {
    headers: { "Content-Type": "application/json" },
  })
})
