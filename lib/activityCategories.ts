export const ACTIVITY_CATEGORIES = [
  'home',
  'outdoor',
  'community',
  'movement',
  'sensory',
  'creative',
  'calm',
] as const;

export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

export const ACTIVITY_CATEGORY_LABELS: Record<ActivityCategory, string> = {
  home: 'At Home',
  outdoor: 'Outdoor',
  community: 'Community',
  movement: 'Movement',
  sensory: 'Sensory',
  creative: 'Creative',
  calm: 'Calm',
};

export function isActivityCategory(value: unknown): value is ActivityCategory {
  return (
    typeof value === 'string' &&
    ACTIVITY_CATEGORIES.includes(value as ActivityCategory)
  );
}

export function getActivityCategoryLabel(category: ActivityCategory): string {
  return ACTIVITY_CATEGORY_LABELS[category];
}

export function requireActivityCategory(value: unknown): ActivityCategory {
  if (!isActivityCategory(value)) {
    throw new Error(`Invalid activity category: ${String(value)}`);
  }

  return value;
}
