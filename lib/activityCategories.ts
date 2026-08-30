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

export const ACTIVITY_CATEGORY_PRESENTATION: Record<
  ActivityCategory,
  {
    background: string;
    border: string;
    accent: string;
    icon:
      | 'home-outline'
      | 'leaf-outline'
      | 'business-outline'
      | 'walk-outline'
      | 'hand-left-outline'
      | 'color-palette-outline'
      | 'cloud-outline';
  }
> = {
  home: { background: '#F5F0FF', border: '#DED2FF', accent: '#7C3AED', icon: 'home-outline' },
  outdoor: { background: '#ECFDF3', border: '#C7EBD3', accent: '#3F8F58', icon: 'leaf-outline' },
  community: { background: '#EEF6FF', border: '#CFE1FA', accent: '#4F7ED8', icon: 'business-outline' },
  movement: { background: '#FFF1EE', border: '#F6D2CB', accent: '#E66555', icon: 'walk-outline' },
  sensory: { background: '#F6F1FF', border: '#DED5F7', accent: '#8256D0', icon: 'hand-left-outline' },
  creative: { background: '#FFF8E8', border: '#F2DFC0', accent: '#D78B13', icon: 'color-palette-outline' },
  calm: { background: '#EDF9F8', border: '#CBE7E4', accent: '#3A8F8A', icon: 'cloud-outline' },
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
