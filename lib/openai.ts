import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are an expert BCBA specializing in parent coaching for ABA at Home. Return CLEAN JSON ONLY. Structure: {title, objective, materials[], steps[], success_tip}`;

export const generateABAActivity = async (skill: string, currentLevel: string) => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: `Skill: ${skill}. Level: ${currentLevel}.` }],
      response_format: { type: 'json_object' },
    });
    return JSON.parse(response.choices[0].message.content || '{}');
  } catch (e) {
    console.error(e);
    return null;
  }
};

export default openai;


