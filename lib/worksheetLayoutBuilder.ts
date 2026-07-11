// lib/worksheetLayoutBuilder.ts

import { AiAssetItem } from './aiAssetLibrary';
import { DifficultyLevel, WorksheetCategory } from './worksheetTemplates';

export type WorksheetLayoutType =
  | 'visual-routine-steps'
  | 'matching-grid'
  | 'trace-and-label'
  | 'sorting-grid'
  | 'behavior-log'
  | 'blank-practice';

export type WorksheetImageBlock = {
  id: string;
  assetKey: string;
  imageUrl: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type WorksheetTextBlock = {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
  fontWeight?: 'regular' | 'bold' | 'heavy';
  align?: 'left' | 'center' | 'right';
};

export type WorksheetLineBlock = {
  id: string;
  x: number;
  y: number;
  width: number;
};

export type WorksheetLayout = {
  templateId: string;
  title: string;
  category: WorksheetCategory;
  difficulty: DifficultyLevel;
  layoutType: WorksheetLayoutType;
  page: {
    width: number;
    height: number;
    backgroundColor: string;
    margin: number;
  };
  theme: {
    primaryColor: string;
    accentColor: string;
    softColor: string;
    textColor: string;
  };
  instructions: string;
  childName: string;
  practiceNote: string | null;
  imageBlocks: WorksheetImageBlock[];
  textBlocks: WorksheetTextBlock[];
  lineBlocks: WorksheetLineBlock[];
  missingAssetKeys: string[];
  footerText: string;
};

export type BuildWorksheetLayoutInput = {
  templateId: string;
  title: string;
  category: WorksheetCategory;
  difficulty: DifficultyLevel;
  childName?: string;
  description?: string | null;
  practiceNote?: string | null;
  requiredAssetKeys?: string[];
  resolvedAssets?: AiAssetItem[];
};

const PAGE_WIDTH = 850;
const PAGE_HEIGHT = 1100;
const PAGE_MARGIN = 60;

function normalizeKey(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function titleCase(value: string) {
  return String(value || '')
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getTheme(category: WorksheetCategory) {
  if (category === 'Visual Routines') {
    return {
      primaryColor: '#7C3AED',
      accentColor: '#A78BFA',
      softColor: '#F5F3FF',
      textColor: '#2E1065',
    };
  }

  if (category === 'Communication & Social Skills') {
    return {
      primaryColor: '#2563EB',
      accentColor: '#93C5FD',
      softColor: '#EFF6FF',
      textColor: '#1E3A8A',
    };
  }

  if (category === 'Behavior & Regulation') {
    return {
      primaryColor: '#DC2626',
      accentColor: '#FCA5A5',
      softColor: '#FEF2F2',
      textColor: '#7F1D1D',
    };
  }

  return {
    primaryColor: '#059669',
    accentColor: '#86EFAC',
    softColor: '#F0FDF4',
    textColor: '#064E3B',
  };
}

function chooseLayoutType(input: BuildWorksheetLayoutInput): WorksheetLayoutType {
  const text = `${input.templateId} ${input.title} ${input.description || ''} ${
    input.practiceNote || ''
  }`.toLowerCase();

  if (text.includes('behavior') || text.includes('abc')) {
    return 'behavior-log';
  }

  if (text.includes('match') || text.includes('matching')) {
    return 'matching-grid';
  }

  if (text.includes('sort') || text.includes('sorting')) {
    return 'sorting-grid';
  }

  if (text.includes('trace') || text.includes('label') || text.includes('name')) {
    return 'trace-and-label';
  }

  if (
    text.includes('first') ||
    text.includes('then') ||
    text.includes('routine') ||
    text.includes('step') ||
    text.includes('sequence') ||
    text.includes('bedtime') ||
    text.includes('morning') ||
    text.includes('wash') ||
    text.includes('tooth') ||
    text.includes('potty') ||
    text.includes('toilet')
  ) {
    return 'visual-routine-steps';
  }

  return 'blank-practice';
}

function getInstructions(
  layoutType: WorksheetLayoutType,
  difficulty: DifficultyLevel,
  customization?: string | null
) {
  const customText = customization?.toLowerCase() || '';

  if (customText.includes('bedtime')) {
    return 'Put the bedtime routine steps in order. Practice each step with support.';
  }

  if (customText.includes('morning')) {
    return 'Put the morning routine steps in order. Practice each step before starting the day.';
  }

  if (customText.includes('tooth')) {
    return 'Look at each picture. Practice the steps for brushing teeth.';
  }

  if (customText.includes('wash') || customText.includes('hand')) {
    return 'Look at each picture. Practice the steps for washing hands.';
  }

  if (customText.includes('potty') || customText.includes('toilet')) {
    return 'Look at each picture. Practice the potty routine one step at a time.';
  }

  if (layoutType === 'visual-routine-steps') {
    return difficulty === 'beginner'
      ? 'Look at each picture. Practice saying or pointing to each step.'
      : 'Put the steps in order, then practice the routine with support.';
  }

  if (layoutType === 'matching-grid') {
    return 'Draw a line to match each picture with the correct word or prompt.';
  }

  if (layoutType === 'trace-and-label') {
    return 'Trace the words, then point to or label each picture.';
  }

  if (layoutType === 'sorting-grid') {
    return 'Cut, sort, or point to each picture in the correct group.';
  }

  if (layoutType === 'behavior-log') {
    return 'Use this page to track what happened before, during, and after the behavior.';
  }

  return 'Practice the skill using the pictures and writing spaces below.';
}

function mapAssetsByKey(assets: AiAssetItem[]) {
  return new Map(assets.map((asset) => [normalizeKey(asset.asset_key), asset]));
}

function getOrderedAssets(input: BuildWorksheetLayoutInput) {
  const assets = input.resolvedAssets || [];
  const requiredKeys = input.requiredAssetKeys || [];

  if (!requiredKeys.length) return assets;

  const assetMap = mapAssetsByKey(assets);

  return requiredKeys
    .map((key) => assetMap.get(normalizeKey(key)))
    .filter(Boolean) as AiAssetItem[];
}

function buildHeaderText(input: BuildWorksheetLayoutInput): WorksheetTextBlock[] {
  return [
    {
      id: 'title',
      text: input.title,
      x: PAGE_MARGIN,
      y: 48,
      width: PAGE_WIDTH - PAGE_MARGIN * 2,
      fontSize: input.title.length > 34 ? 29 : 34,
      fontWeight: 'heavy',
      align: 'center',
    },
    {
      id: 'child-name',
      text: `Name: ${input.childName || ''}`,
      x: PAGE_MARGIN,
      y: 120,
      width: 330,
      fontSize: 18,
      fontWeight: 'bold',
    },
    {
      id: 'date',
      text: 'Date: ____________',
      x: PAGE_WIDTH - PAGE_MARGIN - 260,
      y: 120,
      width: 260,
      fontSize: 18,
      fontWeight: 'bold',
      align: 'right',
    },
  ];
}

function buildInstructionBlock(instructions: string): WorksheetTextBlock {
  return {
    id: 'instructions',
    text: instructions,
    x: PAGE_MARGIN,
    y: 160,
    width: PAGE_WIDTH - PAGE_MARGIN * 2,
    fontSize: 18,
    fontWeight: 'bold',
    align: 'center',
  };
}

function buildVisualRoutineLayout(
  input: BuildWorksheetLayoutInput,
  assets: AiAssetItem[]
) {
  const orderedAssets = getOrderedAssets({ ...input, resolvedAssets: assets });
  const assetMap = mapAssetsByKey(orderedAssets);
  const requiredKeys = input.requiredAssetKeys || [];
  const keys = requiredKeys.length
    ? requiredKeys
    : orderedAssets.map((asset) => asset.asset_key);

  const imageBlocks: WorksheetImageBlock[] = [];
  const textBlocks: WorksheetTextBlock[] = [];
  const lineBlocks: WorksheetLineBlock[] = [];

  const count = Math.max(4, Math.min(6, keys.length || 6));
  const startY = 230;
  const cardWidth = 220;
  const cardHeight = count <= 4 ? 190 : 170;
  const gapX = 35;
  const gapY = count <= 4 ? 52 : 42;

  keys.slice(0, count).forEach((key, index) => {
    const asset = assetMap.get(normalizeKey(key));
    const col = count === 4 ? index % 2 : index % 3;
    const row = count === 4 ? Math.floor(index / 2) : Math.floor(index / 3);
    const columns = count === 4 ? 2 : 3;
    const totalWidth = columns * cardWidth + (columns - 1) * gapX;
    const startX = (PAGE_WIDTH - totalWidth) / 2;
    const x = startX + col * (cardWidth + gapX);
    const y = startY + row * (cardHeight + gapY);

    if (asset?.image_url) {
      imageBlocks.push({
        id: `image-${normalizeKey(key)}`,
        assetKey: key,
        imageUrl: asset.image_url,
        label: asset.title || titleCase(key),
        x,
        y,
        width: cardWidth,
        height: count <= 4 ? 140 : 125,
      });
    }

    textBlocks.push({
      id: `step-label-${normalizeKey(key)}`,
      text: `${index + 1}. ${asset?.title || titleCase(key)}`,
      x,
      y: y + (count <= 4 ? 148 : 132),
      width: cardWidth,
      fontSize: 14,
      fontWeight: 'bold',
      align: 'center',
    });
  });

  return { imageBlocks, textBlocks, lineBlocks };
}

function buildMatchingLayout(input: BuildWorksheetLayoutInput, assets: AiAssetItem[]) {
  const orderedAssets = getOrderedAssets({ ...input, resolvedAssets: assets });
  const imageBlocks: WorksheetImageBlock[] = [];
  const textBlocks: WorksheetTextBlock[] = [];
  const lineBlocks: WorksheetLineBlock[] = [];

  const startY = 235;
  const itemHeight = 105;

  orderedAssets.slice(0, 5).forEach((asset, index) => {
    const y = startY + index * itemHeight;

    imageBlocks.push({
      id: `match-image-${asset.asset_key}`,
      assetKey: asset.asset_key,
      imageUrl: asset.image_url,
      label: asset.title,
      x: PAGE_MARGIN,
      y,
      width: 120,
      height: 90,
    });

    textBlocks.push({
      id: `match-word-${asset.asset_key}`,
      text: asset.title || titleCase(asset.asset_key),
      x: PAGE_WIDTH - PAGE_MARGIN - 220,
      y: y + 28,
      width: 220,
      fontSize: 18,
      fontWeight: 'bold',
      align: 'center',
    });

    lineBlocks.push({
      id: `match-line-${asset.asset_key}`,
      x: 220,
      y: y + 50,
      width: 330,
    });
  });

  return { imageBlocks, textBlocks, lineBlocks };
}

function buildTraceAndLabelLayout(input: BuildWorksheetLayoutInput, assets: AiAssetItem[]) {
  const orderedAssets = getOrderedAssets({ ...input, resolvedAssets: assets });
  const imageBlocks: WorksheetImageBlock[] = [];
  const textBlocks: WorksheetTextBlock[] = [];
  const lineBlocks: WorksheetLineBlock[] = [];

  const startY = 245;
  const imageSize = 115;

  orderedAssets.slice(0, 4).forEach((asset, index) => {
    const y = startY + index * 145;

    imageBlocks.push({
      id: `trace-image-${asset.asset_key}`,
      assetKey: asset.asset_key,
      imageUrl: asset.image_url,
      label: asset.title,
      x: PAGE_MARGIN,
      y,
      width: imageSize,
      height: imageSize,
    });

    textBlocks.push({
      id: `trace-word-${asset.asset_key}`,
      text: asset.title || titleCase(asset.asset_key),
      x: 210,
      y: y + 8,
      width: 520,
      fontSize: 28,
      fontWeight: 'bold',
    });

    lineBlocks.push({
      id: `trace-line-1-${asset.asset_key}`,
      x: 210,
      y: y + 65,
      width: 520,
    });

    lineBlocks.push({
      id: `trace-line-2-${asset.asset_key}`,
      x: 210,
      y: y + 105,
      width: 520,
    });
  });

  return { imageBlocks, textBlocks, lineBlocks };
}

function buildSortingLayout(input: BuildWorksheetLayoutInput, assets: AiAssetItem[]) {
  const orderedAssets = getOrderedAssets({ ...input, resolvedAssets: assets });
  const imageBlocks: WorksheetImageBlock[] = [];
  const textBlocks: WorksheetTextBlock[] = [];
  const lineBlocks: WorksheetLineBlock[] = [];

  textBlocks.push(
    {
      id: 'sort-left-label',
      text: 'Group 1',
      x: PAGE_MARGIN,
      y: 235,
      width: 330,
      fontSize: 22,
      fontWeight: 'heavy',
      align: 'center',
    },
    {
      id: 'sort-right-label',
      text: 'Group 2',
      x: PAGE_WIDTH - PAGE_MARGIN - 330,
      y: 235,
      width: 330,
      fontSize: 22,
      fontWeight: 'heavy',
      align: 'center',
    }
  );

  orderedAssets.slice(0, 8).forEach((asset, index) => {
    const col = index % 4;
    const row = Math.floor(index / 4);

    imageBlocks.push({
      id: `sort-image-${asset.asset_key}`,
      assetKey: asset.asset_key,
      imageUrl: asset.image_url,
      label: asset.title,
      x: PAGE_MARGIN + col * 175,
      y: 330 + row * 170,
      width: 135,
      height: 120,
    });
  });

  return { imageBlocks, textBlocks, lineBlocks };
}

function buildBehaviorLogLayout() {
  const imageBlocks: WorksheetImageBlock[] = [];
  const textBlocks: WorksheetTextBlock[] = [];
  const lineBlocks: WorksheetLineBlock[] = [];

  const columns = ['Antecedent', 'Behavior', 'Consequence'];
  const startX = PAGE_MARGIN;
  const startY = 250;
  const colWidth = (PAGE_WIDTH - PAGE_MARGIN * 2) / 3;

  columns.forEach((column, index) => {
    textBlocks.push({
      id: `abc-header-${column}`,
      text: column,
      x: startX + index * colWidth,
      y: startY,
      width: colWidth,
      fontSize: 18,
      fontWeight: 'heavy',
      align: 'center',
    });

    for (let row = 0; row < 7; row += 1) {
      lineBlocks.push({
        id: `abc-line-${index}-${row}`,
        x: startX + index * colWidth + 12,
        y: startY + 70 + row * 60,
        width: colWidth - 24,
      });
    }
  });

  return { imageBlocks, textBlocks, lineBlocks };
}

function buildBlankPracticeLayout(input: BuildWorksheetLayoutInput, assets: AiAssetItem[]) {
  const orderedAssets = getOrderedAssets({ ...input, resolvedAssets: assets });
  const imageBlocks: WorksheetImageBlock[] = [];
  const textBlocks: WorksheetTextBlock[] = [];
  const lineBlocks: WorksheetLineBlock[] = [];

  orderedAssets.slice(0, 3).forEach((asset, index) => {
    imageBlocks.push({
      id: `practice-image-${asset.asset_key}`,
      assetKey: asset.asset_key,
      imageUrl: asset.image_url,
      label: asset.title,
      x: PAGE_MARGIN + index * 245,
      y: 260,
      width: 190,
      height: 150,
    });
  });

  for (let i = 0; i < 7; i += 1) {
    lineBlocks.push({
      id: `practice-line-${i}`,
      x: PAGE_MARGIN,
      y: 500 + i * 58,
      width: PAGE_WIDTH - PAGE_MARGIN * 2,
    });
  }

  return { imageBlocks, textBlocks, lineBlocks };
}

export function buildWorksheetLayout(input: BuildWorksheetLayoutInput): WorksheetLayout {
  const layoutType = chooseLayoutType(input);
  const theme = getTheme(input.category);
  const instructions = getInstructions(
    layoutType,
    input.difficulty,
    input.practiceNote || input.description
  );

  const assets = input.resolvedAssets || [];
  const requiredKeys = input.requiredAssetKeys || [];
  const foundKeys = new Set(assets.map((asset) => normalizeKey(asset.asset_key)));
  const missingAssetKeys = requiredKeys.filter(
    (key) => !foundKeys.has(normalizeKey(key))
  );

  let body: {
    imageBlocks: WorksheetImageBlock[];
    textBlocks: WorksheetTextBlock[];
    lineBlocks: WorksheetLineBlock[];
  };

  if (layoutType === 'visual-routine-steps') {
    body = buildVisualRoutineLayout(input, assets);
  } else if (layoutType === 'matching-grid') {
    body = buildMatchingLayout(input, assets);
  } else if (layoutType === 'trace-and-label') {
    body = buildTraceAndLabelLayout(input, assets);
  } else if (layoutType === 'sorting-grid') {
    body = buildSortingLayout(input, assets);
  } else if (layoutType === 'behavior-log') {
    body = buildBehaviorLogLayout();
  } else {
    body = buildBlankPracticeLayout(input, assets);
  }

  const textBlocks = [
    ...buildHeaderText(input),
    buildInstructionBlock(instructions),
    ...body.textBlocks,
  ];

  textBlocks.push({
    id: 'footer',
    text: 'ABA at Home',
    x: PAGE_MARGIN,
    y: PAGE_HEIGHT - 65,
    width: PAGE_WIDTH - PAGE_MARGIN * 2,
    fontSize: 15,
    fontWeight: 'heavy',
    align: 'center',
  });

  return {
    templateId: input.templateId,
    title: input.title,
    category: input.category,
    difficulty: input.difficulty,
    layoutType,
    page: {
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      backgroundColor: '#FFFFFF',
      margin: PAGE_MARGIN,
    },
    theme,
    instructions,
    childName: input.childName || '',
    practiceNote: input.practiceNote || null,
    imageBlocks: body.imageBlocks,
    textBlocks,
    lineBlocks: body.lineBlocks,
    missingAssetKeys,
    footerText: 'ABA at Home',
  };
}
