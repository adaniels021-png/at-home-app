export const SKILL_CATEGORIES = ['Communication', 'Social', 'Self-Care', 'Academics'] as const;

export interface ABASkill {
  id: string;
  label: string;
  category: typeof SKILL_CATEGORIES[number];
  targets: string[];
}

export const SKILL_LIBRARY: ABASkill[] = [
  { id: 'eye_contact', label: 'Eye Contact', category: 'Social', targets: ['Brief glance', '3-second hold'] },
  { id: 'mand_request', label: 'Mand (Requesting)', category: 'Communication', targets: ['Point', 'One Word'] },
  { id: 'spoon_use', label: 'Self-Feeding', category: 'Self-Care', targets: ['Scoop', 'Mouth'] },
  { id: 'counting', label: 'Counting', category: 'Academics', targets: ['1-5', '1-10'] }
];
