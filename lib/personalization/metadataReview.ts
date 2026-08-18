import { supabase } from '../supabase';
import type { MetadataConfidence, MetadataReviewStatus, MetadataReviewTier, PrerequisiteReviewState } from './metadataVocabulary';
import { validateLessonMetadata } from './metadataValidation';

export type LessonMetadataReviewRow = {
  id: string; lesson_id: string; metadata_version: number; target_skill_code: string | null;
  mastery_group: string | null; skill_stage_code: string | null; prerequisite_skill_codes: string[];
  assessment_need_tags: string[]; supported_response_modes: string[];
  min_communication_complexity: string | null; max_communication_complexity: string | null;
  min_independence_level: string | null; max_independence_level: string | null;
  contraindication_tags: string[]; material_activity_tags: string[]; universal_safe_fallback: boolean;
  review_status: MetadataReviewStatus; candidate_confidence: MetadataConfidence | null;
  candidate_warnings: string[]; candidate_evidence: Record<string, unknown>;
  candidate_source: string; communication_reviewed: boolean; safety_reviewed: boolean;
  mastery_reviewed: boolean; human_decision_summary: Record<string,unknown>; last_review_method: string|null;
  prerequisite_reviewed: boolean; duplicate_reviewed: boolean; duplicate_classification: string | null;
  prerequisite_review_state: PrerequisiteReviewState; prerequisite_classifier_reason: string | null;
  review_tier: MetadataReviewTier; review_tier_reasons: string[];
  support_level: 'more_support'|'balanced_support'|'less_support'|null; support_level_reviewed:boolean;
  content_review_status:'pending'|'approved'|'needs_revision';
  content_fingerprint: string | null; approved_content_fingerprint: string | null; metadata_stale: boolean;
  validation_errors: string[]; review_reason: string | null; reviewed_by: string | null;
  reviewed_at: string | null; created_at: string; updated_at: string;
  lesson: { id:string; title:string; description:string|null; category:string|null; skill_area:string|null; stage_number:number|null; stage_name:string|null; difficulty:string|null; quality_status:string|null; is_active:boolean; pro_only:boolean; materials:string[]|null; steps:string[]|null; caregiver_tips:string[]|null; safety_notes:string[]|null; goal:string|null; expected_child_response:string|null };
};

export type MetadataHistoryRow = { id:string; metadata_id:string; lesson_id:string; metadata_version:number; previous_review_status:string|null; new_review_status:string; changed_snapshot:Record<string,unknown>; reviewer_user_id:string; action:string; review_reason:string|null; created_at:string };
export type ProductionReviewDecision = { id:string;metadata_id:string;lesson_id:string;decision_key:string;decision_category:'communication'|'safety_material'|'prerequisite'|'mastery'|'duplicate_progression';classification:string;requires_human:boolean;decision_status:'resolved_deterministic'|'unresolved'|'human_confirmed'|'human_edited'|'needs_more_review'|'content_dependent';plain_language_summary:string;prompt:string|null;recommendation:string|null;rationale:string|null;evidence:{field:string;excerpt:string;why:string}[];candidate_value:Record<string,unknown>;final_value:Record<string,unknown>|null;provenance:string;reviewed_at:string|null;review_reason:string|null };

export async function getMetadataReviewRows(): Promise<LessonMetadataReviewRow[]> {
  const { data, error } = await supabase.from('lesson_personalization_metadata').select(`*,lesson:lesson_library!lesson_id(id,title,description,category,skill_area,stage_number,stage_name,difficulty,quality_status,is_active,pro_only,materials,steps,caregiver_tips,safety_notes,goal,expected_child_response)`).order('updated_at',{ascending:false});
  if(error) throw error;
  return (data??[]) as unknown as LessonMetadataReviewRow[];
}

export async function getMetadataReviewRow(id:string): Promise<LessonMetadataReviewRow> {
  const { data,error }=await supabase.from('lesson_personalization_metadata').select(`*,lesson:lesson_library!lesson_id(id,title,description,category,skill_area,stage_number,stage_name,difficulty,quality_status,is_active,pro_only,materials,steps,caregiver_tips,safety_notes,goal,expected_child_response)`).eq('id',id).single();
  if(error)throw error; return data as unknown as LessonMetadataReviewRow;
}

export async function getMetadataHistory(metadataId:string):Promise<MetadataHistoryRow[]> {
  const {data,error}=await supabase.from('lesson_personalization_metadata_history').select('*').eq('metadata_id',metadataId).order('created_at',{ascending:false});
  if(error)throw error; return (data??[]) as MetadataHistoryRow[];
}

export async function getProductionReviewDecisions(metadataId:string):Promise<ProductionReviewDecision[]> {
  const {data,error}=await supabase.from('lesson_personalization_review_decisions').select('*').eq('metadata_id',metadataId).order('created_at');
  if(error)throw error;return (data??[]) as ProductionReviewDecision[];
}

export async function getAllProductionReviewDecisions():Promise<ProductionReviewDecision[]> {
  const {data,error}=await supabase.from('lesson_personalization_review_decisions').select('*');
  if(error)throw error;return (data??[]) as ProductionReviewDecision[];
}

export async function reviewProductionDecision(decisionId:string,outcome:string,finalValue:Record<string,unknown>={},reason:string|null=null){
  const {data,error}=await supabase.rpc('review_production_lesson_metadata_decision',{p_decision_id:decisionId,p_outcome:outcome,p_final_value:finalValue,p_reason:reason,p_review_method:'production_review_assistant'});
  if(error)throw error;return data as ProductionReviewDecision;
}

export async function approveProductionMetadata(metadataId:string){
  const {data,error}=await supabase.rpc('approve_production_lesson_personalization_metadata',{p_metadata_id:metadataId,p_review_method:'production_review_assistant'});
  if(error)throw error;return data as LessonMetadataReviewRow;
}

const PRODUCTION_REAPPROVAL_DECISIONS = new Set(['communication','safety_material','prerequisite','mastery','duplicate_progression']);
const COMPLETE_PRODUCTION_DECISION_STATES = new Set(['resolved_deterministic','human_confirmed','human_edited']);

export function canReapproveProductionMetadata(row:LessonMetadataReviewRow,decisions:ProductionReviewDecision[]){
  const production=row.lesson.quality_status==='approved'&&row.lesson.is_active;
  const currentFingerprint=Boolean(row.content_fingerprint)&&!row.metadata_stale;
  const approvalNeedsRefresh=row.review_status==='needs_review'&&row.approved_content_fingerprint!==row.content_fingerprint;
  const permittedTier=row.review_tier!=='content_dependent';
  const decisionKeys=new Set(decisions.map(decision=>decision.decision_key));
  const decisionsComplete=decisions.length===5&&decisionKeys.size===5&&[...PRODUCTION_REAPPROVAL_DECISIONS].every(key=>decisionKeys.has(key))&&decisions.every(decision=>COMPLETE_PRODUCTION_DECISION_STATES.has(decision.decision_status));
  return production&&currentFingerprint&&approvalNeedsRefresh&&permittedTier&&decisionsComplete&&row.mastery_reviewed&&row.support_level_reviewed&&Boolean(row.support_level)&&row.content_review_status==='approved'&&clientValidation(row).length===0;
}

export async function generatePersonalizationDecisions(lessonId:string){
  const {data,error}=await supabase.rpc('generate_lesson_personalization_decisions',{p_lesson_id:lessonId});
  if(error)throw error;return Number(data??0);
}

export async function reviewDraftPersonalizationMetadata(metadataId:string,patch:Record<string,unknown>,reason:string|null=null){
  const {data,error}=await supabase.rpc('review_draft_lesson_personalization_metadata',{p_metadata_id:metadataId,p_patch:patch,p_review_reason:reason});
  if(error)throw error;return data as LessonMetadataReviewRow;
}

export async function finalizeLessonAndPersonalization(lessonId:string){
  const {data,error}=await supabase.rpc('finalize_lesson_and_personalization',{p_lesson_id:lessonId,p_review_method:'admin_personalization_review'});
  if(error)throw error;return data as {lesson_id:string;lesson_quality_status:string;metadata_review_status:string;support_level:string};
}

export async function getMetadataForLesson(lessonId:string):Promise<LessonMetadataReviewRow|null>{
  const {data,error}=await supabase.from('lesson_personalization_metadata').select(`*,lesson:lesson_library!lesson_id(id,title,description,category,skill_area,stage_number,stage_name,difficulty,quality_status,is_active,pro_only,materials,steps,caregiver_tips,safety_notes,goal,expected_child_response)`).eq('lesson_id',lessonId).eq('metadata_version',1).maybeSingle();
  if(error)throw error;return data as unknown as LessonMetadataReviewRow|null;
}

export function validationInput(row:LessonMetadataReviewRow){return {
  lessonId:row.lesson_id,metadataVersion:row.metadata_version,targetSkillCode:row.target_skill_code,masteryGroup:row.mastery_group,skillStageCode:row.skill_stage_code,
  prerequisiteSkillCodes:row.prerequisite_skill_codes??[],assessmentNeedTags:row.assessment_need_tags??[],supportedResponseModes:row.supported_response_modes??[],
  minCommunicationComplexity:row.min_communication_complexity,maxCommunicationComplexity:row.max_communication_complexity,minIndependenceLevel:row.min_independence_level,maxIndependenceLevel:row.max_independence_level,
  contraindicationTags:row.contraindication_tags??[],materialActivityTags:row.material_activity_tags??[],universalSafeFallback:row.universal_safe_fallback,
  candidateWarnings:row.candidate_warnings??[],communicationReviewed:row.communication_reviewed,safetyReviewed:row.safety_reviewed,prerequisiteReviewed:row.prerequisite_reviewed,prerequisiteReviewState:row.prerequisite_review_state,duplicateReviewed:row.duplicate_reviewed,metadataStale:row.metadata_stale,
};}

export async function saveMetadataReview(id:string, patch:Partial<LessonMetadataReviewRow>, action='save_draft') {
  const {data,error}=await supabase.rpc('review_lesson_personalization_metadata',{p_metadata_id:id,p_patch:patch,p_action:action,p_review_reason:patch.review_reason??null});
  if(error)throw error; return data;
}

export async function approveMetadataBatch(ids:string[]){
  const {data,error}=await supabase.rpc('approve_lesson_personalization_metadata_batch',{p_metadata_ids:ids});
  if(error)throw error; return data as {approved:number;skipped:number;failed:number;results:{id:string;result:string;reasons:string[]}[]};
}

export function clientValidation(row:LessonMetadataReviewRow){return validateLessonMetadata(validationInput(row));}
