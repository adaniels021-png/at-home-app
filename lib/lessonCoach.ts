import type { CoachSection } from '../components/ParentCoachSheet';

type UnknownLesson = Record<string, any>;

function toStringArray(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (item && typeof item === 'object') {
          const record = item as Record<string, unknown>;
          const text = record.description || record.text || record.title || record.tip || record.value;
          return typeof text === 'string' ? text.trim() : '';
        }
        return '';
      })
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value.split(/\n|•|;/).map((item) => item.trim()).filter(Boolean);
  }

  return [];
}

function firstNonEmpty(...values: unknown[]): string[] {
  for (const value of values) {
    const items = toStringArray(value);
    if (items.length > 0) return items;
  }
  return [];
}

export function mapLibraryLessonToDailyLessonV2(lesson: UnknownLesson) {
  return {
    id: `library-${lesson.id}`,
    library_lesson_id: lesson.id,
    source: 'library',
    lesson_name: lesson.title,
    focus_skill: lesson.skill_area,
    category: lesson.category,
    materials: toStringArray(lesson.materials),
    teaching_steps: firstNonEmpty(lesson.steps, lesson.teaching_steps),
    estimated_minutes: lesson.estimated_minutes || null,
    goal: lesson.goal || null,
    description: lesson.description || null,
    why_skill_matters: lesson.why_skill_matters || null,
    setup_instructions: firstNonEmpty(lesson.setup_instructions, lesson.setup),
    parent_script: firstNonEmpty(lesson.parent_script),
    expected_child_response: firstNonEmpty(lesson.expected_child_response, lesson.expected_response),
    caregiver_tips: firstNonEmpty(lesson.caregiver_tips, lesson.parent_tips),
    prompting_tips: firstNonEmpty(lesson.prompting_tips, lesson.prompt_tips),
    reinforcement_tips: firstNonEmpty(lesson.reinforcement_tips, lesson.reinforcement_ideas),
    if_child_struggles: firstNonEmpty(lesson.if_child_struggles, lesson.troubleshooting, lesson.troubleshooting_tips),
    easy_version: firstNonEmpty(lesson.easy_version),
    harder_version: firstNonEmpty(lesson.harder_version),
    generalization_ideas: firstNonEmpty(lesson.generalization_ideas, lesson.generalization),
    safety_notes: firstNonEmpty(lesson.safety_notes),
    mastery_criteria: lesson.mastery_criteria || null,
    next_lesson_preview: lesson.next_lesson_preview || null,
    parent_coaching_note:
      firstNonEmpty(lesson.caregiver_tips)[0] ||
      lesson.goal ||
      'Keep the lesson short, positive, and focused on small wins.',
    lesson_summary: lesson.description || lesson.goal || lesson.why_skill_matters || null,
    lesson_type: lesson.lesson_type,
    stage_number: lesson.stage_number,
    stage_name: lesson.stage_name,
  };
}

export function getCoachSections(lesson: UnknownLesson, stepIndex: number, totalSteps: number): CoachSection[] {
  const earlyStep = stepIndex <= 1;
  const middleStep = totalSteps > 2 && stepIndex > 1 && stepIndex < totalSteps - 2;
  const finalStep = stepIndex >= Math.max(totalSteps - 2, 0);

  const setup = firstNonEmpty(lesson.setup_instructions);
  const script = firstNonEmpty(lesson.parent_script);
  const caregiver = firstNonEmpty(lesson.caregiver_tips);
  const prompting = firstNonEmpty(lesson.prompting_tips);
  const reinforcement = firstNonEmpty(lesson.reinforcement_tips);
  const struggles = firstNonEmpty(lesson.if_child_struggles);
  const expected = firstNonEmpty(lesson.expected_child_response);
  const generalization = firstNonEmpty(lesson.generalization_ideas);

  const sections: CoachSection[] = [];

  if (earlyStep && setup.length > 0) sections.push({ key: 'setup', title: 'Set Up for Success', icon: 'home-outline', color: '#2563EB', backgroundColor: '#EFF6FF', items: setup.slice(0, 4) });
  if (script.length > 0) sections.push({ key: 'script', title: 'What You Can Say', icon: 'chatbubble-ellipses-outline', color: '#7C3AED', backgroundColor: '#F5F3FF', items: script.slice(0, 5) });
  if (middleStep && prompting.length > 0) sections.push({ key: 'prompting', title: 'Prompting Help', icon: 'hand-left-outline', color: '#EA580C', backgroundColor: '#FFF7ED', items: prompting.slice(0, 4) });
  if (caregiver.length > 0) sections.push({ key: 'caregiver', title: 'Caregiver Tip', icon: 'bulb-outline', color: '#4F46E5', backgroundColor: '#EEF2FF', items: caregiver.slice(0, 4) });
  if (expected.length > 0 && middleStep) sections.push({ key: 'expected', title: 'What Counts as a Response', icon: 'eye-outline', color: '#059669', backgroundColor: '#ECFDF5', items: expected.slice(0, 4) });
  if (reinforcement.length > 0) sections.push({ key: 'reinforcement', title: 'Reinforcement Ideas', icon: 'sparkles-outline', color: '#DB2777', backgroundColor: '#FDF2F8', items: reinforcement.slice(0, 4) });
  if (struggles.length > 0) sections.push({ key: 'struggles', title: 'If Your Child Struggles', icon: 'heart-outline', color: '#B45309', backgroundColor: '#FFFBEB', items: struggles.slice(0, 4) });
  if (finalStep && generalization.length > 0) sections.push({ key: 'generalization', title: 'Practice It Naturally', icon: 'earth-outline', color: '#0F766E', backgroundColor: '#F0FDFA', items: generalization.slice(0, 4) });

  return sections;
}
