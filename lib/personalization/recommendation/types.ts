import type { LessonLibraryItem } from '../../lessonLibrary';
import type { ChildPersonalizationProfile, CommunicationMode } from '../types';

export const SHADOW_ALGORITHM_VERSION = 'phase4e-shadow-v1' as const;

export type MetadataSource = 'approved_live'|'reviewed_live'|'candidate_artifact'|'unavailable';
export type TimeRelevance = 'morning_priority'|'evening_priority'|'context_dependent'|'time_neutral'|'unresolved';
export type ReviewedSupportLevel = 'more_support'|'balanced_support'|'less_support';
export type CandidateMetadata = {
 targetSkillCode:string|null; masteryGroup:string|null; skillStageCode:string|null;
 prerequisiteSkillCodes:string[]; assessmentNeedTags:string[]; supportedResponseModes:CommunicationMode[];
 contraindicationTags:string[]; materialActivityTags:string[]; personalizationMetadataVersion:number|null;
 supportLevel:ReviewedSupportLevel|null; supportLevelReviewed:boolean; status:'approved'|'reviewed'|'candidate_unreviewed'|'missing';
 source:MetadataSource; currentFingerprint:boolean; fiveDecisionsComplete:boolean; recommendationReady:boolean;
 confidence:'HIGH'|'MEDIUM'|'LOW'|null;
};
export type CurriculumPlacement={domainKey:string|null;skillKey:string|null;stageDefinitionId:string|null;stageNumber:number|null;stageName:string|null;mappingStatus:string|null;mappingConfidence:string|null;contentDisposition:string|null;sensitivity:string|null;recommendationEligibility:string|null;timeRelevance:TimeRelevance;ownerDecisionRequired:boolean;isActivePrimary:boolean};
export type ShadowLessonCandidate={lesson:LessonLibraryItem;metadata:CandidateMetadata;curriculum:CurriculumPlacement;missingMetadata:string[]};
export type ShadowHistoryItem={instanceId:string;libraryLessonId:string|null;source:string;status:string;skillArea:string|null;stageNumber:number|null;completedAt:string|null};
export type PersonalizedRecommendationContext={schemaVersion:number;builtAt:string;profile:ChildPersonalizationProfile;history:{recentCuratedCompletions:ShadowHistoryItem[];recentAiCompletions:ShadowHistoryItem[];recentUnsuccessfulAttempts:ShadowHistoryItem[];recentLessonObservations:{category:string|null;lessonName:string|null;status:string;performanceScore:number|null;promptLevel:string|null;behaviorResponse:string|null;consistencyLevel:string|null;completedAt:string|null}[]};assessmentTimestamps:{initial:string|null;reassessment:string|null}};
export type FilterDecision={accepted:boolean;filter:string;reason:string};
export type ScoreReason={code:string;points:number;detail:string};
export type EvaluatedCandidate=ShadowLessonCandidate&{eligible:boolean;score:number;rank:number|null;positiveReasons:ScoreReason[];penalties:ScoreReason[];exclusions:string[];decisions:FilterDecision[];rejectedBy:string|null};
export type ShadowRecommendationOptions={category?:string;isPro:boolean;skillArea?:string;stageNumber?:number;localHour?:number;routinePreference?:'morning'|'evening'|null;limit?:number;forceFailureForTest?:boolean};
export type ShadowRecommendationResult={algorithmVersion:typeof SHADOW_ALGORITHM_VERSION;architectureVersion:number;generatedAt:string;recommendation:EvaluatedCandidate|null;accepted:EvaluatedCandidate[];rejected:EvaluatedCandidate[];appliedFilters:string[];missingMetadata:{lessonId:string;title:string;fields:string[]}[];missingCurriculum:string[];summary:{evaluated:number;eligible:number;excluded:number;metadataSources:Record<MetadataSource,number>;exclusions:Record<string,number>}};
