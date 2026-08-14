import assert from 'node:assert/strict';
import fs from 'node:fs';

const taxonomy = JSON.parse(
  fs.readFileSync('data/curriculum/phase4b-taxonomy-v1.json', 'utf8')
);
const shadow = JSON.parse(
  fs.readFileSync('data/curriculum/phase4b-shadow-mappings-v1.json', 'utf8')
);

const COMMUNICATION_REQUIRED = [
  'functional communication',
  'must not diagnose or treat',
  'AAC',
  'sign',
  'gesture',
  'pictures',
  'communication tools remain available',
];
const FEEDING_REQUIRED = [
  'never requires eating',
  'tasting',
  'swallowing',
  'nutrition',
  'pressure-free participation',
  'communication',
  'choice',
];

function validate(taxonomyFixture, mappingFixture) {
  assert.equal(taxonomyFixture.architectureVersion, 1);
  assert.equal(mappingFixture.architectureVersion, 1);
  assert.equal(taxonomyFixture.domains.length, 21);
  assert.equal(taxonomyFixture.skills.length, 54);
  assert.equal(mappingFixture.mappings.length, 299);

  const domainKeys = new Set(taxonomyFixture.domains.map((item) => item.key));
  const skillKeys = new Set(taxonomyFixture.skills.map((item) => item.key));
  const lessonIds = new Set(mappingFixture.mappings.map((item) => item.lessonId));
  assert.equal(domainKeys.size, 21, 'Domain keys must be unique.');
  assert.equal(skillKeys.size, 54, 'Skill keys must be unique.');
  assert.equal(lessonIds.size, 299, 'Lesson IDs must be unique.');

  for (const skill of taxonomyFixture.skills) {
    assert(domainKeys.has(skill.domainKey), `Unknown domain for ${skill.key}.`);
    const stageNumbers = new Set(skill.stages.map((stage) => stage.number));
    assert.equal(stageNumbers.size, skill.stages.length, `Duplicate stage in ${skill.key}.`);
    assert.equal(
      skill.stages.filter((stage) => stage.isCore).length,
      skill.coreStageCount,
      `Core stage count mismatch for ${skill.key}.`
    );
    const stage5 = skill.stages.find((stage) => stage.number === 5);
    assert.equal(Boolean(stage5), skill.hasOptionalStage5, `Stage 5 mismatch for ${skill.key}.`);
    if (stage5) {
      assert.equal(stage5.isCore, false);
      assert.equal(stage5.isGeneralization, true);
    }
  }

  const communicationPractice = taxonomyFixture.skills.find(
    (skill) => skill.key === 'communication.communication_practice'
  );
  const feedingParticipation = taxonomyFixture.skills.find(
    (skill) => skill.key === 'routines.feeding_participation'
  );
  assert(communicationPractice?.communicationSafeguard);
  assert(feedingParticipation?.feedingSafeguard);
  for (const phrase of COMMUNICATION_REQUIRED) {
    assert(
      communicationPractice.communicationSafeguard.includes(phrase),
      `Communication safeguard is missing: ${phrase}`
    );
  }
  for (const phrase of FEEDING_REQUIRED) {
    assert(
      feedingParticipation.feedingSafeguard.includes(phrase),
      `Feeding safeguard is missing: ${phrase}`
    );
  }

  for (const mapping of mappingFixture.mappings) {
    assert.equal(mapping.architectureVersion, 1);
    assert.equal(mapping.isActivePrimary, false, 'All mappings must remain shadow.');
    assert(
      ['morning_priority','evening_priority','context_dependent','time_neutral','unresolved'].includes(mapping.timeOfDayRelevance),
      `Invalid time relevance for ${mapping.lessonId}.`
    );
    if (mapping.mappingStatus === 'mapped') {
      assert(skillKeys.has(mapping.skillKey), `Unknown mapping skill ${mapping.skillKey}.`);
      const skill = taxonomyFixture.skills.find((item) => item.key === mapping.skillKey);
      assert.equal(mapping.domainKey, skill.domainKey);
      assert(
        skill.stages.some((stage) => stage.number === mapping.stageNumber),
        `Unknown mapping stage for ${mapping.lessonId}.`
      );
    } else {
      assert.equal(mapping.recommendationEligibility, 'excluded');
    }
    if (
      mapping.contentDisposition.startsWith('retire_') ||
      mapping.contentDisposition === 'approved_retirement' ||
      mapping.contentDisposition === 'unresolved_concept'
    ) {
      assert.equal(mapping.recommendationEligibility, 'excluded');
    }
    if (mapping.sensitivity === 'high_scrutiny') {
      assert.notEqual(mapping.recommendationEligibility, 'shadow_candidate');
    }
  }

  const approvedRetirements = new Set([
    '2a74e92f-233b-49be-a3cb-defdb1d0b8a3',
    '55fcdb25-a08c-4058-b2bb-d620710b1ce1',
    '405ad1fe-d7f4-4331-8000-cd7343dcde74',
    'c52b8d4c-3607-4325-bd67-5d802e84342c',
  ]);
  for (const id of approvedRetirements) {
    const mapping = mappingFixture.mappings.find((item) => item.lessonId === id);
    assert.equal(mapping?.contentDisposition, 'approved_retirement');
    assert.equal(mapping?.recommendationEligibility, 'excluded');
  }

  return {
    domains: taxonomyFixture.domains.length,
    skills: taxonomyFixture.skills.length,
    stages: taxonomyFixture.skills.reduce((sum, skill) => sum + skill.stages.length, 0),
    mappings: mappingFixture.mappings.length,
    highScrutiny: mappingFixture.mappings.filter((item) => item.sensitivity === 'high_scrutiny').length,
    excluded: mappingFixture.mappings.filter((item) => item.recommendationEligibility === 'excluded').length,
  };
}

const result = validate(taxonomy, shadow);

// Negative parser/validator checks required by Phase 4B.
assert.throws(() =>
  validate(taxonomy, {
    ...shadow,
    mappings: [...shadow.mappings.slice(0, -1), shadow.mappings[0]],
  })
);
const invalidSkill = structuredClone(shadow);
invalidSkill.mappings[0].skillKey = 'missing.skill';
assert.throws(() => validate(taxonomy, invalidSkill));
const eligibleRetirement = structuredClone(shadow);
const retired = eligibleRetirement.mappings.find(
  (item) => item.mappingStatus === 'retirement'
);
retired.recommendationEligibility = 'shadow_candidate';
assert.throws(() => validate(taxonomy, eligibleRetirement));

console.log(JSON.stringify({ valid: true, ...result }, null, 2));
