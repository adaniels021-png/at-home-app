import type { PersonalizedRecommendationContext, ScoreReason, ShadowLessonCandidate, ShadowRecommendationOptions } from './types';

export const SHADOW_SCORE_WEIGHTS={primaryGoal:30,need:24,skill:22,readinessExact:14,readinessNearby:7,communication:12,supportFit:10,time:6,interest:4,recent:-25,completed:-12} as const;
const norm=(v:unknown)=>String(v??'').trim().toLowerCase();
const add=(list:ScoreReason[],code:string,points:number,detail:string)=>list.push({code,points,detail});
export function scoreShadowCandidate(c:ShadowLessonCandidate,ctx:PersonalizedRecommendationContext,o:ShadowRecommendationOptions){
 const positive:ScoreReason[]=[],penalties:ScoreReason[]=[]; const canonical:{domainKeys:string[];skillKeys:string[]}=ctx.profile.canonicalTargets??{domainKeys:[],skillKeys:[]}; const skill=c.curriculum.skillKey; const domain=c.curriculum.domainKey;
 if(Boolean(domain&&canonical.domainKeys.includes(domain)))add(positive,'primary_goal_match',SHADOW_SCORE_WEIGHTS.primaryGoal,'Matches a reviewed canonical caregiver domain target.');
 if(Boolean(skill&&canonical.skillKeys.includes(skill)))add(positive,'assessed_need_match',SHADOW_SCORE_WEIGHTS.need,'Matches a reviewed canonical specialized-skill target.');
 if(o.skillArea&&(norm(c.curriculum.skillKey)===norm(o.skillArea)||norm(c.metadata.targetSkillCode)===norm(o.skillArea)))add(positive,'specialized_skill_match',SHADOW_SCORE_WEIGHTS.skill,'Matches requested specialized skill.');
 const target=o.stageNumber??ctx.profile.lessonState.currentSkillStages[c.curriculum.skillKey??'']; const stage=c.curriculum.stageNumber;
 if(target&&stage===target)add(positive,'readiness_exact',SHADOW_SCORE_WEIGHTS.readinessExact,'Matches the current readiness stage.'); else if(target&&stage&&Math.abs(target-stage)===1)add(positive,'readiness_nearby',SHADOW_SCORE_WEIGHTS.readinessNearby,'Within a flexible one-stage readiness band.');
 if(ctx.profile.communication.modes.some(m=>c.metadata.supportedResponseModes.includes(m)))add(positive,'communication_compatible',SHADOW_SCORE_WEIGHTS.communication,'Supports an established communication method.');
 const support=c.metadata.supportLevel, overall=ctx.profile.dailyLiving.overallIndependence;
 if(support&&((support==='more_support'&&['high_support','not_started'].includes(overall))||(support==='less_support'&&['mostly_independent','independent'].includes(overall))||support==='balanced_support'))add(positive,'support_fit',SHADOW_SCORE_WEIGHTS.supportFit,'Reviewed support demand fits available context.');
 const period=o.routinePreference??((o.localHour??12)<12?'morning':(o.localHour??12)>=17?'evening':null);
 if((period==='morning'&&c.curriculum.timeRelevance==='morning_priority')||(period==='evening'&&c.curriculum.timeRelevance==='evening_priority'))add(positive,'time_relevance',SHADOW_SCORE_WEIGHTS.time,'Routine timing is relevant; access is never restricted by time.');
 const text=[c.lesson.title,...(c.metadata.materialActivityTags??[])].join(' ').toLowerCase().replace(/[^a-z0-9]+/g,'_'); if(ctx.profile.interests.preferredInterests.some(i=>text.includes(norm(i))))add(positive,'interest_match',SHADOW_SCORE_WEIGHTS.interest,'Matches a normalized interest.');
 if(ctx.profile.lessonState.recentlyShownLessonIds.includes(c.lesson.id))add(penalties,'recently_shown',SHADOW_SCORE_WEIGHTS.recent,'Recently shown; freshness penalty only.'); else if(ctx.profile.lessonState.recentlyCompletedLessonIds.includes(c.lesson.id))add(penalties,'recently_completed',SHADOW_SCORE_WEIGHTS.completed,'Recently completed; not treated as mastery.');
 return{score:[...positive,...penalties].reduce((n,r)=>n+r.points,0),positive,penalties};
}
