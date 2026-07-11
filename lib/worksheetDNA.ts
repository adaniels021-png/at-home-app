// lib/worksheetDNA.ts

import {
    DifficultyLevel,
    WorksheetCategory,
} from './worksheetTemplates';

/* -------------------------------------------------------------------------- */
/*                                   ENUMS                                    */
/* -------------------------------------------------------------------------- */

export type WorksheetSkillDomain =
  | 'Adaptive Skills'
  | 'Communication'
  | 'Receptive Language'
  | 'Expressive Language'
  | 'Social Skills'
  | 'Behavior Regulation'
  | 'Play Skills'
  | 'Fine Motor'
  | 'Gross Motor'
  | 'Executive Function'
  | 'School Readiness'
  | 'Academic'
  | 'Self Help'
  | 'Sensory'
  | 'Safety'
  | 'Toilet Training'
  | 'Daily Living'
  | 'Community'
  | 'Other';

export type WorksheetType =
  | 'Coloring'
  | 'Tracing'
  | 'Matching'
  | 'Sorting'
  | 'Sequencing'
  | 'Visual Schedule'
  | 'Cut and Paste'
  | 'Labeling'
  | 'Social Story'
  | 'Choice Board'
  | 'Token Board'
  | 'Fill in Blank'
  | 'Maze'
  | 'Parent Guide'
  | 'Visual Supports'
  | 'Prompt Cards'
  | 'Routine Practice';

export type AbaTeachingStrategy =
  | 'Task Analysis'
  | 'Discrete Trial Training'
  | 'Natural Environment Teaching'
  | 'Prompt Fading'
  | 'Visual Supports'
  | 'Forward Chaining'
  | 'Backward Chaining'
  | 'Modeling'
  | 'Errorless Teaching'
  | 'Reinforcement'
  | 'Functional Communication'
  | 'Generalization'
  | 'Incidental Teaching';

export type PromptLevel =
  | 'Independent'
  | 'Gestural'
  | 'Visual'
  | 'Verbal'
  | 'Model'
  | 'Partial Physical'
  | 'Full Physical';

export type ReinforcementSchedule =
  | 'Continuous'
  | 'Fixed Ratio'
  | 'Variable Ratio'
  | 'Natural Reinforcement';

export type DifficultyBand =
  | 'Level 1'
  | 'Level 2'
  | 'Level 3';

/* -------------------------------------------------------------------------- */
/*                                 MAIN MODEL                                 */
/* -------------------------------------------------------------------------- */

export interface WorksheetDNA {

  id: string;

  templateId: string;

  title: string;

  category: WorksheetCategory;

  skillDomain: WorksheetSkillDomain;

  targetSkill: string;

  worksheetType: WorksheetType;

  abaStrategy: AbaTeachingStrategy;

  difficulty: DifficultyLevel;

  difficultyBand: DifficultyBand;

  ageRange: string;

  childName: string | null;

  customization: string | null;

  objective: string;

  therapistGoal: string;

  parentInstructions: string;

  childInstructions: string;

  promptingHierarchy: PromptLevel[];

  reinforcementSchedule: ReinforcementSchedule;

  reinforcementIdeas: string[];

  generalizationIdeas: string[];

  masteryCriteria: string;

  materialsNeeded: string[];

  requiredAssetKeys: string[];

  optionalAssetKeys: string[];

  worksheetStyle: {

    titleColor: string;

    accentColor: string;

    borderRadius: number;

    roundedCards: boolean;

    includeMascot: boolean;

    includeStars: boolean;

    includeRewardBox: boolean;

    fontFamily: string;

  };

  imageRequirements: {

    largeImages: boolean;

    realisticIllustrations: boolean;

    autismFriendly: boolean;

    whiteBackground: boolean;

    printable: boolean;

    highContrast: boolean;

  };

  metadata: {

    createdAt: string;

    updatedAt: string;

    version: number;

  };

}

/* -------------------------------------------------------------------------- */
/*                              HELPER FUNCTIONS                              */
/* -------------------------------------------------------------------------- */

function normalize(text?: string | null) {

  return (text || '')
    .trim()
    .toLowerCase();

}

function titleCase(text: string) {

  return text
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());

}

function unique(values: string[]) {

  return Array.from(new Set(values));

}

function slug(text: string) {

  return normalize(text)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

}

/* -------------------------------------------------------------------------- */
/*                          DIFFICULTY CONVERSION                             */
/* -------------------------------------------------------------------------- */

function difficultyBand(
  difficulty: DifficultyLevel
): DifficultyBand {

  switch (difficulty) {

    case 'beginner':
      return 'Level 1';

    case 'intermediate':
      return 'Level 2';

    case 'advanced':
      return 'Level 3';

    default:
      return 'Level 1';

  }

}

/* -------------------------------------------------------------------------- */
/*                         DEFAULT WORKSHEET STYLING                          */
/* -------------------------------------------------------------------------- */

function defaultWorksheetStyle() {

  return {

    titleColor: '#6D28D9',

    accentColor: '#8B5CF6',

    borderRadius: 18,

    roundedCards: true,

    includeMascot: false,

    includeStars: true,

    includeRewardBox: true,

    fontFamily: 'Arial',

  };

}

/* -------------------------------------------------------------------------- */
/*                         IMAGE REQUIREMENTS DEFAULT                         */
/* -------------------------------------------------------------------------- */

function defaultImageRequirements() {

  return {

    largeImages: true,

    realisticIllustrations: true,

    autismFriendly: true,

    whiteBackground: true,

    printable: true,

    highContrast: true,

  };

}

/* -------------------------------------------------------------------------- */
/*                           DEFAULT PROMPT ORDER                             */
/* -------------------------------------------------------------------------- */

function defaultPromptHierarchy(
  difficulty: DifficultyLevel
): PromptLevel[] {

  switch (difficulty) {

    case 'beginner':

      return [

        'Full Physical',

        'Partial Physical',

        'Model',

        'Gestural',

        'Independent',

      ];

    case 'intermediate':

      return [

        'Model',

        'Visual',

        'Verbal',

        'Gestural',

        'Independent',

      ];

    case 'advanced':

      return [

        'Visual',

        'Verbal',

        'Independent',

      ];

  }

}

/* -------------------------------------------------------------------------- */
/*                             DEFAULT REINFORCEMENT                          */
/* -------------------------------------------------------------------------- */

function defaultReinforcementIdeas() {

  return [

    'Specific praise',

    'High five',

    'Sticker',

    'Favorite toy',

    'Preferred activity',

    'Short movement break',

    'Small edible reward if appropriate',

  ];

}

/* -------------------------------------------------------------------------- */
/*                           SKILL DOMAIN INFERENCE                           */
/* -------------------------------------------------------------------------- */

function inferSkillDomain(input: {
  title: string;
  category: WorksheetCategory;
  description?: string | null;
  customization?: string | null;
}): WorksheetSkillDomain {
  const text = normalize(
    `${input.title} ${input.category} ${input.description || ''} ${
      input.customization || ''
    }`
  );

  if (
    text.includes('wash') ||
    text.includes('tooth') ||
    text.includes('brush') ||
    text.includes('dress') ||
    text.includes('bedtime') ||
    text.includes('morning') ||
    text.includes('routine')
  ) {
    return 'Adaptive Skills';
  }

  if (text.includes('potty') || text.includes('toilet')) {
    return 'Toilet Training';
  }

  if (
    text.includes('request') ||
    text.includes('communication') ||
    text.includes('pecs') ||
    text.includes('label') ||
    text.includes('answer') ||
    text.includes('comment')
  ) {
    return 'Communication';
  }

  if (
    text.includes('direction') ||
    text.includes('identify') ||
    text.includes('receptive') ||
    text.includes('point to')
  ) {
    return 'Receptive Language';
  }

  if (
    text.includes('say') ||
    text.includes('name') ||
    text.includes('express') ||
    text.includes('verbal')
  ) {
    return 'Expressive Language';
  }

  if (
    text.includes('turn') ||
    text.includes('share') ||
    text.includes('friend') ||
    text.includes('greeting') ||
    text.includes('emotion') ||
    text.includes('feeling')
  ) {
    return 'Social Skills';
  }

  if (
    text.includes('calm') ||
    text.includes('behavior') ||
    text.includes('abc') ||
    text.includes('waiting') ||
    text.includes('coping')
  ) {
    return 'Behavior Regulation';
  }

  if (
    text.includes('trace') ||
    text.includes('cut') ||
    text.includes('paste') ||
    text.includes('write') ||
    text.includes('color')
  ) {
    return 'Fine Motor';
  }

  if (
    text.includes('jump') ||
    text.includes('movement') ||
    text.includes('gross motor') ||
    text.includes('balance')
  ) {
    return 'Gross Motor';
  }

  if (
    text.includes('school') ||
    text.includes('letter') ||
    text.includes('number') ||
    text.includes('count') ||
    text.includes('shape')
  ) {
    return 'School Readiness';
  }

  return 'Other';
}

/* -------------------------------------------------------------------------- */
/*                            TARGET SKILL INFERENCE                          */
/* -------------------------------------------------------------------------- */

function inferTargetSkill(input: {
  title: string;
  description?: string | null;
  customization?: string | null;
}) {
  const text = normalize(
    `${input.title} ${input.description || ''} ${input.customization || ''}`
  );

  if (text.includes('hand') || text.includes('wash')) return 'Hand Washing';
  if (text.includes('tooth') || text.includes('brush')) return 'Tooth Brushing';
  if (text.includes('potty') || text.includes('toilet')) return 'Toileting';
  if (text.includes('bedtime')) return 'Bedtime Routine';
  if (text.includes('morning')) return 'Morning Routine';
  if (text.includes('request')) return 'Requesting';
  if (text.includes('match')) return 'Matching';
  if (text.includes('sort')) return 'Sorting';
  if (text.includes('emotion') || text.includes('feeling')) return 'Emotion Identification';
  if (text.includes('direction')) return 'Following Directions';
  if (text.includes('trace')) return 'Tracing';
  if (text.includes('color')) return 'Color Identification';
  if (text.includes('shape')) return 'Shape Identification';
  if (text.includes('number') || text.includes('count')) return 'Counting';
  if (text.includes('turn')) return 'Turn Taking';
  if (text.includes('wait')) return 'Waiting';
  if (text.includes('calm')) return 'Calming Strategy';

  return input.title;
}

/* -------------------------------------------------------------------------- */
/*                           ABA STRATEGY INFERENCE                           */
/* -------------------------------------------------------------------------- */

function inferAbaStrategy(input: {
  title: string;
  description?: string | null;
  customization?: string | null;
}): AbaTeachingStrategy {
  const text = normalize(
    `${input.title} ${input.description || ''} ${input.customization || ''}`
  );

  if (
    text.includes('routine') ||
    text.includes('sequence') ||
    text.includes('step') ||
    text.includes('wash') ||
    text.includes('tooth') ||
    text.includes('potty') ||
    text.includes('bedtime') ||
    text.includes('morning')
  ) {
    return 'Task Analysis';
  }

  if (text.includes('first') || text.includes('then')) return 'Visual Supports';
  if (text.includes('match')) return 'Discrete Trial Training';
  if (text.includes('request') || text.includes('communication')) return 'Functional Communication';
  if (text.includes('story')) return 'Visual Supports';
  if (text.includes('calm') || text.includes('behavior')) return 'Visual Supports';
  if (text.includes('trace') || text.includes('copy')) return 'Modeling';

  return 'Prompt Fading';
}

/* -------------------------------------------------------------------------- */
/*                         WORKSHEET TYPE INFERENCE                           */
/* -------------------------------------------------------------------------- */

function inferWorksheetType(input: {
  title: string;
  description?: string | null;
  customization?: string | null;
}): WorksheetType {
  const text = normalize(
    `${input.title} ${input.description || ''} ${input.customization || ''}`
  );

  if (text.includes('first') || text.includes('then')) return 'Visual Supports';
  if (text.includes('visual schedule')) return 'Visual Schedule';
  if (text.includes('sequence') || text.includes('step') || text.includes('routine')) {
    return 'Sequencing';
  }
  if (text.includes('match')) return 'Matching';
  if (text.includes('sort')) return 'Sorting';
  if (text.includes('trace')) return 'Tracing';
  if (text.includes('cut') || text.includes('paste')) return 'Cut and Paste';
  if (text.includes('color')) return 'Coloring';
  if (text.includes('story')) return 'Social Story';
  if (text.includes('token')) return 'Token Board';
  if (text.includes('choice')) return 'Choice Board';
  if (text.includes('maze')) return 'Maze';

  return 'Sequencing';
}

/* -------------------------------------------------------------------------- */
/*                              OBJECTIVES                                    */
/* -------------------------------------------------------------------------- */

function buildObjective(targetSkill: string, abaStrategy: AbaTeachingStrategy) {
  return `The child will practice ${targetSkill.toLowerCase()} using ${abaStrategy.toLowerCase()} with clear visuals, caregiver support, and positive reinforcement.`;
}

function buildTherapistGoal(targetSkill: string, difficulty: DifficultyLevel) {
  if (difficulty === 'beginner') {
    return `Increase participation and familiarity with ${targetSkill.toLowerCase()} using high support and visual prompts.`;
  }

  if (difficulty === 'intermediate') {
    return `Build accuracy and reduce prompt dependence while practicing ${targetSkill.toLowerCase()}.`;
  }

  return `Promote independence, generalization, and fluency with ${targetSkill.toLowerCase()}.`;
}

/* -------------------------------------------------------------------------- */
/*                              INSTRUCTIONS                                  */
/* -------------------------------------------------------------------------- */

function buildParentInstructions(targetSkill: string, abaStrategy: AbaTeachingStrategy) {
  return `Use this worksheet during a short 5–10 minute practice session. Present one direction at a time, wait briefly before prompting, help only as needed, and reinforce effort. This activity supports ${targetSkill.toLowerCase()} using ${abaStrategy.toLowerCase()}.`;
}

function buildChildInstructions(worksheetType: WorksheetType, targetSkill: string) {
  if (worksheetType === 'Coloring') {
    return `Color the pictures and talk about ${targetSkill.toLowerCase()}.`;
  }

  if (worksheetType === 'Matching') {
    return 'Draw a line to match each picture.';
  }

  if (worksheetType === 'Sequencing') {
    return 'Put the pictures in the correct order.';
  }

  if (worksheetType === 'Cut and Paste') {
    return 'Cut out the pictures and glue them in the correct place.';
  }

  if (worksheetType === 'Tracing') {
    return 'Trace the words and point to each picture.';
  }

  if (worksheetType === 'Sorting') {
    return 'Sort each picture into the correct group.';
  }

  if (worksheetType === 'Visual Schedule') {
    return 'Look at each picture and practice the routine.';
  }

  return 'Complete the activity with help if needed.';
}

/* -------------------------------------------------------------------------- */
/*                           REINFORCEMENT LOGIC                              */
/* -------------------------------------------------------------------------- */

function inferReinforcementSchedule(difficulty: DifficultyLevel): ReinforcementSchedule {
  if (difficulty === 'beginner') return 'Continuous';
  if (difficulty === 'intermediate') return 'Fixed Ratio';
  return 'Natural Reinforcement';
}

function buildReinforcementIdeas(targetSkill: string, difficulty: DifficultyLevel) {
  const base = [
    `Use specific praise such as “Great job practicing ${targetSkill.toLowerCase()}!”`,
    'Praise effort and participation, not only correct answers.',
  ];

  if (difficulty === 'beginner') {
    return [
      ...base,
      'Reinforce after each response or attempt.',
      'Use a favorite toy, sticker, or short preferred activity after completion.',
    ];
  }

  if (difficulty === 'intermediate') {
    return [
      ...base,
      'Reinforce after several correct responses.',
      'Use brief praise and a preferred activity at the end.',
    ];
  }

  return [
    ...base,
    'Shift toward natural reinforcement, such as completing the real-life routine.',
    'Encourage independence and celebrate self-correction.',
  ];
}

/* -------------------------------------------------------------------------- */
/*                          GENERALIZATION LOGIC                              */
/* -------------------------------------------------------------------------- */

function buildGeneralizationIdeas(targetSkill: string) {
  return [
    `Practice ${targetSkill.toLowerCase()} during the real home routine.`,
    'Practice with a different caregiver when possible.',
    'Practice in more than one room or setting.',
    'Use the same visuals during daily routines to support carryover.',
  ];
}

/* -------------------------------------------------------------------------- */
/*                            MASTERY CRITERIA                                */
/* -------------------------------------------------------------------------- */

function buildMasteryCriteria(targetSkill: string, difficulty: DifficultyLevel) {
  if (difficulty === 'beginner') {
    return `Child participates in ${targetSkill.toLowerCase()} with support across 3 practice opportunities.`;
  }

  if (difficulty === 'intermediate') {
    return `Child completes most parts of ${targetSkill.toLowerCase()} with no more than 1–2 prompts across 3 opportunities.`;
  }

  return `Child completes ${targetSkill.toLowerCase()} independently across 3 different opportunities or settings.`;
}

/* -------------------------------------------------------------------------- */
/*                            MATERIALS NEEDED                                */
/* -------------------------------------------------------------------------- */

function buildMaterialsNeeded(worksheetType: WorksheetType) {
  const materials = ['Printed worksheet', 'Crayons or markers'];

  if (worksheetType === 'Cut and Paste') {
    materials.push('Child-safe scissors', 'Glue stick');
  }

  if (worksheetType === 'Token Board') {
    materials.push('Small tokens or stickers');
  }

  if (worksheetType === 'Tracing') {
    materials.push('Pencil or dry erase marker');
  }

  return materials;
}

/* -------------------------------------------------------------------------- */
/*                              BUILD WORKSHEET DNA                           */
/* -------------------------------------------------------------------------- */

export interface BuildWorksheetDNAInput {
  templateId: string;
  title: string;
  category: WorksheetCategory;
  difficulty: DifficultyLevel;

  ageRange?: string | null;
  childName?: string | null;
  description?: string | null;
  customization?: string | null;

  requiredAssetKeys?: string[];
}

export function buildWorksheetDNA(
  input: BuildWorksheetDNAInput
): WorksheetDNA {

  const skillDomain = inferSkillDomain(input);

  const targetSkill = inferTargetSkill(input);

  const abaStrategy = inferAbaStrategy(input);

  const worksheetType = inferWorksheetType(input);

  const requiredAssetKeys = unique(input.requiredAssetKeys || []);

  const optionalAssetKeys: string[] = [];

  const customization = normalize(input.customization);

  if (customization) {
    optionalAssetKeys.push(customization.replace(/\s+/g, '-'));
  }

  switch (targetSkill) {

    case 'Hand Washing':

      optionalAssetKeys.push(
        'soap',
        'sink',
        'water',
        'towel',
        'clean-hands'
      );

      break;

    case 'Tooth Brushing':

      optionalAssetKeys.push(
        'toothbrush',
        'toothpaste',
        'sink',
        'mirror'
      );

      break;

    case 'Toileting':

      optionalAssetKeys.push(
        'toilet',
        'bathroom',
        'toilet-paper',
        'sink'
      );

      break;

    case 'Bedtime Routine':

      optionalAssetKeys.push(
        'bed',
        'book',
        'pajamas',
        'moon'
      );

      break;

    case 'Morning Routine':

      optionalAssetKeys.push(
        'sun',
        'backpack',
        'toothbrush',
        'shirt'
      );

      break;

  }

  const created = new Date().toISOString();

  return {

    id: `${slug(input.templateId)}-${Date.now()}`,

    templateId: input.templateId,

    title: input.title,

    category: input.category,

    skillDomain,

    targetSkill,

    worksheetType,

    abaStrategy,

    difficulty: input.difficulty,

    difficultyBand: difficultyBand(input.difficulty),

    ageRange: input.ageRange || 'Ages 3–8',

    childName: input.childName || null,

    customization: input.customization || null,

    objective: buildObjective(
      targetSkill,
      abaStrategy
    ),

    therapistGoal: buildTherapistGoal(
      targetSkill,
      input.difficulty
    ),

    parentInstructions: buildParentInstructions(
      targetSkill,
      abaStrategy
    ),

    childInstructions: buildChildInstructions(
      worksheetType,
      targetSkill
    ),

    promptingHierarchy: defaultPromptHierarchy(
      input.difficulty
    ),

    reinforcementSchedule:
      inferReinforcementSchedule(
        input.difficulty
      ),

    reinforcementIdeas:
      buildReinforcementIdeas(
        targetSkill,
        input.difficulty
      ),

    generalizationIdeas:
      buildGeneralizationIdeas(
        targetSkill
      ),

    masteryCriteria:
      buildMasteryCriteria(
        targetSkill,
        input.difficulty
      ),

    materialsNeeded:
      buildMaterialsNeeded(
        worksheetType
      ),

    requiredAssetKeys,

    optionalAssetKeys: unique(optionalAssetKeys),

    worksheetStyle:
      defaultWorksheetStyle(),

    imageRequirements:
      defaultImageRequirements(),

    metadata: {

      createdAt: created,

      updatedAt: created,

      version: 1,

    },

  };

}
