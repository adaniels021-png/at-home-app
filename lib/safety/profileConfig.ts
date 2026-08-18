export type Choice = { id: string; label: string };

export const COMMUNICATION_METHODS: Choice[] = [
  { id: 'sentences', label: 'Talks using sentences' },
  { id: 'short-phrases', label: 'Uses a few words or short phrases' },
  { id: 'gestures', label: 'Uses gestures or pointing' },
  { id: 'signs', label: 'Uses signs' },
  { id: 'aac', label: 'Uses an AAC device or app' },
  { id: 'pictures-pecs', label: 'Uses pictures or PECS' },
  {
    id: 'actions-behavior',
    label: 'Mostly communicates through actions or behavior',
  },
  { id: 'other', label: 'Other' },
];

export const RESPONDS_TO_NAME: Choice[] = [
  { id: 'yes', label: 'Yes' },
  { id: 'sometimes', label: 'Sometimes' },
  { id: 'not-usually', label: 'Not usually' },
  { id: 'unknown', label: "I'm not sure" },
];

export const UNDERSTANDING_SUPPORTS: Choice[] = [
  { id: 'short-sentences', label: 'Short, simple sentences' },
  { id: 'one-direction', label: 'One direction at a time' },
  { id: 'show', label: 'Show instead of only telling' },
  { id: 'visuals', label: 'Pictures or visual supports' },
  { id: 'extra-time', label: 'Extra time to respond' },
  { id: 'familiar-words', label: 'Familiar words or phrases' },
  { id: 'other', label: 'Other' },
];

export const APPROACH_GUIDANCE: Choice[] = [
  { id: 'slowly', label: 'Approach slowly' },
  { id: 'space', label: 'Give physical space' },
  { id: 'quiet-voice', label: 'Use a quiet voice' },
  { id: 'few-words', label: 'Use only a few words' },
  {
    id: 'avoid-touch',
    label: 'Avoid touching unless needed for immediate safety',
  },
  { id: 'few-questions', label: "Don't ask lots of questions" },
  { id: 'comfort-item', label: 'Let them keep a comfort item' },
  { id: 'move-away', label: 'They may move away when approached' },
  { id: 'hide', label: 'They may hide' },
  {
    id: 'may-not-look-afraid',
    label: 'They may not show that they are lost or afraid',
  },
  { id: 'other', label: 'Other' },
];

export const WANDERING_HISTORY: Choice[] = [
  { id: 'yes', label: 'Yes' },
  { id: 'no', label: 'No' },
  { id: 'unknown', label: 'Not sure / not yet' },
];

export const WANDERING_PATTERNS: Choice[] = [
  { id: 'keep-moving', label: 'Keep moving' },
  { id: 'hide', label: 'Hide' },
  { id: 'familiar-place', label: 'Go somewhere familiar' },
  { id: 'water', label: 'Go toward water' },
  { id: 'traffic', label: 'Go toward roads or traffic' },
  { id: 'playgrounds', label: 'Go toward playgrounds' },
  { id: 'vehicles', label: 'Go toward vehicles' },
  { id: 'businesses', label: 'Go toward stores or businesses' },
  { id: 'favorite-person-place', label: 'Seek a favorite person or place' },
  { id: 'other', label: 'Other' },
];

export const SAFETY_CONCERNS: Choice[] = [
  { id: 'water', label: 'Water' },
  { id: 'traffic', label: 'Traffic' },
  { id: 'heights', label: 'Heights' },
  { id: 'animals', label: 'Animals' },
  { id: 'danger-awareness', label: 'May not recognize danger' },
  { id: 'run-from-help', label: 'May run from people trying to help' },
  {
    id: 'aggressive-if-frightened',
    label: 'May hit, kick, bite, or push when frightened',
  },
  {
    id: 'verbal-safety-directions',
    label: 'May not respond to verbal safety directions',
  },
  {
    id: 'self-injury-overwhelmed',
    label: 'May hurt themselves when overwhelmed',
  },
  { id: 'other', label: 'Other' },
];

export const HARDER_TRIGGERS: Choice[] = [
  { id: 'loud-noises', label: 'Loud noises' },
  { id: 'crowds', label: 'Crowds' },
  { id: 'bright-lights', label: 'Bright lights' },
  { id: 'touch', label: 'Being touched' },
  { id: 'lots-of-talking', label: 'Lots of talking or questions' },
  { id: 'waiting', label: 'Waiting' },
  { id: 'routine-changes', label: 'Changes in routine' },
  { id: 'sirens', label: 'Sirens or sudden loud sounds' },
  { id: 'other', label: 'Other' },
];

export const HELPFUL_SUPPORTS: Choice[] = [
  { id: 'quiet-space', label: 'Quiet space' },
  { id: 'physical-space', label: 'More physical space' },
  { id: 'headphones', label: 'Headphones' },
  { id: 'comfort-object', label: 'Comfort object' },
  { id: 'familiar-person', label: 'Familiar person' },
  { id: 'movement', label: 'Movement' },
  { id: 'fewer-words', label: 'Fewer words' },
  { id: 'extra-time', label: 'Extra time' },
  { id: 'visual-support', label: 'Visual support' },
  { id: 'other', label: 'Other' },
];

export const WANDERING_DESTINATIONS: Choice[] = [
  { id: 'water', label: 'Water' },
  { id: 'playground', label: 'Playground' },
  { id: 'road-parking', label: 'Road or parking area' },
  { id: 'store-business', label: 'Favorite store or business' },
  { id: 'home', label: 'Home' },
  { id: 'school', label: 'School' },
  { id: 'familiar-person-home', label: "Familiar person’s home" },
  { id: 'favorite-place', label: 'Favorite place' },
  { id: 'other', label: 'Other' },
];

export function labelsFor(ids: string[] | undefined, choices: Choice[]) {
  return (ids ?? [])
    .map((id) => choices.find((choice) => choice.id === id)?.label)
    .filter((label): label is string => Boolean(label));
}
