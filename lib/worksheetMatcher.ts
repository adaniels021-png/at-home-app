// lib/worksheetMatcher.ts

import {
  DifficultyLevel,
  WorksheetCategory,
  WORKSHEETS,
} from './worksheetTemplates';

import {
  getWorksheetSkillSearchText,
  interpretWorksheetPrompt,
} from './worksheetSkillInterpreter';

export type WorksheetMatchInput = {
  prompt: string;
  category?: WorksheetCategory;
  difficulty?: DifficultyLevel;
  maxResults?: number;
};

export type WorksheetMatchResult = {
  worksheet: (typeof WORKSHEETS)[number];
  score: number;
  reasons: string[];
};

function normalize(value?: string | null) {
  return (value || '')
    .toLowerCase()
    .replace(/[_-]/g, ' ')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function words(value: string) {
  return unique(normalize(value).split(' ').filter((word) => word.length > 1));
}

function hasAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(normalize(term)));
}

function addScore(
  current: { score: number; reasons: string[] },
  amount: number,
  reason: string
) {
  current.score += amount;
  current.reasons.push(reason);
}

function getWorksheetText(worksheet: (typeof WORKSHEETS)[number]) {
  return normalize(
    [
      worksheet.id,
      worksheet.title,
      worksheet.category,
      worksheet.description,
      worksheet.ageRange,
    ].join(' ')
  );
}

function scoreSkillIntent(
  query: string,
  worksheetText: string,
  result: { score: number; reasons: string[] }
) {
  if (hasAny(query, ['washing hands', 'wash hands', 'hand washing', 'handwashing'])) {
    if (hasAny(worksheetText, ['washing hands', 'hand washing', 'wash hands'])) {
      addScore(result, 80, 'matched hand washing skill');
    }
  }

  if (hasAny(query, ['tooth brushing', 'brush teeth', 'brushing teeth', 'toothbrush'])) {
    if (hasAny(worksheetText, ['tooth brushing', 'brush teeth', 'toothbrush'])) {
      addScore(result, 80, 'matched tooth brushing skill');
    }
  }

  if (hasAny(query, ['potty', 'toilet', 'toileting', 'bathroom'])) {
    if (hasAny(worksheetText, ['potty', 'toilet', 'toileting', 'bathroom'])) {
      addScore(result, 80, 'matched toileting skill');
    }
  }

  if (hasAny(query, ['first then', 'first/then', 'first and then'])) {
    if (hasAny(worksheetText, ['first then', 'first/then'])) {
      addScore(result, 80, 'matched first/then support');
    }
  }

  if (hasAny(query, ['sandwich', 'make a sandwich', 'making a sandwich'])) {
    if (hasAny(worksheetText, ['sandwich', 'making a sandwich'])) {
      addScore(result, 80, 'matched sandwich sequencing');
    }
  }

  if (hasAny(query, ['morning routine', 'morning'])) {
    if (hasAny(worksheetText, ['morning routine', 'morning'])) {
      addScore(result, 70, 'matched morning routine');
    }
  }

  if (hasAny(query, ['bedtime routine', 'bedtime', 'sleep routine'])) {
    if (hasAny(worksheetText, ['bedtime routine', 'bedtime', 'sleep'])) {
      addScore(result, 70, 'matched bedtime routine');
    }
  }

  if (hasAny(query, ['emotion', 'feelings', 'happy', 'sad', 'angry', 'mad'])) {
    if (hasAny(worksheetText, ['emotion', 'feelings', 'happy', 'sad', 'angry'])) {
      addScore(result, 70, 'matched emotion skill');
    }
  }

  if (hasAny(query, ['matching', 'match'])) {
    if (hasAny(worksheetText, ['matching', 'match'])) {
      addScore(result, 50, 'matched matching worksheet type');
    }
  }

  if (hasAny(query, ['sorting', 'sort'])) {
    if (hasAny(worksheetText, ['sorting', 'sort'])) {
      addScore(result, 50, 'matched sorting worksheet type');
    }
  }

  if (hasAny(query, ['sequence', 'sequencing', 'steps', 'order'])) {
    if (hasAny(worksheetText, ['sequence', 'sequencing', 'steps', 'order', 'task analysis'])) {
      addScore(result, 45, 'matched sequencing/task analysis format');
    }
  }

  if (hasAny(query, ['trace', 'tracing', 'write', 'writing'])) {
    if (hasAny(worksheetText, ['trace', 'tracing', 'write', 'writing'])) {
      addScore(result, 45, 'matched tracing/writing format');
    }
  }

  if (hasAny(query, ['coloring', 'color', 'colour'])) {
    if (hasAny(worksheetText, ['coloring', 'color', 'colour'])) {
      addScore(result, 35, 'matched coloring format');
    }
  }
}

function scoreGeneralText(
  query: string,
  worksheetText: string,
  result: { score: number; reasons: string[] }
) {
  if (!query) return;

  if (worksheetText.includes(query)) {
    addScore(result, 35, 'matched full prompt text');
  }

  const queryWords = words(query);

  queryWords.forEach((word) => {
    if (worksheetText.includes(word)) {
      addScore(result, 6, `matched keyword: ${word}`);
    }
  });
}

function scoreCategory(
  inputCategory: WorksheetCategory | undefined,
  worksheet: (typeof WORKSHEETS)[number],
  result: { score: number; reasons: string[] }
) {
  if (!inputCategory) return;

  if (worksheet.category === inputCategory) {
    addScore(result, 20, 'matched selected category');
  } else {
    result.score -= 20;
    result.reasons.push('different category');
  }
}

function scoreDifficulty(
  difficulty: DifficultyLevel | undefined,
  worksheetText: string,
  result: { score: number; reasons: string[] }
) {
  if (!difficulty) return;

  if (difficulty === 'beginner') {
    if (hasAny(worksheetText, ['first', 'then', 'visual', 'routine', 'task analysis', 'matching'])) {
      addScore(result, 5, 'beginner-friendly format');
    }
  }

  if (difficulty === 'intermediate') {
    if (hasAny(worksheetText, ['sequence', 'sequencing', 'sorting', 'story'])) {
      addScore(result, 5, 'intermediate-friendly format');
    }
  }

  if (difficulty === 'advanced') {
    if (hasAny(worksheetText, ['writing', 'story', 'problem solving', 'why'])) {
      addScore(result, 5, 'advanced-friendly format');
    }
  }
}

export function rankWorksheetMatches(
  input: WorksheetMatchInput
): WorksheetMatchResult[] {
  const interpretation = interpretWorksheetPrompt(input.prompt, {
    category: input.category,
    difficulty: input.difficulty,
  });

  const query = normalize(
    `${input.prompt} ${getWorksheetSkillSearchText(interpretation)}`
  );

  const results = WORKSHEETS.map((worksheet) => {
    const worksheetText = getWorksheetText(worksheet);

    const result = {
      score: 0,
      reasons: [] as string[],
    };

    scoreCategory(input.category, worksheet, result);
    scoreDifficulty(input.difficulty, worksheetText, result);
    scoreSkillIntent(query, worksheetText, result);
    scoreGeneralText(query, worksheetText, result);

    return {
      worksheet,
      score: result.score,
      reasons: result.reasons,
    };
  });

  return results
    .filter((item) => item.score > -20)
    .sort((a, b) => b.score - a.score)
    .slice(0, input.maxResults || 5);
}

export function findBestWorksheetMatch(
  input: WorksheetMatchInput
): WorksheetMatchResult | null {
  const matches = rankWorksheetMatches({
    ...input,
    maxResults: 1,
  });

  return matches[0] || null;
}

export function findBestMatchingWorksheets(
  input: WorksheetMatchInput
) {
  const maxResults = input.maxResults || 1;

  const matches = rankWorksheetMatches({
    ...input,
    maxResults,
  });

  if (matches.length) {
    return matches.map((match) => match.worksheet);
  }

  const fallback = WORKSHEETS.filter((worksheet) =>
    input.category ? worksheet.category === input.category : true
  );

  return fallback.slice(0, maxResults);
}

export function getWorksheetMatchDebug(input: WorksheetMatchInput) {
  return rankWorksheetMatches({
    ...input,
    maxResults: input.maxResults || 5,
  }).map((match) => ({
    id: match.worksheet.id,
    title: match.worksheet.title,
    category: match.worksheet.category,
    score: match.score,
    reasons: match.reasons,
  }));
}