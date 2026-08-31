import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  buildAutismSupportLessonGuidance,
  buildAutismSupportLevelProfile,
  restoreAutismSupportAnswers,
} from '../lib/personalization/autismSupportLevel.ts';
import { buildLessonPrompt } from '../lib/ai/prompts.ts';

const profileFor = (answers, communicationModes = [], lessonState = {}) => ({
  autismSupport: buildAutismSupportLevelProfile(answers),
  communication: { modes: communicationModes },
  regulation: { currentNeeds: [] },
  learningSupport: { preferredTeachingSupports: [] },
  lessonState: { masteredSkillCodes: [], weakSkillCodes: [], ...lessonState },
});

const guidanceFor = (answers, modes = [], lessonState = {}) =>
  buildAutismSupportLessonGuidance(profileFor(answers, modes, lessonState));

// A: Level 1 never erases full-sentence communication or transition-specific needs.
let guidance = guidanceFor(
  { autism_support_level: 'Level 1 — Requiring support' },
  ['spoken_sentences'],
  { weakSkillCodes: ['behavior.transitions'] },
);
assert.match(guidance, /Level 1/);
assert.match(guidance, /spoken_sentences/);
assert.match(guidance, /demonstrated lesson performance take precedence/);

// B: Level 2 provides a structured baseline without replacing the child's actual profile.
guidance = guidanceFor(
  { autism_support_level: 'Level 2 — Requiring substantial support' },
  ['spoken_phrases'],
);
assert.match(guidance, /clear structure/);
assert.match(guidance, /spoken_phrases/);

// C/D/E: communication mode is never inferred from support level.
assert.match(guidanceFor({ autism_support_level: 'Level 3 — Requiring very substantial support' }, ['aac']), /aac/);
assert.match(guidanceFor({ autism_support_level: 'Level 3 — Requiring very substantial support' }, ['spoken_sentences']), /spoken_sentences/);
assert.match(guidanceFor({ autism_support_level: 'Level 1 — Requiring support' }, ['aac']), /aac/);

// F: missing historical fields remain valid and produce no diagnostic assumptions.
assert.deepEqual(buildAutismSupportLevelProfile({}), {
  overall: 'unknown', socialCommunication: 'unknown', restrictedRepetitive: 'unknown', source: 'unknown',
});
assert.equal(guidanceFor({}), '');
const promptForGuidance = (personalizationGuidance) => buildLessonPrompt({
  childName: 'Test Child',
  skill: 'Communication',
  skillTarget: 'Requesting help',
  location: 'Home',
  lessonNumber: 1,
  difficultyModifier: 'Balanced',
  behaviorSummary: 'Use the individual profile.',
  varietyGuidance: 'Use a new routine.',
  avoidSkills: [],
  personalizationGuidance,
});
assert.doesNotMatch(promptForGuidance(''), /Personalization guidance:/);

// G: mixed professional levels remain separate rather than being averaged.
const mixed = buildAutismSupportLevelProfile({
  autism_support_level: 'Different levels were given for different areas',
  social_communication_support_level: 'Level 2',
  restricted_repetitive_support_level: 'Level 3',
});
assert.equal(mixed.overall, 'mixed');
assert.equal(mixed.socialCommunication, '2');
assert.equal(mixed.restrictedRepetitive, '3');
assert.match(buildAutismSupportLessonGuidance(profileFor({
  autism_support_level: 'Different levels were given for different areas',
  social_communication_support_level: 'Level 2',
  restricted_repetitive_support_level: 'Level 3',
})), /do not average/);

for (const answers of [
  { autism_support_level: 'Level 1 — Requiring support' },
  { autism_support_level: 'Level 2 — Requiring substantial support' },
  { autism_support_level: 'Level 3 — Requiring very substantial support' },
  {
    autism_support_level: 'Different levels were given for different areas',
    social_communication_support_level: 'Level 2',
    restricted_repetitive_support_level: 'Level 3',
  },
]) {
  const finalPrompt = promptForGuidance(guidanceFor(answers, ['spoken_sentences']));
  assert.match(finalPrompt, /Personalization guidance:/);
  assert.doesNotMatch(finalPrompt, /high functioning|nonspeaking|developmental delay|cannot learn|low intelligence/i);
  assert.ok(finalPrompt.length < 5_500, 'personalized prompt should remain concise');
}

// H: an explicit uncertainty answer is safely normalized to unknown.
assert.equal(buildAutismSupportLevelProfile({ autism_support_level: "Not sure / I wasn't told" }).overall, 'unknown');

// Persistence/restoration: all primary choices and partial mixed values round-trip.
for (const option of [
  'Level 1 — Requiring support',
  'Level 2 — Requiring substantial support',
  'Level 3 — Requiring very substantial support',
  "Not sure / I wasn't told",
]) {
  assert.equal(restoreAutismSupportAnswers({ autism_support_level: option }).autism_support_level, option);
}
assert.deepEqual(restoreAutismSupportAnswers({
  autism_support_level: 'Different levels were given for different areas',
  social_communication_support_level: 'Level 2',
  restricted_repetitive_support_level: 'Level 3',
}), {
  autism_support_level: 'Different levels were given for different areas',
  social_communication_support_level: 'Level 2',
  restricted_repetitive_support_level: 'Level 3',
});
assert.deepEqual(restoreAutismSupportAnswers({
  autism_support_level: 'Different levels were given for different areas',
  social_communication_support_level: 'Not sure',
}), {
  autism_support_level: 'Different levels were given for different areas',
  social_communication_support_level: 'Not sure',
});
assert.deepEqual(restoreAutismSupportAnswers(
  { autism_support_level: 'Different levels were given for different areas', social_communication_support_level: 'Level 2' },
  { autism_support_level: 'Level 2 — Requiring substantial support' },
), { autism_support_level: 'Level 2 — Requiring substantial support' });

// I/J: performance remains an independent, stronger adaptation signal in the guidance contract.
for (const level of ['Level 3 — Requiring very substantial support', 'Level 1 — Requiring support']) {
  const text = guidanceFor({ autism_support_level: level }, [], { masteredSkillCodes: ['communication.request'], weakSkillCodes: ['daily_living.transitions'] });
  assert.match(text, /Performance may increase or decrease prompting/);
  assert.match(text, /without changing the reported diagnostic level/);
}

const initial = readFileSync('app/onboarding/assessment.tsx', 'utf8');
const monthly = readFileSync('app/assessment.tsx', 'utf8');
const normalizer = readFileSync('lib/personalization/normalizeLegacyProfile.ts', 'utf8');
const queue = readFileSync('lib/lessonQueue.ts', 'utf8');
assert.match(initial, /Was your child given an autism support level when they were diagnosed/);
assert.match(initial, /That's okay if you don't know/);
assert.match(initial, /question\.id === 'autism_support_level'\) return true/);
assert.match(monthly, /responses: \{ \.\.\.answers, \.\.\.supportAnswers \}/);
assert.match(normalizer, /autismSupport: buildAutismSupportLevelProfile/);
assert.match(queue, /buildAutismSupportLessonGuidance/);

const changed = execFileSync('git', ['diff', '--name-only'], { encoding: 'utf8' });
assert.doesNotMatch(changed, /daily.adventure|daily-activities|daily_adventures/i);

console.log('Autism support-level personalization scenarios A–J passed.');
