// lib/worksheetAiPrompt.ts

import type {
  WorksheetActivityType,
  WorksheetAiRequest,
  WorksheetFormat,
} from './worksheetAiTypes';
import type { WorksheetCategory } from './worksheetTemplates';

const FORMATS: WorksheetFormat[] = [
  'visual_routine',
  'communication_practice',
  'social_story',
  'behavior_regulation',
  'fine_motor',
  'early_learning',
  'life_skills',
  'caregiver_tool',
];

const ACTIVITY_TYPES: WorksheetActivityType[] = [
  'color',
  'circle',
  'trace',
  'match',
  'cut_paste',
  'sequence',
  'draw',
  'maze',
  'choice',
  'checkbox',
  'fill_in',
  'sort',
];

const CATEGORIES: WorksheetCategory[] = [
  'Visual Routines',
  'Communication & Social Skills',
  'Behavior & Regulation',
  'Learning & Life Skills',
];

export function buildWorksheetAiPrompt(request: WorksheetAiRequest) {
  const prompt = request.prompt.trim();
  const category = request.category || 'Learning & Life Skills';
  const difficulty = request.difficulty || 'beginner';
  const childName = request.childName?.trim() || 'Child';
  const ageRange = request.ageRange || 'Ages 3–8';

  return `
You are creating content for ABA at Home, a kid-friendly autism support app.

Create ONE premium children's activity-book style worksheet for autistic learners ages 3–8.

IMPORTANT STYLE:
- Kid-friendly, playful, colorful, and cartoon activity-book inspired.
- It should feel like something a child would want to color, circle, trace, cut, paste, draw, or match.
- Keep language simple for young children and early learners.
- Use short directions.
- Avoid clinical or therapist-heavy wording.
- Avoid long paragraphs.
- Do not create a therapy handout.
- Do not mention diagnosis inside the worksheet.
- Do not overuse the brand or mascot.
- The app will add branding separately.

USER WORKSHEET IDEA:
"${prompt}"

DEFAULTS:
- Category: ${category}
- Difficulty: ${difficulty}
- Child Name: ${childName}
- Age Range: ${ageRange}

Choose the best format from:
${FORMATS.join(', ')}

Choose activity types only from:
${ACTIVITY_TYPES.join(', ')}

Choose category only from:
${CATEGORIES.join(', ')}

Return ONLY valid JSON.
Do not include markdown.
Do not include comments.
Do not include explanations.

JSON shape:

{
  "title": "Short kid-friendly worksheet title",
  "subtitle": "Optional short subtitle",
  "category": "${category}",
  "format": "visual_routine",
  "difficulty": "${difficulty}",
  "ageRange": "${ageRange}",
  "theme": "short theme",
  "skillGoal": "short parent-facing skill goal",
  "childDirections": "one short child-friendly direction",
  "parentTip": "one short practical caregiver tip",
  "parentScript": "short optional parent script",
  "visualStyle": {
    "mood": "playful",
    "useMascot": false,
    "mascotPlacement": "none",
    "illustrationStyle": "activity_book"
  },
  "sections": [
    {
      "id": "section-1",
      "title": "Short section title",
      "instruction": "Short child-friendly instruction",
      "activityType": "color",
      "iconKeyword": "simple icon keyword",
      "traceWord": "optional uppercase trace word",
      "choices": ["optional", "choices"],
      "correctAnswer": "optional",
      "coloringPrompt": "optional coloring prompt",
      "drawingPrompt": "optional drawing prompt",
      "cutPasteLabels": ["optional", "cut", "paste", "labels"],
      "sequenceLabels": ["optional", "sequence", "labels"],
      "matchPairs": [
        { "left": "optional left", "right": "optional right" }
      ]
    }
  ],
  "completionBox": {
    "text": "short celebration message",
    "stickerPrompt": "optional sticker/coloring prompt"
  },
  "safetyNote": "optional short safety note"
}

Rules:
- Generate 4 to 8 sections.
- Every section should be visually active.
- Prefer coloring, tracing, matching, circling, sequencing, cut/paste, or drawing.
- For visual routines, use sequenceLabels or step-based sections.
- For communication worksheets, include choices, simple scripts, or request phrases.
- For regulation worksheets, include feelings, coping choices, or calm-body actions.
- For early learning, include matching, sorting, tracing, counting, colors, shapes, or letters.
- For caregiver tools only, keep it parent-friendly but still clean and printable.
- Make sure the worksheet title and content directly match the user idea.
`;
}