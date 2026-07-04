import { buildParentSupportContext } from '../parentSupportContext';

import { generateJsonWithEdgeFunction } from './edgeAI';
import { buildFallbackBehaviorSupportPlan } from './fallbacks';
import { buildBehaviorPrompt } from './prompts';

export type BehaviorSupportPlan = {
  possible_reason: string;
  prevention_strategies: string[];
  replacement_skills: string[];
  calming_supports: string[];
  parent_tips: string[];
  encouragement: string;
};

export async function generateBehaviorSupportPlan({
  childId,
  childName,
  behavior,
  beforeBehavior,
  afterBehavior,
  location,
}: {
  childId: string;
  childName: string;
  behavior: string;
  beforeBehavior: string;
  afterBehavior?: string;
  location?: string;
}): Promise<BehaviorSupportPlan> {
  try {
    const supportContext =
      await buildParentSupportContext({
        childId,
      });

    const contextSummary = supportContext
      ? `
Child Name:
${supportContext.childName}

Age:
${supportContext.age || 'Unknown'}

Diagnosis:
${supportContext.diagnosis}

Communication Level:
${supportContext.communicationLevel}

Sensory Needs:
${supportContext.sensoryNeeds?.join(', ') || 'Unknown'}

Weak Skills:
${supportContext.weakSkills?.join(', ') || 'None identified'}

Strong Skills:
${supportContext.strongSkills?.join(', ') || 'None identified'}

Recent Lesson Challenges:
${supportContext.recentChallenges?.join(', ') || 'None'}
`
      : 'No additional child context available.';

    const prompt = buildBehaviorPrompt({
      childName,
      behavior,
      beforeBehavior,
      afterBehavior:
        afterBehavior || 'Not provided',
      location:
        location || 'Not provided',
      contextSummary,
    });

    return await generateJsonWithEdgeFunction<BehaviorSupportPlan>(
      prompt,
      buildFallbackBehaviorSupportPlan(),
      'behavior-support'
    );
  } catch (error) {
    console.error(
      'Behavior support generation failed:',
      error
    );

    return buildFallbackBehaviorSupportPlan();
  }
}

/**
 * Future AI Tools
 *
 * generateMeltdownPlan()
 * generateAggressionPlan()
 * generateTransitionPlan()
 * generateSleepPlan()
 * generateToiletTrainingPlan()
 * generateSafetyPlan()
 * generateSchoolSupportPlan()
 */