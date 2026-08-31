import type { ChildPersonalizationProfile } from './types';

export type PersonalizationDiagnosticSummary = Pick<
  ChildPersonalizationProfile,
  'schemaVersion' | 'age' | 'autismSupport' | 'priorities' | 'communication' | 'dailyLiving' | 'regulation' | 'sensory' | 'social' | 'safety' | 'lessonState'
> & {
  restrictions: Pick<
    ChildPersonalizationProfile['restrictions'],
    'tags' | 'unresolvedFreeText'
  >;
};

/**
 * Returns a console-free diagnostic summary for tests or an existing protected
 * admin workflow. Raw restriction and caregiver notes are intentionally omitted.
 */
export function inspectPersonalizationProfile(
  profile: ChildPersonalizationProfile
): PersonalizationDiagnosticSummary {
  return {
    schemaVersion: profile.schemaVersion,
    age: profile.age,
    autismSupport: profile.autismSupport,
    priorities: profile.priorities,
    communication: profile.communication,
    dailyLiving: profile.dailyLiving,
    regulation: profile.regulation,
    sensory: profile.sensory,
    social: profile.social,
    safety: profile.safety,
    restrictions: {
      tags: profile.restrictions.tags,
      unresolvedFreeText: profile.restrictions.unresolvedFreeText,
    },
    lessonState: profile.lessonState,
  };
}
