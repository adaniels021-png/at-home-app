export type RevenueCatEvent=Record<string,unknown>;
const asString=(v:unknown)=>typeof v==='string'&&v.trim()?v.trim():null;
const asMillis=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?v:null;
const iso=(ms:number|null)=>ms===null?null:new Date(ms).toISOString();
const ACTIVE=new Set(['INITIAL_PURCHASE','RENEWAL','UNCANCELLATION','SUBSCRIPTION_EXTENDED','REFUND_REVERSED']);
const PRESERVE=new Set(['CANCELLATION','BILLING_ISSUE','PRODUCT_CHANGE','SUBSCRIPTION_PAUSED']);
export function normalizeRevenueCatEvent(event:RevenueCatEvent,entitlementId='pro',nowMs=Date.now()){
 const type=asString(event.type),id=asString(event.id),appUserId=asString(event.app_user_id),eventMs=asMillis(event.event_timestamp_ms),expirationMs=asMillis(event.expiration_at_ms),period=asString(event.period_type),entitlements=Array.isArray(event.entitlement_ids)?event.entitlement_ids.filter(x=>typeof x==='string'):[];
 if(!type||!id||!appUserId||eventMs===null)return{accepted:false,reason:'MALFORMED'} as const;
 if(!entitlements.includes(entitlementId)&&asString(event.entitlement_id)!==entitlementId)return{accepted:false,reason:'UNRELATED_ENTITLEMENT',id,type,appUserId,eventMs} as const;
 const expired=expirationMs!==null&&expirationMs<=nowMs;let active=ACTIVE.has(type)&&!expired,state:'FREE'|'TRIAL'|'PRO'=period==='TRIAL'?'TRIAL':'PRO';
 if(type==='EXPIRATION'){active=false;state='FREE';}if(PRESERVE.has(type)){active=!expired;state=active?(period==='TRIAL'?'TRIAL':'PRO'):'FREE';}
 if(!ACTIVE.has(type)&&!PRESERVE.has(type)&&type!=='EXPIRATION')return{accepted:false,reason:'IGNORED_EVENT',id,type,appUserId,eventMs} as const;
 return{accepted:true,id,type,appUserId,eventMs,eventAt:iso(eventMs)!,expirationAt:iso(expirationMs),state:active?state:'FREE',active,entitlementId,productId:asString(event.product_id),store:asString(event.store),environment:asString(event.environment)||'PRODUCTION',periodType:period,autoRenewing:!['CANCELLATION','SUBSCRIPTION_PAUSED'].includes(type),billingIssue:type==='BILLING_ISSUE'} as const;
}
