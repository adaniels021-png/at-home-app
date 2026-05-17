import aiService from './aiService';

/**
 * Interface for the structured data we expect from a session
 */
interface SessionData {
  childFirstName: string;
  therapistName: string;
  rawNotes: string;
  durationMinutes: number;
}

/**
 * Takes raw ABA session data and returns a polished summary for parents.
 */
export const generateParentSummary = async (data: SessionData): Promise<string> => {
  const { childFirstName, rawNotes, therapistName } = data;

  const systemPrompt = `
    You are a professional Board Certified Behavior Analyst (BCBA) writing a daily update for a parent.
    Your goal is to summarize a therapy session based on raw, shorthand notes.
    
    TONE & STYLE:
    - Empathetic, professional, and clear.
    - Avoid heavy technical jargon; if you use an ABA term like "Manding," briefly explain it.
    - Focus on the child's strengths and progress.
    
    REQUIRED STRUCTURE:
    1. **Today's Focus**: A brief overview of what goals were worked on.
    2. **Big Wins**: Highlight 1-2 positive moments or successful skill acquisitions.
    3. **Learning Moments**: Mention challenges neutrally as areas we are supporting.
    
    CONSTRAINTS:
    - Refer to the child only as ${childFirstName}.
    - Sign off as "The ABA at Home Team (documented by ${therapistName})".
    - DO NOT include last names or sensitive ID numbers.
  `;

  const userPrompt = `Raw Session Notes to process: "${rawNotes}"`;

  try {
    const response = await aiService.getChatCompletion(systemPrompt, userPrompt);
    
    if (!response.content) {
      throw new Error("AI returned an empty summary.");
    }

    return response.content;
  } catch (error) {
    console.error("Error generating session summary:", error);
  return `Today, ${childFirstName} worked on their goals with ${therapistName}. Please contact your BCBA for detailed notes.`;
  }
};

export const extractABCData = async (rawNotes: string) => {
  const systemPrompt = "You are a clinical data assistant. Parse the following notes and list any ABC data points found in a structured bulleted format.";
  return await aiService.getChatCompletion(systemPrompt, rawNotes);
};

export default { generateParentSummary, extractABCData };
