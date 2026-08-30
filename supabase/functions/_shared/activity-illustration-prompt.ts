export const ACTIVITY_ILLUSTRATION_PROMPT_VERSION =
  'daily-adventure-illustration-v1';

const CATEGORY_ACCENTS: Record<string, string> = {
  home: 'soft lavender and peach',
  outdoor: 'mint',
  community: 'soft blue',
  movement: 'soft coral',
  sensory: 'lavender',
  creative: 'pale yellow and peach',
  calm: 'pale blue and mint',
};

export type CanonicalActivityPromptInput = {
  title: string;
  category: string;
  location?: string | null;
  description?: string | null;
  try_this?: string[] | null;
  materials?: string[] | null;
  why_it_helps?: string | null;
};

function bounded(value: unknown, max: number) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function boundedList(value: unknown, count: number, max: number) {
  return Array.isArray(value)
    ? value.map((item) => bounded(item, max)).filter(Boolean).slice(0, count)
    : [];
}

export function buildActivityIllustrationPrompt(
  activity: CanonicalActivityPromptInput,
) {
  const category = bounded(activity.category, 40).toLowerCase();
  const accent = CATEGORY_ACCENTS[category] || 'soft lavender and peach';
  const tryThis = boundedList(activity.try_this, 2, 160);
  const materials = boundedList(activity.materials, 3, 80);
  const parts = [
    `Create exactly one square illustration for the Daily Adventure "${bounded(activity.title, 120)}".`,
    `Activity category: ${category || 'home'}. Location context: ${bounded(activity.location, 100) || 'a simple safe setting'}.`,
    `Activity idea: ${bounded(activity.description, 320)}.`,
    tryThis.length ? `Show the core idea suggested by: ${tryThis.join('; ')}.` : '',
    materials.length ? `Visually relevant objects: ${materials.join(', ')}.` : '',
    bounded(activity.why_it_helps, 180)
      ? `Optional scene intent: ${bounded(activity.why_it_helps, 180)}.`
      : '',
    `Use ${accent} as the category accent.`,
    'Premium soft 3D children\'s educational mini-scene; rounded friendly objects; one to three primary objects; centered subject; generous edge-safe area; subtle depth; soft lighting; calm, playful, child-friendly but not babyish; simple soft background; readable as a small mobile thumbnail.',
    'Depict the activity idea, not every instruction. Be object-focused. Show hands only when genuinely necessary. Avoid full people or children.',
    'Return one 1024 by 1024 WebP image only. No text, letters, logos, trademarks, watermark, UI, Bun Bun, identifiable child, clinical imagery, unsafe behavior, or busy environment.',
  ].filter(Boolean);
  return parts.join(' ');
}

export async function sha256Hex(value: string | Uint8Array) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
