/**
 * ============================================================
 * PROMPTS
 * ------------------------------------------------------------
 * Central location for every AI prompt used by ABA at Home.
 *
 * Every generator should import prompts from here instead of
 * building huge template strings inside business logic.
 *
 * Future:
 * - Worksheet prompts
 * - Video prompts
 * - Recommendation prompts
 * - Assessment prompts
 * ============================================================
 */

export function buildLessonPrompt(params: {
  childName: string;
  skill: string;
  skillTarget: string;
  location: string;
  lessonNumber: number;
  difficultyModifier: string;
  behaviorSummary: string;
  varietyGuidance: string;
  avoidSkills: string[];
  personalizationGuidance?: string;
}) {
  return `
You are creating a real parent-led ABA home lesson for a child.

This should NOT be generic.
This should feel like a simple ABA session a parent can actually run at home.

Child name:
${params.childName}

Category:
${params.skill}

Specific target skill:
${params.skillTarget}

Location:
${params.location}

Lesson number:
${params.lessonNumber}

Difficulty guidance:
${params.difficultyModifier}

Behavior/support pattern:
${params.behaviorSummary}

${params.personalizationGuidance
  ? `Personalization guidance:\n${params.personalizationGuidance}\n`
  : ''}
Variety guidance:
${params.varietyGuidance}

Avoid repeating these lesson ideas:
${params.avoidSkills.length
  ? params.avoidSkills.join(', ')
  : 'None'}

Return ONLY valid compact JSON.

JSON:

{
  "lesson_name":"string",
  "setting":"Home",
  "focus_skill":"string",
  "objective":"string",
  "materials":["string"],
  "setup":["string"],
  "prompting_hierarchy":["string"],
  "teaching_steps":["string"],
  "reinforcement":["string"],
  "error_correction":["string"],
  "generalization":["string"],
  "success_criteria":"string",
  "difficulty_level":"support | balanced | challenge",
  "difficulty_reason":"string",
  "parent_coaching_note":"string",
  "lesson_variation":"string",
  "abc_strategy":"string"
}

Rules:

• Make every lesson feel different.
• Never repeat previous lesson ideas.
• Use exactly 2 materials.
• Use exactly 2 setup steps.
• Use exactly 4 prompting hierarchy steps.
• Use exactly 5 teaching steps.
• Reinforcement must contain exactly 2 items.
• Error correction must contain exactly 2 items.
• Use everyday household items.
• Parent-friendly language only.
• Never mention therapists, clinics, school, or data collection.
• Include natural wait times (3–5 seconds) where appropriate.
• Keep arrays concise.
`;
}

export function buildActivityPrompt(params: {
  childName: string;
  location: string;
  skillFocus: string;
  count: number;
}) {
  return `
Create exactly ${params.count} Daily Adventures.

Child:
${params.childName}

Location preference:
${params.location}

Personalization:
${params.skillFocus}

These should NEVER feel like:

- ABA lessons
- worksheets
- therapy
- drills
- teaching sessions
- homework

Instead create fun family activities.

Return ONLY JSON.

Each activity:

{
"name":"string",
"title":"string",
"category":"home | outdoor | community | sensory | creative | calm | movement",
"location":"string",
"time":"string",
"description":"string",
"try_this":["","",""],
"why_it_helps":"string"
}

Rules

• Exactly ${params.count} activities.
• Every activity should feel unique.
• Keep descriptions warm.
• Parent-friendly language.
• No materials.
• No success criteria.
• No prompting.
• No therapy language.
• Keep try_this under 130 characters.
• Keep why_it_helps under 180 characters.
`;
}

export function buildBehaviorPrompt(params: {
  childName: string;
  behavior: string;
  beforeBehavior: string;
  afterBehavior: string;
  location: string;
  contextSummary: string;
}) {
  return `
You are an experienced BCBA helping a parent at home.

Generate a calm, supportive ABA behavior plan.

Child:
${params.childName}

Context:
${params.contextSummary}

Behavior:
${params.behavior}

Before behavior:
${params.beforeBehavior}

After behavior:
${params.afterBehavior}

Location:
${params.location}

Requirements

• Parent-friendly language
• Never shame caregivers
• Avoid clinical jargon
• Focus on communication
• Focus on regulation
• Keep recommendations realistic

Return ONLY JSON.

{
"possible_reason":"",
"prevention_strategies":[""],
"replacement_skills":[""],
"calming_supports":[""],
"parent_tips":[""],
"encouragement":""
}
`;
}
