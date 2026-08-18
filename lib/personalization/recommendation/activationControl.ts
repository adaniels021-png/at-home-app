export type RecommendationActivationMode='LEGACY'|'SHADOW_V2'|'CONTROLLED_V2'|'V2'|'EMERGENCY_LEGACY';
export type RecommendationActivationConfig={mode:RecommendationActivationMode;algorithmVersion:'phase4m-shadow-v2';emergencyKillSwitch:boolean;controlledCohortPercentage:number;configVersion:number;source:'server'|'safe_default'};
export const SAFE_LEGACY_CONFIG:RecommendationActivationConfig={mode:'LEGACY',algorithmVersion:'phase4m-shadow-v2',emergencyKillSwitch:false,controlledCohortPercentage:0,configVersion:0,source:'safe_default'};
const MODES=new Set<RecommendationActivationMode>(['LEGACY','SHADOW_V2','CONTROLLED_V2','V2','EMERGENCY_LEGACY']);

export function parseActivationConfig(row:unknown):RecommendationActivationConfig{
 const value=row&&typeof row==='object'?row as Record<string,unknown>:{};const mode=String(value.mode??'') as RecommendationActivationMode;
 if(!MODES.has(mode)||value.algorithm_version!=='phase4m-shadow-v2'||typeof value.emergency_kill_switch!=='boolean')return SAFE_LEGACY_CONFIG;
 if(value.emergency_kill_switch||mode==='EMERGENCY_LEGACY')return{...SAFE_LEGACY_CONFIG,mode:'EMERGENCY_LEGACY',emergencyKillSwitch:true,configVersion:Number(value.config_version)||0,source:'server'};
 return{mode,algorithmVersion:'phase4m-shadow-v2',emergencyKillSwitch:false,controlledCohortPercentage:Number(value.controlled_cohort_percentage)||0,configVersion:Number(value.config_version)||0,source:'server'};
}
export async function loadActivationConfig(){try{const{supabase}=await import('../../supabase');const{data,error}=await supabase.from('recommendation_activation_control').select('mode,algorithm_version,emergency_kill_switch,controlled_cohort_percentage,config_version').eq('singleton',true).maybeSingle();if(error||!data)return SAFE_LEGACY_CONFIG;return parseActivationConfig(data);}catch{return SAFE_LEGACY_CONFIG;}}
export type AdminActivationAction={mode:'CONTROLLED_V2';cohortPercentage:25}|{mode:'LEGACY'|'EMERGENCY_LEGACY';cohortPercentage:0};
export async function setAdminActivationControl(action:AdminActivationAction,reason:string){
 if(!reason.trim())throw new Error('An activation change reason is required.');
 const{supabase}=await import('../../supabase');
 const{data,error}=await supabase.rpc('set_recommendation_activation_control',{requested_mode:action.mode,requested_cohort_percentage:action.cohortPercentage,requested_reason:reason.trim()});
 if(error)throw error;
 const config=parseActivationConfig(data);
 if(config.source!=='server'||config.mode!==action.mode||config.controlledCohortPercentage!==action.cohortPercentage)throw new Error('Authoritative activation readback did not match the requested state.');
 return config;
}
export function parentVisibleRoute(config:RecommendationActivationConfig,serverCohortEligible=false):'LEGACY'|'V2'{if(config.emergencyKillSwitch||config.mode==='LEGACY'||config.mode==='SHADOW_V2'||config.mode==='EMERGENCY_LEGACY')return'LEGACY';if(config.mode==='CONTROLLED_V2')return serverCohortEligible?'V2':'LEGACY';return config.mode==='V2'?'V2':'LEGACY';}
