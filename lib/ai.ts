import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
});

export async function generateActivity(level: string, milestones: string[]) {
  const prompt = `
    You are an expert BCBA (Behavior Analyst). 
    Provide a simple "Natural Environment Teaching" (NET) activity for a child at the ${level} developmental level.
    The child is currently working on: ${milestones.join(', ')}.
    
    Format the response as JSON:
    {
      "title": "Short Activity Name",
      "objective": "What skill are we building?",
      "instructions": "3-4 simple steps for the parent",
      "materials": "Common household items needed"
    }
  `;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: prompt }],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  } catch (error) {
    console.error("AI Generation Error:", error);
    return null;
  }
}
