import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.2.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { childName, ageMonths, category, systemInstruction } = await req.json();
    
    // 1. Get your Gemini API Key from Supabase Secrets
    const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY') || "");
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
      ${systemInstruction}
      
      Target Child: ${childName}
      Age: ${ageMonths} months
      Skill Category: ${category}

      Return a JSON object with the following keys:
      name, materials, instructions, pro_tip, success_criteria, video_term.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return new Response(text, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
  const message = error instanceof Error ? error.message : String(error);

  return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})