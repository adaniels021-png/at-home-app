export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export type WorksheetCategory =
  | 'Visual Routines'
  | 'Communication & Social Skills'
  | 'Behavior & Regulation'
  | 'Learning & Life Skills';

export type WorksheetOrientation = 'portrait' | 'landscape';

export type WorksheetItem = {
  id: string;
  title: string;
  category: WorksheetCategory;
  description: string;
  ageRange: string;
  image?: any;
  printImage?: any;
  orientation?: WorksheetOrientation;
};

export const CATEGORIES: Array<WorksheetCategory | 'All'> = [
  'All',
  'Visual Routines',
  'Communication & Social Skills',
  'Behavior & Regulation',
  'Learning & Life Skills',
];

export const WORKSHEETS: WorksheetItem[] = [
  {
    id: 'washing-hands-strip',
    title: 'Task Analysis Strip: Washing Hands',
    category: 'Visual Routines',
    description: 'A step-by-step visual handwashing routine with six clear sequential actions.',
    ageRange: 'Ages 2–8',
    image: require('../assets/worksheets/washing-hands-strip.jpeg'),
    printImage: require('../assets/worksheets/print/washing-hands-print.jpeg'),
    orientation: 'landscape',
  },
  {
    id: 'first-then-board',
    title: 'First/Then Board',
    category: 'Visual Routines',
    description: 'A printable visual support board with cut-and-paste activity icons for routines and transitions.',
    ageRange: 'Ages 2–8',
    image: require('../assets/worksheets/first-then-board.jpeg'),
    printImage: require('../assets/worksheets/print/first-then-board.jpeg'),
    orientation: 'landscape',
  },
  {
    id: 'sandwich-sequencing',
    title: 'Sequencing Story: Making a Sandwich',
    category: 'Visual Routines',
    description: 'A visual sequencing activity where children place sandwich-making steps in the correct order.',
    ageRange: 'Ages 3–8',
    image: require('../assets/worksheets/sandwich-sequencing.jpeg'),
    printImage: require('../assets/worksheets/print/sandwich-sequencing.jpeg'),
    orientation: 'landscape',
  },
  {
    id: 'asking-to-play',
    title: 'Social Story Template: Asking to Play',
    category: 'Communication & Social Skills',
    description: 'A guided social story that teaches children how to approach peers and ask to play appropriately.',
    ageRange: 'Ages 3–8',
    image: require('../assets/worksheets/asking-to-play.jpeg'),
    printImage: require('../assets/worksheets/print/asking-to-play.jpeg'),
    orientation: 'landscape',
  },
  {
    id: 'saying-hello',
    title: 'Conversation Script: Saying Hello',
    category: 'Communication & Social Skills',
    description: 'A simple color-coded greeting conversation worksheet for practicing social exchanges.',
    ageRange: 'Ages 3–8',
    image: require('../assets/worksheets/saying-hello.jpeg'),
    printImage: require('../assets/worksheets/print/saying-hello.jpeg'),
    orientation: 'landscape',
  },
  {
    id: 'free-time-choice-board',
    title: 'Choice Board: Free Time',
    category: 'Communication & Social Skills',
    description: 'A colorful visual choice board that helps children independently choose preferred free-time activities.',
    ageRange: 'Ages 2–8',
    image: require('../assets/worksheets/free-time-choice-board.jpeg'),
    printImage: require('../assets/worksheets/print/free-time-choice-board.jpeg'),
    orientation: 'landscape',
  },
  {
    id: 'calm-to-mad-thermometer',
    title: 'Feelings Thermometer: Calm to Mad',
    category: 'Behavior & Regulation',
    description: 'A visual emotional regulation thermometer helping children identify feelings from calm to very upset.',
    ageRange: 'Ages 3–10',
    image: require('../assets/worksheets/calm-to-mad-thermometer.jpeg'),
    printImage: require('../assets/worksheets/print/calm-to-mad-thermometer.jpeg'),
    orientation: 'landscape',
  },
  {
    id: 'five-stars-token-board',
    title: 'Token Board: 5 Stars for a Reward',
    category: 'Behavior & Regulation',
    description: 'A reinforcement token board where children earn stars toward a motivating reward.',
    ageRange: 'Ages 3–10',
    image: require('../assets/worksheets/five-stars-token-board.jpeg'),
    printImage: require('../assets/worksheets/print/five-stars-token-board.jpeg'),
    orientation: 'landscape',
  },
  {
    id: 'coping-strategy-cards',
    title: 'Coping Strategy Cards',
    category: 'Behavior & Regulation',
    description: 'Illustrated coping and self-regulation strategy cards designed for calm-down support.',
    ageRange: 'Ages 3–10',
    image: require('../assets/worksheets/coping-strategy-cards.jpeg'),
    printImage: require('../assets/worksheets/print/coping-strategy-cards.jpeg'),
    orientation: 'landscape',
  },
  {
    id: 'abc-behavior-chart',
    title: 'Behavior Tracking Sheet (ABC Chart)',
    category: 'Behavior & Regulation',
    description: 'A caregiver-friendly ABC behavior tracking worksheet with antecedent, behavior, consequence, intensity, and duration tracking.',
    ageRange: 'Caregiver Tool',
    image: require('../assets/worksheets/abc-behavior-chart.jpeg'),
    printImage: require('../assets/worksheets/print/abc-behavior-chart.jpeg'),
    orientation: 'landscape',
  },
  {
    id: 'farm-ocean-sorting',
    title: 'Matching & Sorting: Farm vs. Ocean Animals',
    category: 'Learning & Life Skills',
    description: 'A sorting and categorization worksheet where children place animals into farm or ocean groups.',
    ageRange: 'Ages 2–7',
    image: require('../assets/worksheets/farm-ocean-sorting.jpeg'),
    printImage: require('../assets/worksheets/print/farm-ocean-sorting.jpeg'),
    orientation: 'landscape',
  },
  {
    id: 'association-pairs',
    title: 'Go-Together Worksheet: Association Pairs',
    category: 'Learning & Life Skills',
    description: 'A logic and language activity matching naturally associated items together.',
    ageRange: 'Ages 3–8',
    image: require('../assets/worksheets/association-pairs.jpeg'),
    printImage: require('../assets/worksheets/print/association-pairs.jpeg'),
    orientation: 'landscape',
  },
  {
    id: 'paths-to-objects',
    title: 'Tracing / Pre-Writing: Paths to Objects',
    category: 'Learning & Life Skills',
    description: 'A fine-motor tracing worksheet where children follow wavy, zigzag, and looped paths to objects.',
    ageRange: 'Ages 3–7',
    image: require('../assets/worksheets/paths-to-objects.jpeg'),
    printImage: require('../assets/worksheets/print/paths-to-objects.jpeg'),
    orientation: 'landscape',
  },
  {
    id: 'numbers-and-a',
    title: 'High-Contrast Math & Literacy: Numbers and A',
    category: 'Learning & Life Skills',
    description: 'A high-contrast early learning worksheet focused on tracing the number 1 and the letter A.',
    ageRange: 'Ages 3–8',
    image: require('../assets/worksheets/numbers-and-a.jpeg'),
    printImage: require('../assets/worksheets/print/numbers-and-a.jpeg'),
    orientation: 'landscape',
  },
];

export function getSkillFocus(category?: WorksheetCategory) {
  switch (category) {
    case 'Visual Routines':
      return 'Routine completion, independence, sequencing, transitions, and task follow-through.';
    case 'Communication & Social Skills':
      return 'Functional communication, social understanding, requesting, conversation practice, and choice-making.';
    case 'Behavior & Regulation':
      return 'Emotional awareness, coping skills, reinforcement, self-regulation, and behavior tracking.';
    case 'Learning & Life Skills':
      return 'Matching, sorting, fine motor skills, early academics, associations, and functional learning.';
    default:
      return 'Functional home practice and parent-supported learning.';
  }
}

function getDifficultyLabel(difficulty: DifficultyLevel) {
  if (difficulty === 'beginner') return 'Beginner';
  if (difficulty === 'intermediate') return 'Intermediate';
  return 'Advanced';
}

function esc(value: string) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function buildWorksheetHtml({
  worksheet,
  childName,
  difficulty,
}: {
  worksheet: WorksheetItem;
  childName: string;
  difficulty: DifficultyLevel;
}) {
  const safeChildName = esc(childName || 'Child');
  const safeTitle = esc(worksheet.title);
  const safeDescription = esc(worksheet.description);
  const safeDifficulty = getDifficultyLabel(difficulty);

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page { size: Letter; margin: 22px; }
          * { box-sizing: border-box; }
          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #0f172a;
            background: #ffffff;
          }
          .page {
            border: 5px solid #c7d2fe;
            border-radius: 28px;
            padding: 18px;
            background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
          }
          .brand {
            display: inline-block;
            background: #4f46e5;
            color: #ffffff;
            border-radius: 999px;
            padding: 8px 14px;
            font-size: 11px;
            font-weight: 900;
            letter-spacing: 0.8px;
            text-transform: uppercase;
            margin-bottom: 10px;
          }
          h1 {
            font-size: 30px;
            margin: 0 0 8px;
            color: #0f172a;
          }
          .subtitle {
            font-size: 14px;
            color: #475569;
            line-height: 1.45;
            margin-bottom: 14px;
            font-weight: 700;
          }
          .meta {
            display: flex;
            gap: 8px;
            margin-bottom: 16px;
            flex-wrap: wrap;
          }
          .pill {
            border: 2px solid #c7d2fe;
            background: #eef2ff;
            color: #3730a3;
            border-radius: 999px;
            padding: 8px 12px;
            font-size: 11px;
            font-weight: 900;
          }
          .image-note {
            border: 3px dashed #c7d2fe;
            background: #f8fafc;
            border-radius: 20px;
            padding: 24px;
            color: #64748b;
            font-size: 14px;
            font-weight: 800;
            text-align: center;
          }
          .footer {
            margin-top: 20px;
            padding: 12px;
            border-radius: 16px;
            background: #f1f5f9;
            color: #64748b;
            font-size: 10px;
            font-weight: 700;
            line-height: 1.4;
          }
        </style>
      </head>

      <body>
        <div class="page">
          <div class="brand">ABA at Home Printable Worksheet</div>
          <h1>${safeTitle}</h1>
          <div class="subtitle">${safeDescription}</div>

          <div class="meta">
            <div class="pill">Child: ${safeChildName}</div>
            <div class="pill">Level: ${safeDifficulty}</div>
            <div class="pill">${esc(worksheet.category)}</div>
            <div class="pill">${esc(worksheet.ageRange)}</div>
          </div>

          <div class="image-note">
            This worksheet uses its dedicated printable file.
          </div>

          <div class="footer">
            Parent note: Use this worksheet for short, positive practice. Pair with praise,
            breaks, visual supports, and caregiver supervision. Educational support only.
          </div>
        </div>
      </body>
    </html>
  `;
}