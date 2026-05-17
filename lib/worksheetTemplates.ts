export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export type WorksheetCategory =
  | 'Visual Routines'
  | 'Communication & Social Skills'
  | 'Behavior & Regulation'
  | 'Learning & Life Skills';

export type WorksheetItem = {
  id: string;
  title: string;
  category: WorksheetCategory;
  description: string;
  ageRange: string;
  image?: any;
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
    description:
      'A step-by-step visual handwashing routine with six clear sequential actions.',
    ageRange: 'Ages 2–8',
    image: require('../assets/worksheets/washing-hands-strip.jpeg'),
  },

  {
    id: 'first-then-board',
    title: 'First/Then Board',
    category: 'Visual Routines',
    description:
      'A printable visual support board with cut-and-paste activity icons for routines and transitions.',
    ageRange: 'Ages 2–8',
    image: require('../assets/worksheets/first-then-board.jpeg'),
  },

  {
    id: 'sandwich-sequencing',
    title: 'Sequencing Story: Making a Sandwich',
    category: 'Visual Routines',
    description:
      'A visual sequencing activity where children place sandwich-making steps in the correct order.',
    ageRange: 'Ages 3–8',
    image: require('../assets/worksheets/sandwich-sequencing.jpeg'),
  },

  {
    id: 'asking-to-play',
    title: 'Social Story Template: Asking to Play',
    category: 'Communication & Social Skills',
    description:
      'A guided social story that teaches children how to approach peers and ask to play appropriately.',
    ageRange: 'Ages 3–8',
    image: require('../assets/worksheets/asking-to-play.jpeg'),
  },

  {
    id: 'saying-hello',
    title: 'Conversation Script: Saying Hello',
    category: 'Communication & Social Skills',
    description:
      'A simple color-coded greeting conversation worksheet for practicing social exchanges.',
    ageRange: 'Ages 3–8',
    image: require('../assets/worksheets/saying-hello.jpeg'),
  },

  {
    id: 'free-time-choice-board',
    title: 'Choice Board: Free Time',
    category: 'Communication & Social Skills',
    description:
      'A colorful visual choice board that helps children independently choose preferred free-time activities.',
    ageRange: 'Ages 2–8',
    image: require('../assets/worksheets/free-time-choice-board.jpeg'),
  },

  {
    id: 'calm-to-mad-thermometer',
    title: 'Feelings Thermometer: Calm to Mad',
    category: 'Behavior & Regulation',
    description:
      'A visual emotional regulation thermometer helping children identify feelings from calm to very upset.',
    ageRange: 'Ages 3–10',
    image: require('../assets/worksheets/calm-to-mad-thermometer.jpeg'),
  },

  {
    id: 'five-stars-token-board',
    title: 'Token Board: 5 Stars for a Reward',
    category: 'Behavior & Regulation',
    description:
      'A reinforcement token board where children earn stars toward a motivating reward.',
    ageRange: 'Ages 3–10',
    image: require('../assets/worksheets/five-stars-token-board.jpeg'),
  },

  {
    id: 'coping-strategy-cards',
    title: 'Coping Strategy Cards',
    category: 'Behavior & Regulation',
    description:
      'Illustrated coping and self-regulation strategy cards designed for calm-down support.',
    ageRange: 'Ages 3–10',
    image: require('../assets/worksheets/coping-strategy-cards.jpeg'),
  },

  {
    id: 'abc-behavior-chart',
    title: 'Behavior Tracking Sheet (ABC Chart)',
    category: 'Behavior & Regulation',
    description:
      'A caregiver-friendly ABC behavior tracking worksheet with antecedent, behavior, consequence, intensity, and duration tracking.',
    ageRange: 'Caregiver Tool',
    image: require('../assets/worksheets/abc-behavior-chart.jpeg'),
  },

  {
    id: 'farm-ocean-sorting',
    title: 'Matching & Sorting: Farm vs. Ocean Animals',
    category: 'Learning & Life Skills',
    description:
      'A sorting and categorization worksheet where children place animals into farm or ocean groups.',
    ageRange: 'Ages 2–7',
    image: require('../assets/worksheets/farm-ocean-sorting.jpeg'),
  },

  {
    id: 'association-pairs',
    title: 'Go-Together Worksheet: Association Pairs',
    category: 'Learning & Life Skills',
    description:
      'A logic and language activity matching naturally associated items together.',
    ageRange: 'Ages 3–8',
    image: require('../assets/worksheets/association-pairs.jpeg'),
  },

  {
    id: 'paths-to-objects',
    title: 'Tracing / Pre-Writing: Paths to Objects',
    category: 'Learning & Life Skills',
    description:
      'A fine-motor tracing worksheet where children follow wavy, zigzag, and looped paths to objects.',
    ageRange: 'Ages 3–7',
    image: require('../assets/worksheets/paths-to-objects.jpeg'),
  },

  {
    id: 'numbers-and-a',
    title: 'High-Contrast Math & Literacy: Numbers and A',
    category: 'Learning & Life Skills',
    description:
      'A high-contrast early learning worksheet focused on tracing the number 1 and the letter A.',
    ageRange: 'Ages 3–8',
    image: require('../assets/worksheets/numbers-and-a.jpeg'),
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

const colorClasses = ['pink', 'purple', 'blue', 'green', 'yellow', 'orange'];

function svgPicture(type: string) {
  const bg: Record<string, string> = {
    routine: '#BFDBFE',
    task: '#DDD6FE',
    reward: '#FDE68A',
    choice: '#BBF7D0',
    calm: '#A7F3D0',
    help: '#C4B5FD',
    break: '#FDE68A',
    water: '#BAE6FD',
    match: '#FBCFE8',
    write: '#FEF3C7',
    book: '#CFFAFE',
    feelings: '#FCA5A5',
  };

  const fill = bg[type] || '#E0E7FF';

  return `
    <svg class="cartoon-svg" viewBox="0 0 160 120">
      <rect x="10" y="10" width="140" height="100" rx="28" fill="${fill}" />
      <circle cx="80" cy="54" r="28" fill="#FFFFFF" />
      <circle cx="69" cy="49" r="4" fill="#0F172A" />
      <circle cx="91" cy="49" r="4" fill="#0F172A" />
      <path d="M67 65 Q80 76 93 65" stroke="#0F172A" stroke-width="5" fill="none" stroke-linecap="round" />
      <circle cx="38" cy="36" r="12" fill="#FFFFFF" opacity="0.7" />
      <circle cx="124" cy="86" r="14" fill="#FFFFFF" opacity="0.7" />
    </svg>
  `;
}

function kidBox(label: string, height = 110, index = 0, type = 'task') {
  return `
    <div class="kid-box ${colorClasses[index % colorClasses.length]}" style="height:${height}px;">
      ${svgPicture(type)}
      <div class="box-label">${esc(label)}</div>
    </div>
  `;
}

function visualBox(label: string, type = 'calm') {
  return `
    <div class="cartoon-card">
      ${svgPicture(type)}
      <div class="cartoon-label">${esc(label)}</div>
    </div>
  `;
}

function taskAnalysisWorksheet() {
  const steps = ['First', 'Next', 'Then', 'Last'];

  return `
    <div class="activity-banner visual-banner">
      <div class="banner-art">${svgPicture('routine')}</div>
      <div>
        <div class="banner-title">My Routine Steps</div>
        <div class="banner-text">Pick one routine. Draw, paste, or write each small step.</div>
      </div>
    </div>

    <div class="write-line">Routine Name: ________________________________________________</div>

    <div class="strip-grid">
      ${steps.map((step, index) => kidBox(step, 135, index, 'routine')).join('')}
    </div>

    <div class="mini-row">
      ${kidBox('I Finished!', 100, 4, 'reward')}
      ${kidBox('My Reward', 100, 5, 'reward')}
    </div>
  `;
}

function firstThenWorksheet() {
  return `
    <div class="activity-banner first-banner">
      <div class="banner-art">${svgPicture('task')}</div>
      <div>
        <div class="banner-title">First / Then Plan</div>
        <div class="banner-text">A clear visual plan for work before reward.</div>
      </div>
    </div>

    <div class="first-then">
      <div>
        <div class="big-label first-label">FIRST</div>
        ${kidBox('Required Task', 235, 2, 'task')}
      </div>

      <div class="arrow">➜</div>

      <div>
        <div class="big-label then-label">THEN</div>
        ${kidBox('Fun Activity', 235, 4, 'reward')}
      </div>
    </div>

    <div class="speech-bubble">Parent script: “First ____________________, then ____________________.”</div>
  `;
}

function sequencingWorksheet() {
  const labels = ['First', 'Next', 'Then', 'Last'];

  return `
    <div class="activity-banner sequence-banner">
      <div class="banner-art">${svgPicture('book')}</div>
      <div>
        <div class="banner-title">Put the Story in Order</div>
        <div class="banner-text">Draw or paste pictures in the correct order.</div>
      </div>
    </div>

    <div class="sequence-grid">
      ${labels.map((label, index) => kidBox(label, 150, index, 'book')).join('')}
    </div>

    <div class="story-box">
      <div class="story-title">Tell the story:</div>
      <div class="story-lines"></div>
      <div class="story-lines"></div>
    </div>
  `;
}

function socialStoryWorksheet() {
  return `
    <div class="activity-banner social-banner">
      <div class="banner-art">${svgPicture('book')}</div>
      <div>
        <div class="banner-title">My Teaching Story</div>
        <div class="banner-text">Create a simple story for a new or tricky situation.</div>
      </div>
    </div>

    <div class="story-page colorful-page">
      <div class="line-prompt">My story is about: __________________________________________</div>
      <div class="line-prompt">Where it happens: ___________________________________________</div>
      <div class="line-prompt">Who will be there: __________________________________________</div>

      ${kidBox('Draw the situation here', 155, 1, 'book')}

      <div class="sentence-card pink">I can ________________________________________________.</div>
      <div class="sentence-card blue">If I need help, I can __________________________________.</div>
      <div class="sentence-card green">My calm plan is _______________________________________.</div>
    </div>
  `;
}

function conversationScriptWorksheet() {
  return `
    <div class="activity-banner talk-banner">
      <div class="banner-art">${svgPicture('help')}</div>
      <div>
        <div class="banner-title">Conversation Practice</div>
        <div class="banner-text">Practice listening and choosing a response.</div>
      </div>
    </div>

    <table class="script-table">
      <tr>
        <th>Listening Cue</th>
        <th>I Can Say / Do</th>
      </tr>
      <tr><td>Someone says hello.</td><td>Hi / wave / use AAC / smile</td></tr>
      <tr><td>Someone asks, “What do you want?”</td><td>I want ____________.</td></tr>
      <tr><td>Someone says, “Wait.”</td><td>Okay / help / break please</td></tr>
      <tr><td>I need help.</td><td>Help please / show card / point</td></tr>
      <tr><td>I am all done.</td><td>All done / finished / break</td></tr>
    </table>

    <div class="speech-bubble">Practice partner: ____________________ Date: _______________</div>
  `;
}

function choiceBoardWorksheet() {
  return `
    <div class="activity-banner choice-banner">
      <div class="banner-art">${svgPicture('choice')}</div>
      <div>
        <div class="banner-title">I Want Choice Board</div>
        <div class="banner-text">Point, touch, circle, or place pictures in the boxes.</div>
      </div>
    </div>

    <div class="choice-title">I WANT...</div>

    <div class="choice-grid">
      ${Array.from({ length: 6 })
        .map((_, index) => kidBox(`Choice ${index + 1}`, 125, index, 'choice'))
        .join('')}
    </div>

    <div class="speech-bubble">Parent tip: Offer limited choices and honor safe, appropriate selections.</div>
  `;
}

function feelingsThermometerWorksheet() {
  const levels = [
    ['5', 'Out of Control', 'Very upset, unsafe, yelling, crying, or body feels too big.', 'red'],
    ['4', 'Upset', 'Mad, frustrated, worried, or close to losing control.', 'orange'],
    ['3', 'Uncomfortable', 'Annoyed, nervous, confused, or needing help.', 'yellow'],
    ['2', 'Okay', 'Calm enough, but may need reminders or support.', 'blue'],
    ['1', 'Calm', 'Relaxed body, safe hands, ready to learn or play.', 'green'],
  ];

  return `
    <div class="feelings-layout">
      <div class="thermometer-panel">
        <div class="thermo-title">FEELINGS THERMOMETER</div>

        ${levels
          .map(
            ([num, title, text, color]) => `
            <div class="thermo-level ${color}">
              <div class="mini-face">${svgPicture('feelings')}</div>
              <div>
                <strong>${num} - ${title}</strong>
                <span>${text}</span>
              </div>
            </div>
          `
          )
          .join('')}
      </div>

      <div class="response-panel">
        <div class="response-title">WHAT CAN I DO?</div>

        <div class="strategy-row red-light"><strong>Level 5</strong><span>Safe space • Adult help • Calm body first</span></div>
        <div class="strategy-row orange-light"><strong>Level 4</strong><span>Take a break • Quiet voice • Use break card</span></div>
        <div class="strategy-row yellow-light"><strong>Level 3</strong><span>Ask for help • Take 5 breaths • Use PECS or AAC</span></div>
        <div class="strategy-row blue-light"><strong>Level 2</strong><span>Use coping card • Ask for choice • Try again</span></div>
        <div class="strategy-row green-light"><strong>Level 1</strong><span>Ready to learn • Ready to play • Keep going</span></div>

        <div class="custom-plan">
          <div class="custom-title">My Calm Plan</div>
          <div class="line">When I feel upset, I can: ________________________________</div>
          <div class="line">My safe person is: _______________________________________</div>
          <div class="line">My favorite calm choice is: ______________________________</div>
        </div>
      </div>
    </div>
  `;
}

function tokenBoardWorksheet() {
  return `
    <div class="activity-banner token-banner">
      <div class="banner-art">${svgPicture('reward')}</div>
      <div>
        <div class="banner-title">My Token Board</div>
        <div class="banner-text">Earn tokens toward something motivating.</div>
      </div>
    </div>

    <div class="reward-card">I am working for: __________________________________________</div>

    <div class="token-grid">
      ${Array.from({ length: 5 })
        .map((_, index) => `<div class="token ${colorClasses[index % colorClasses.length]}">${svgPicture('reward')}</div>`)
        .join('')}
    </div>

    <div class="reward-card">When I earn my tokens, I get: _______________________________</div>
  `;
}

function copingCardsWorksheet() {
  return `
    <div class="activity-banner coping-banner">
      <div class="banner-art">${svgPicture('calm')}</div>
      <div>
        <div class="banner-title">Coping Strategy Cards</div>
        <div class="banner-text">Cut these out or point to a calm-down choice.</div>
      </div>
    </div>

    <div class="cards-grid">
      ${visualBox('Take deep breaths', 'calm')}
      ${visualBox('Ask for help', 'help')}
      ${visualBox('Quiet space', 'calm')}
      ${visualBox('Take a break', 'break')}
      ${visualBox('Get water', 'water')}
      ${visualBox('Squeeze hands', 'calm')}
    </div>
  `;
}

function behaviorTrackingWorksheet() {
  return `
    <div class="activity-banner tracking-banner">
      <div class="banner-art">${svgPicture('task')}</div>
      <div>
        <div class="banner-title">Behavior Tracker</div>
        <div class="banner-text">Caregiver tool for patterns, triggers, and progress.</div>
      </div>
    </div>

    <table class="tracking-table">
      <tr>
        <th>Date / Time</th>
        <th>Before</th>
        <th>Behavior</th>
        <th>After</th>
        <th>Notes</th>
      </tr>
      ${Array.from({ length: 7 })
        .map(() => '<tr><td></td><td></td><td></td><td></td><td></td></tr>')
        .join('')}
    </table>
  `;
}

function matchingSortingWorksheet() {
  const items = ['Red', 'Blue', 'Circle', 'Square', 'Food', 'Clothes'];

  return `
    <div class="activity-banner learning-banner">
      <div class="banner-art">${svgPicture('match')}</div>
      <div>
        <div class="banner-title">Sort It Out!</div>
        <div class="banner-text">Cut, draw, match, or write items in the right group.</div>
      </div>
    </div>

    <div class="sort-grid">
      ${items.map((item, index) => kidBox(item, 138, index, 'match')).join('')}
    </div>
  `;
}

function goTogetherWorksheet() {
  const pairs = [
    ['Socks', 'Shoes'],
    ['Fork', 'Plate'],
    ['Toothbrush', 'Toothpaste'],
    ['Pillow', 'Bed'],
    ['Cup', 'Drink'],
    ['Book', 'Reading'],
  ];

  return `
    <div class="activity-banner together-banner">
      <div class="banner-art">${svgPicture('match')}</div>
      <div>
        <div class="banner-title">What Goes Together?</div>
        <div class="banner-text">Draw a line, point, cut and match, or say the pair.</div>
      </div>
    </div>

    <table class="match-table">
      <tr><th>Item</th><th>Goes With</th></tr>
      ${pairs
        .map(
          ([a, b]) => `
          <tr>
            <td>${esc(a)}</td>
            <td>${esc(b)}</td>
          </tr>
        `
        )
        .join('')}
    </table>
  `;
}

function tracingWorksheet(childName: string) {
  const name = esc(childName || 'Child');

  return `
    <div class="activity-banner tracing-banner">
      <div class="banner-art">${svgPicture('write')}</div>
      <div>
        <div class="banner-title">Trace, Copy, Try!</div>
        <div class="banner-text">Practice writing with colorful fine-motor warmups.</div>
      </div>
    </div>

    ${[name, name, '________________________', '________________________']
      .map(
        (row, index) => `
      <div class="trace-row ${colorClasses[index % colorClasses.length]}">
        <span>${row}</span>
      </div>
    `
      )
      .join('')}

    <div class="prewriting-grid">
      ${kidBox('Straight Lines', 82, 0, 'write')}
      ${kidBox('Circles', 82, 1, 'write')}
      ${kidBox('Zigzags', 82, 2, 'write')}
      ${kidBox('My Best Try', 82, 3, 'reward')}
    </div>
  `;
}

function highContrastWorksheet() {
  const problems = [
    'A   A   A',
    '1   2   3',
    'Circle the letter B',
    'Count: ● ● ● = ____',
  ];

  return `
    <div class="activity-banner math-banner">
      <div class="banner-art">${svgPicture('book')}</div>
      <div>
        <div class="banner-title">Focus Learning Page</div>
        <div class="banner-text">Simple, clear, colorful practice without too much clutter.</div>
      </div>
    </div>

    <div class="contrast-list">
      ${problems
        .map(
          (item, index) =>
            `<div class="contrast-item ${colorClasses[index % colorClasses.length]}">${esc(item)}</div>`
        )
        .join('')}
    </div>
  `;
}

function worksheetBody(
  worksheet: WorksheetItem,
  childName: string,
  difficulty: DifficultyLevel
) {
  switch (worksheet.id) {
    case 'washing-hands-strip':
      return taskAnalysisWorksheet();

    case 'first-then-board':
      return firstThenWorksheet();

    case 'sandwich-sequencing':
      return sequencingWorksheet();

    case 'asking-to-play':
      return socialStoryWorksheet();

    case 'saying-hello':
      return conversationScriptWorksheet();

    case 'free-time-choice-board':
      return choiceBoardWorksheet();

    case 'calm-to-mad-thermometer':
      return feelingsThermometerWorksheet();

    case 'five-stars-token-board':
      return tokenBoardWorksheet();

    case 'coping-strategy-cards':
      return copingCardsWorksheet();

    case 'abc-behavior-chart':
      return behaviorTrackingWorksheet();

    case 'farm-ocean-sorting':
      return matchingSortingWorksheet();

    case 'association-pairs':
      return goTogetherWorksheet();

    case 'paths-to-objects':
      return tracingWorksheet(childName);

    case 'numbers-and-a':
      return highContrastWorksheet();

    default:
      return kidBox('Worksheet Activity', 300, 0, 'task');
  }
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
          @page {
            size: Letter;
            margin: 22px;
          }

          * {
            box-sizing: border-box;
          }

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

          .activity-banner {
            display: flex;
            align-items: center;
            gap: 12px;
            border-radius: 24px;
            padding: 14px;
            margin: 12px 0 16px;
            border: 3px solid #0f172a;
          }

          .banner-art {
            width: 76px;
            height: 60px;
            overflow: hidden;
            flex-shrink: 0;
          }

          .banner-art svg {
            width: 100%;
            height: 100%;
          }

          .banner-title {
            font-size: 22px;
            font-weight: 900;
            color: #0f172a;
          }

          .banner-text {
            font-size: 13px;
            font-weight: 800;
            color: #334155;
            margin-top: 3px;
          }

          .visual-banner { background: #dbeafe; }
          .first-banner { background: #ede9fe; }
          .sequence-banner { background: #dcfce7; }
          .social-banner { background: #fce7f3; }
          .talk-banner { background: #cffafe; }
          .choice-banner { background: #fef3c7; }
          .token-banner { background: #ffedd5; }
          .coping-banner { background: #e0f2fe; }
          .tracking-banner { background: #f1f5f9; }
          .learning-banner { background: #ccfbf1; }
          .together-banner { background: #fae8ff; }
          .tracing-banner { background: #fef9c3; }
          .math-banner { background: #dbeafe; }

          .write-line,
          .speech-bubble,
          .reward-card {
            border: 3px solid #0f172a;
            border-radius: 18px;
            padding: 13px;
            background: #ffffff;
            font-size: 14px;
            font-weight: 900;
            margin: 12px 0;
          }

          .kid-box,
          .cartoon-card {
            border: 3px solid #0f172a;
            border-radius: 22px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 8px;
            margin-bottom: 10px;
            overflow: hidden;
          }

          .cartoon-svg {
            width: 95px;
            height: 68px;
            margin-bottom: 4px;
          }

          .box-label,
          .cartoon-label {
            font-size: 15px;
            font-weight: 900;
            text-align: center;
          }

          .pink { background: #fce7f3; }
          .purple { background: #ede9fe; }
          .blue { background: #dbeafe; }
          .green { background: #dcfce7; }
          .yellow { background: #fef9c3; }
          .orange { background: #ffedd5; }

          .red { background: #fecaca; }
          .red-light { background: #fee2e2; }
          .orange-light { background: #ffedd5; }
          .yellow-light { background: #fef9c3; }
          .blue-light { background: #dbeafe; }
          .green-light { background: #dcfce7; }

          .strip-grid,
          .sequence-grid,
          .choice-grid,
          .cards-grid,
          .sort-grid,
          .prewriting-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 14px;
            margin-bottom: 16px;
          }

          .mini-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
          }

          .first-then {
            display: grid;
            grid-template-columns: 1fr 55px 1fr;
            align-items: center;
            gap: 12px;
            margin-top: 18px;
          }

          .big-label {
            color: #ffffff;
            padding: 14px;
            text-align: center;
            border-radius: 18px;
            font-size: 26px;
            font-weight: 900;
            margin-bottom: 12px;
            border: 3px solid #0f172a;
          }

          .first-label { background: #4f46e5; }
          .then-label { background: #10b981; }

          .arrow {
            font-size: 42px;
            font-weight: 900;
            text-align: center;
          }

          .story-box,
          .story-page,
          .colorful-page {
            border: 3px solid #0f172a;
            border-radius: 24px;
            padding: 16px;
            background: #ffffff;
          }

          .story-title {
            font-size: 18px;
            font-weight: 900;
            margin-bottom: 10px;
          }

          .story-lines {
            border-bottom: 3px dashed #94a3b8;
            height: 36px;
            margin-bottom: 10px;
          }

          .line-prompt {
            font-size: 15px;
            font-weight: 900;
            margin-bottom: 14px;
            background: #f8fafc;
            padding: 10px;
            border-radius: 14px;
          }

          .sentence-card {
            border: 3px solid #0f172a;
            border-radius: 18px;
            padding: 12px;
            font-size: 15px;
            font-weight: 900;
            margin-bottom: 10px;
          }

          table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            margin-top: 14px;
            overflow: hidden;
            border-radius: 18px;
            border: 3px solid #0f172a;
          }

          th {
            background: #4f46e5;
            color: #ffffff;
            font-size: 13px;
            padding: 11px;
            border-bottom: 3px solid #0f172a;
          }

          td {
            height: 52px;
            border-bottom: 2px solid #cbd5e1;
            border-right: 2px solid #cbd5e1;
            padding: 9px;
            font-size: 13px;
            font-weight: 800;
            vertical-align: top;
            background: #ffffff;
          }

          tr:nth-child(even) td {
            background: #f8fafc;
          }

          .tracking-table td {
            height: 60px;
          }

          .choice-title {
            font-size: 38px;
            font-weight: 900;
            text-align: center;
            margin: 14px 0;
            color: #4f46e5;
          }

          .feelings-layout {
            display: grid;
            grid-template-columns: 0.95fr 1.05fr;
            gap: 16px;
            margin-top: 14px;
          }

          .thermometer-panel,
          .response-panel {
            border: 4px solid #0f172a;
            border-radius: 24px;
            padding: 12px;
            background: #ffffff;
          }

          .thermo-title,
          .response-title {
            background: #0f172a;
            color: #ffffff;
            border-radius: 16px;
            padding: 10px;
            font-size: 17px;
            font-weight: 900;
            text-align: center;
            margin-bottom: 10px;
          }

          .thermo-level {
            display: grid;
            grid-template-columns: 48px 1fr;
            gap: 8px;
            align-items: center;
            border-radius: 18px;
            padding: 9px;
            margin-bottom: 8px;
            border: 3px solid #0f172a;
          }

          .thermo-level strong {
            display: block;
            font-size: 14px;
            margin-bottom: 3px;
          }

          .thermo-level span {
            font-size: 11px;
            font-weight: 800;
            line-height: 1.3;
          }

          .mini-face svg {
            width: 42px;
            height: 34px;
          }

          .strategy-row {
            border: 2px solid #0f172a;
            border-radius: 14px;
            padding: 9px;
            margin-bottom: 8px;
          }

          .strategy-row strong {
            display: block;
            font-size: 13px;
            color: #4f46e5;
            margin-bottom: 3px;
          }

          .strategy-row span {
            font-size: 11px;
            font-weight: 800;
            line-height: 1.3;
          }

          .custom-plan {
            margin-top: 10px;
            border: 3px dashed #4f46e5;
            border-radius: 18px;
            padding: 11px;
            background: #eef2ff;
          }

          .custom-title {
            font-size: 15px;
            font-weight: 900;
            color: #3730a3;
            margin-bottom: 8px;
          }

          .line {
            font-size: 12px;
            font-weight: 900;
            color: #0f172a;
            margin-bottom: 10px;
          }

          .token-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 14px;
            margin: 22px 0;
          }

          .token {
            border: 4px solid #0f172a;
            border-radius: 999px;
            height: 74px;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          }

          .token svg {
            width: 72px;
            height: 56px;
          }

          .trace-row {
            border: 3px solid #0f172a;
            border-radius: 18px;
            height: 66px;
            display: flex;
            align-items: center;
            font-size: 30px;
            letter-spacing: 3px;
            color: #334155;
            margin-bottom: 11px;
            padding-left: 15px;
            font-weight: 900;
          }

          .contrast-list {
            border: 4px solid #0f172a;
            padding: 14px;
            border-radius: 22px;
            background: #ffffff;
          }

          .contrast-item {
            border: 3px solid #0f172a;
            border-radius: 16px;
            padding: 16px;
            font-size: 25px;
            font-weight: 900;
            letter-spacing: 2px;
            margin-bottom: 12px;
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

          ${worksheetBody(worksheet, safeChildName, difficulty)}

          <div class="footer">
            Parent note: Use this worksheet for short, positive practice. Pair with praise,
            breaks, visual supports, and caregiver supervision. Educational support only.
          </div>
        </div>
      </body>
    </html>
  `;
}