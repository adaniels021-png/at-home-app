import crosswalk from '../../data/curriculum/phase4j-assessment-canonical-crosswalk-v1.json';
import type { AssessmentAnswers } from './types';

export const ASSESSMENT_CANONICAL_CONTRACT_VERSION = 'assessment-canonical-v1' as const;

type CrosswalkEntry = (typeof crosswalk.entries)[number];
type CanonicalTargets = {
  contractVersion: typeof ASSESSMENT_CANONICAL_CONTRACT_VERSION;
  domainKeys: string[];
  skillKeys: string[];
  broadDomainKeys: string[];
  unmapped: { field: string; value: string; reason: string | null }[];
  provenance: {
    field: string;
    value: string;
    mappingType: string;
    domainKeys: string[];
    skillKeys: string[];
  }[];
};

const byFieldValue = new Map<string, CrosswalkEntry>(
  crosswalk.entries.map((entry) => [`${entry.field}\u0000${entry.value}`, entry])
);

function values(value: unknown): string[] {
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).map((item) => item.trim());
  return [];
}

export function canonicalTargetsFromAssessment(answers: AssessmentAnswers): CanonicalTargets {
  const domains = new Set<string>();
  const skills = new Set<string>();
  const broad = new Set<string>();
  const unmapped: CanonicalTargets['unmapped'] = [];
  const provenance: CanonicalTargets['provenance'] = [];
  for (const field of ['primary_goal', 'communication_targets', 'routine_challenges', 'behavior_concerns', 'social_skills', 'safety_skills']) {
    for (const value of values(answers[field])) {
      const entry = byFieldValue.get(`${field}\u0000${value}`);
      if (!entry) {
        unmapped.push({ field, value, reason: 'No reviewed assessment-canonical-v1 entry.' });
        continue;
      }
      for (const key of entry.domains) domains.add(key);
      for (const key of entry.skills) skills.add(key);
      if (entry.type === 'BROAD_DOMAIN_SIGNAL') for (const key of entry.domains) broad.add(key);
      if (entry.type === 'UNMAPPED') unmapped.push({ field, value, reason: entry.notes ?? null });
      provenance.push({ field, value, mappingType: entry.type, domainKeys: [...entry.domains], skillKeys: [...entry.skills] });
    }
  }
  return { contractVersion: ASSESSMENT_CANONICAL_CONTRACT_VERSION, domainKeys: [...domains], skillKeys: [...skills], broadDomainKeys: [...broad], unmapped, provenance };
}

export function canonicalInterestKeys(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim().toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')).filter(Boolean))];
}
