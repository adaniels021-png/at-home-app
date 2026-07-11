// lib/worksheetAssetPlanner.ts

import type {
  WorksheetSkillInterpretation,
  WorksheetStyleIntent,
} from './worksheetSkillInterpreter';
import type { DifficultyLevel, WorksheetCategory } from './worksheetTemplates';

export type WorksheetIllustrationStyle =
  | 'premium_kid_friendly'
  | 'activity_book'
  | 'soft_cartoon'
  | 'visual_support';

export type WorksheetAssetPlanItem = {
  assetKey: string;
  title: string;
  description: string;
  prompt: string;
  tags: string[];
  category: WorksheetCategory;
  targetSkill: string;
  usage:
    | 'main_visual'
    | 'step_card'
    | 'choice_card'
    | 'matching_card'
    | 'sorting_card'
    | 'calm_card'
    | 'cut_paste_card'
    | 'background_accent';
  sortOrder: number;
};

export type WorksheetAssetPlan = {
  worksheetTitle: string;
  targetSkill: string;
  category: WorksheetCategory;
  difficulty: DifficultyLevel;
  worksheetStyle: WorksheetStyleIntent;
  illustrationStyle: WorksheetIllustrationStyle;
  requiredAssetKeys: string[];
  assets: WorksheetAssetPlanItem[];
};

type PlannerInput = {
  interpretation: WorksheetSkillInterpretation;
  category?: WorksheetCategory;
  difficulty?: DifficultyLevel;
  childName?: string;
  customization?: string | null;
};

function toTitleCase(value?: string | null) {
  return String(value || '')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function basePrompt(input: {
  title: string;
  targetSkill: string;
  category: WorksheetCategory;
  difficulty: DifficultyLevel;
  customization?: string | null;
  usage: WorksheetAssetPlanItem['usage'];
}) {
  const usageText =
    input.usage === 'step_card'
      ? 'This illustration will be placed inside one worksheet step card.'
      : input.usage === 'matching_card'
        ? 'This illustration will be used for a matching activity card.'
        : input.usage === 'sorting_card'
          ? 'This illustration will be used for a sorting activity card.'
          : input.usage === 'main_visual'
            ? 'This illustration will be used as the main child-friendly worksheet visual.'
            : 'This illustration will be used inside a printable worksheet activity.';

  return [
    `Create one premium children's educational worksheet illustration.`,
    `Subject: ${input.title}.`,
    `Target skill: ${input.targetSkill}.`,
    `Worksheet category: ${input.category}.`,
    `Difficulty level: ${input.difficulty}.`,
    usageText,
    input.customization ? `Theme/customization: ${input.customization}.` : '',
    `Art direction: premium children's activity book illustration, polished, warm, colorful, kid-friendly, professional.`,
    `Use soft rounded shapes, expressive friendly characters, clean outlines, gentle shadows, bright calming colors, and a high-quality printable look.`,
    `The image should feel like it belongs in a premium preschool or autism-support worksheet.`,
    `Use a clean white or transparent background so it can be placed inside a worksheet card.`,
    `Keep the subject large, centered, clear, and easy for a young child to understand.`,
    `Avoid clutter. Avoid tiny details. Avoid clinical or generic icon style.`,
    `No text inside the image.`,
    `No letters, no labels, no numbers, no watermark, no logo.`,
    `Do not create a full worksheet page. Only create the single illustration asset.`,
  ]
    .filter(Boolean)
    .join(' ');
}

function makeAsset(input: {
  keyBase: string;
  title: string;
  description: string;
  category: WorksheetCategory;
  targetSkill: string;
  difficulty: DifficultyLevel;
  customization?: string | null;
  usage: WorksheetAssetPlanItem['usage'];
  sortOrder: number;
  tags?: string[];
}) {
  const assetKey = normalizeKey(input.keyBase);

  return {
    assetKey,
    title: input.title,
    description: input.description,
    prompt: basePrompt({
      title: input.description,
      targetSkill: input.targetSkill,
      category: input.category,
      difficulty: input.difficulty,
      customization: input.customization,
      usage: input.usage,
    }),
    tags: unique([
      input.targetSkill,
      input.category,
      input.usage,
      ...(input.tags || []),
    ]).map(normalizeKey),
    category: input.category,
    targetSkill: input.targetSkill,
    usage: input.usage,
    sortOrder: input.sortOrder,
  };
}

function getBaseValues(input: PlannerInput) {
  return {
    category: input.category || input.interpretation.category,
    difficulty: input.difficulty || input.interpretation.recommendedDifficulty,
    targetSkill: input.interpretation.targetSkill || 'Skill Practice',
  };
}

function planHandwashing(input: PlannerInput): WorksheetAssetPlanItem[] {
  const { category, difficulty, targetSkill } = getBaseValues(input);

  const steps = [
    ['handwashing-turn-on-water', 'Child turning on sink faucet with water running'],
    ['handwashing-get-soap', 'Child putting soap on hands from soap pump'],
    ['handwashing-scrub-hands', 'Child scrubbing hands with lots of bubbles'],
    ['handwashing-rinse-hands', 'Child rinsing soapy hands under clean water'],
    ['handwashing-dry-hands', 'Child drying hands with soft towel'],
    ['handwashing-all-done', 'Child smiling and showing clean hands all done'],
  ];

  return steps.map(([key, description], index) =>
    makeAsset({
      keyBase: key,
      title: toTitleCase(description),
      description,
      category,
      targetSkill,
      difficulty,
      customization: input.customization,
      usage: 'step_card',
      sortOrder: index + 1,
      tags: ['handwashing', 'hygiene', 'bathroom', 'routine', 'task analysis'],
    })
  );
}

function planToothBrushing(input: PlannerInput): WorksheetAssetPlanItem[] {
  const { category, difficulty, targetSkill } = getBaseValues(input);

  const steps = [
    ['toothbrushing-hold-toothbrush', 'Child holding toothbrush and toothpaste at bathroom sink'],
    ['toothbrushing-add-toothpaste', 'Child putting toothpaste on toothbrush'],
    ['toothbrushing-brush-teeth', 'Child brushing teeth with happy face'],
    ['toothbrushing-rinse-mouth', 'Child rinsing mouth with small cup'],
    ['toothbrushing-rinse-toothbrush', 'Child rinsing toothbrush under faucet'],
    ['toothbrushing-all-done', 'Child smiling with clean teeth all done'],
  ];

  return steps.map(([key, description], index) =>
    makeAsset({
      keyBase: key,
      title: toTitleCase(description),
      description,
      category,
      targetSkill,
      difficulty,
      customization: input.customization,
      usage: 'step_card',
      sortOrder: index + 1,
      tags: ['tooth brushing', 'hygiene', 'bathroom', 'routine', 'task analysis'],
    })
  );
}

function planToileting(input: PlannerInput): WorksheetAssetPlanItem[] {
  const { category, difficulty, targetSkill } = getBaseValues(input);

  const steps = [
    ['toileting-walk-to-bathroom', 'Child walking calmly to bathroom'],
    ['toileting-pants-down', 'Child pulling pants down for potty routine'],
    ['toileting-sit-on-potty', 'Child sitting calmly on potty'],
    ['toileting-wipe', 'Child using toilet paper appropriately'],
    ['toileting-flush', 'Child flushing toilet'],
    ['toileting-wash-hands', 'Child washing hands after potty routine'],
  ];

  return steps.map(([key, description], index) =>
    makeAsset({
      keyBase: key,
      title: toTitleCase(description),
      description,
      category,
      targetSkill,
      difficulty,
      customization: input.customization,
      usage: 'step_card',
      sortOrder: index + 1,
      tags: ['potty', 'toileting', 'bathroom', 'routine', 'task analysis'],
    })
  );
}

function planEmotions(input: PlannerInput): WorksheetAssetPlanItem[] {
  const { category, difficulty, targetSkill } = getBaseValues(input);

  const emotions = [
    ['emotion-happy-child', 'Child showing happy face'],
    ['emotion-sad-child', 'Child showing sad face'],
    ['emotion-mad-child', 'Child showing mad face'],
    ['emotion-scared-child', 'Child showing scared face'],
    ['emotion-calm-child', 'Child showing calm face'],
    ['emotion-surprised-child', 'Child showing surprised face'],
  ];

  return emotions.map(([key, description], index) =>
    makeAsset({
      keyBase: key,
      title: toTitleCase(description),
      description,
      category,
      targetSkill,
      difficulty,
      customization: input.customization,
      usage: 'matching_card',
      sortOrder: index + 1,
      tags: ['emotions', 'feelings', 'social skills', 'matching'],
    })
  );
}

function planMatching(input: PlannerInput): WorksheetAssetPlanItem[] {
  const { category, difficulty, targetSkill } = getBaseValues(input);

  const assets = [
    ['matching-red-apple', 'Bright red apple'],
    ['matching-yellow-banana', 'Bright yellow banana'],
    ['matching-blue-car', 'Blue toy car'],
    ['matching-green-ball', 'Green ball'],
    ['matching-orange-cat', 'Friendly orange cat'],
    ['matching-purple-cup', 'Purple cup'],
  ];

  return assets.map(([key, description], index) =>
    makeAsset({
      keyBase: key,
      title: toTitleCase(description),
      description,
      category,
      targetSkill,
      difficulty,
      customization: input.customization,
      usage: 'matching_card',
      sortOrder: index + 1,
      tags: ['matching', 'visual discrimination', 'early learning'],
    })
  );
}

function planSorting(input: PlannerInput): WorksheetAssetPlanItem[] {
  const { category, difficulty, targetSkill } = getBaseValues(input);

  const assets = [
    ['sorting-dog', 'Friendly dog'],
    ['sorting-cat', 'Friendly cat'],
    ['sorting-fish', 'Friendly fish'],
    ['sorting-bird', 'Friendly bird'],
    ['sorting-apple', 'Apple snack'],
    ['sorting-cracker', 'Cracker snack'],
    ['sorting-shirt', 'Shirt clothing item'],
    ['sorting-shoes', 'Shoes clothing item'],
  ];

  return assets.map(([key, description], index) =>
    makeAsset({
      keyBase: key,
      title: toTitleCase(description),
      description,
      category,
      targetSkill,
      difficulty,
      customization: input.customization,
      usage: 'sorting_card',
      sortOrder: index + 1,
      tags: ['sorting', 'categories', 'early learning'],
    })
  );
}

function planSequencing(input: PlannerInput): WorksheetAssetPlanItem[] {
  const { category, difficulty, targetSkill } = getBaseValues(input);
  const search = `${input.interpretation.originalPrompt} ${input.customization || ''}`.toLowerCase();

  if (search.includes('sandwich')) {
    const steps = [
      ['sandwich-bread-on-plate', 'Bread placed on a plate'],
      ['sandwich-add-spread', 'Adding spread to bread'],
      ['sandwich-add-filling', 'Adding sandwich filling'],
      ['sandwich-top-bread', 'Putting top bread on sandwich'],
      ['sandwich-cut-half', 'Sandwich cut in half'],
      ['sandwich-ready', 'Finished sandwich ready to eat'],
    ];

    return steps.map(([key, description], index) =>
      makeAsset({
        keyBase: key,
        title: toTitleCase(description),
        description,
        category,
        targetSkill,
        difficulty,
        customization: input.customization,
        usage: 'step_card',
        sortOrder: index + 1,
        tags: ['sequencing', 'sandwich', 'daily living', 'steps'],
      })
    );
  }

  const genericSteps = [
    ['sequence-first-step', 'First step in a child-friendly daily routine'],
    ['sequence-next-step', 'Next step in a child-friendly daily routine'],
    ['sequence-then-step', 'Then step in a child-friendly daily routine'],
    ['sequence-last-step', 'Last step in a child-friendly daily routine'],
  ];

  return genericSteps.map(([key, description], index) =>
    makeAsset({
      keyBase: `${normalizeKey(targetSkill)}-${key}`,
      title: toTitleCase(description),
      description,
      category,
      targetSkill,
      difficulty,
      customization: input.customization,
      usage: 'step_card',
      sortOrder: index + 1,
      tags: ['sequencing', 'first next then last', 'routine'],
    })
  );
}

function planRequesting(input: PlannerInput): WorksheetAssetPlanItem[] {
  const { category, difficulty, targetSkill } = getBaseValues(input);

  const assets = [
    ['requesting-help', 'Child asking for help with a picture card'],
    ['requesting-more', 'Child requesting more during play'],
    ['requesting-open', 'Child asking adult to open container'],
    ['requesting-snack', 'Child requesting a snack choice'],
    ['requesting-choice-board', 'Child pointing to visual choice board'],
    ['requesting-adult-responds', 'Parent responding warmly to child request'],
  ];

  return assets.map(([key, description], index) =>
    makeAsset({
      keyBase: key,
      title: toTitleCase(description),
      description,
      category,
      targetSkill,
      difficulty,
      customization: input.customization,
      usage: 'choice_card',
      sortOrder: index + 1,
      tags: ['requesting', 'communication', 'choice board'],
    })
  );
}

function planFineMotor(input: PlannerInput): WorksheetAssetPlanItem[] {
  const { category, difficulty, targetSkill } = getBaseValues(input);

  const assets = [
    ['fine-motor-pencil', 'Large friendly pencil'],
    ['fine-motor-crayon', 'Colorful crayon'],
    ['fine-motor-scissors', 'Child-safe scissors'],
    ['fine-motor-glue-stick', 'Glue stick'],
  ];

  return assets.map(([key, description], index) =>
    makeAsset({
      keyBase: key,
      title: toTitleCase(description),
      description,
      category,
      targetSkill,
      difficulty,
      customization: input.customization,
      usage: 'main_visual',
      sortOrder: index + 1,
      tags: ['fine motor', 'tracing', 'pre writing'],
    })
  );
}

function planGeneric(input: PlannerInput): WorksheetAssetPlanItem[] {
  const { category, difficulty, targetSkill } = getBaseValues(input);

  const assets = [
    ['child-practicing-skill', `Child practicing ${targetSkill}`],
    ['parent-supporting-practice', `Parent supporting ${targetSkill} practice`],
    ['child-completing-worksheet', 'Child completing colorful worksheet activity'],
    ['child-celebrating-progress', 'Child smiling and celebrating progress'],
  ];

  return assets.map(([key, description], index) =>
    makeAsset({
      keyBase: `${normalizeKey(targetSkill)}-${key}`,
      title: toTitleCase(description),
      description,
      category,
      targetSkill,
      difficulty,
      customization: input.customization,
      usage: index === 0 ? 'main_visual' : 'choice_card',
      sortOrder: index + 1,
      tags: ['general practice', 'worksheet illustration'],
    })
  );
}

export function planWorksheetAssets(input: PlannerInput): WorksheetAssetPlan {
  const category = input.category || input.interpretation.category;
  const difficulty = input.difficulty || input.interpretation.recommendedDifficulty;
  const style = input.interpretation.worksheetStyle;
  const targetSkill = input.interpretation.targetSkill || 'Skill Practice';
  const title = input.interpretation.suggestedTitle || `${targetSkill} Worksheet`;

  const normalizedSearch = [
    input.interpretation.originalPrompt,
    input.interpretation.targetSkill,
    input.interpretation.suggestedTitle,
    input.customization,
    input.interpretation.skillKeywords.join(' '),
  ]
    .join(' ')
    .toLowerCase();

  let assets: WorksheetAssetPlanItem[] = [];

  if (normalizedSearch.includes('wash') || normalizedSearch.includes('handwashing')) {
    assets = planHandwashing(input);
  } else if (normalizedSearch.includes('tooth') || normalizedSearch.includes('brush teeth')) {
    assets = planToothBrushing(input);
  } else if (
    normalizedSearch.includes('potty') ||
    normalizedSearch.includes('toilet') ||
    normalizedSearch.includes('bathroom')
  ) {
    assets = planToileting(input);
  } else if (style === 'sequencing_story') {
    assets = planSequencing(input);
  } else if (style === 'matching_page') {
    assets = targetSkill.toLowerCase().includes('emotion')
      ? planEmotions(input)
      : planMatching(input);
  } else if (style === 'sorting_page') {
    assets = planSorting(input);
  } else if (style === 'choice_board' || style === 'first_then_board') {
    assets = planRequesting(input);
  } else if (style === 'trace_and_label' || style === 'cut_paste_activity') {
    assets = planFineMotor(input);
  } else {
    assets = planGeneric(input);
  }

  const suggestedExtraKeys = input.interpretation.suggestedAssetKeys || [];

  const merged = [
    ...assets,
    ...suggestedExtraKeys
      .filter((key) => !assets.some((asset) => asset.assetKey === normalizeKey(key)))
      .map((key, index) =>
        makeAsset({
          keyBase: key,
          title: toTitleCase(key),
          description: `Premium worksheet illustration for ${toTitleCase(key)}`,
          category,
          targetSkill,
          difficulty,
          customization: input.customization,
          usage: 'choice_card',
          sortOrder: assets.length + index + 1,
          tags: ['suggested asset'],
        })
      ),
  ];

  
  const sortedAssets = merged.sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    worksheetTitle: title,
    targetSkill,
    category,
    difficulty,
    worksheetStyle: style,
    illustrationStyle: 'premium_kid_friendly',
    requiredAssetKeys: unique(sortedAssets.map((asset) => asset.assetKey)),
    assets: sortedAssets,
  };
}

export function getWorksheetAssetPromptMap(plan: WorksheetAssetPlan) {
  return plan.assets.reduce<Record<string, string>>((acc, asset) => {
    acc[asset.assetKey] = asset.prompt;
    return acc;
  }, {});
}
