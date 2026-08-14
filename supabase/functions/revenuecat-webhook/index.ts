// eslint-disable-next-line import/no-unresolved
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { normalizeRevenueCatEvent, type RevenueCatEvent } from './normalize.ts';

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});

if(import.meta.main)Deno.serve(async req=>{
 if(req.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405);
 const expected=Deno.env.get('REVENUECAT_WEBHOOK_AUTHORIZATION');
 if(!expected||req.headers.get('authorization')!==expected)return json({error:'UNAUTHORIZED'},401);
 let payload:RevenueCatEvent;try{payload=await req.json();}catch{return json({error:'INVALID_JSON'},400);}
 const normalized=normalizeRevenueCatEvent((payload.event??{}) as RevenueCatEvent,Deno.env.get('REVENUECAT_ENTITLEMENT_ID')||'pro');
 if(!normalized.accepted)return json({received:true,result:normalized.reason});
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized.appUserId))return json({error:'UNMAPPABLE_APP_USER_ID'},422);
 const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!url||!key)return json({error:'SERVER_CONFIGURATION'},500);const db=createClient(url,key,{auth:{persistSession:false}});
 const{data:user}=await db.auth.admin.getUserById(normalized.appUserId);if(!user?.user)return json({error:'UNMAPPABLE_APP_USER_ID'},422);
 const{data:existingEvent}=await db.from('revenuecat_webhook_events').select('event_id').eq('event_id',normalized.id).maybeSingle();if(existingEvent)return json({received:true,result:'DUPLICATE'});
 const{data:current}=await db.from('revenuecat_entitlement_state').select('last_event_at').eq('user_id',normalized.appUserId).maybeSingle();const stale=Boolean(current?.last_event_at&&Date.parse(current.last_event_at)>normalized.eventMs);
 if(!stale)await db.from('revenuecat_entitlement_state').upsert({user_id:normalized.appUserId,state:normalized.state,entitlement_id:normalized.entitlementId,product_id:normalized.productId,store:normalized.store,environment:normalized.environment,entitlement_active:normalized.active,period_type:normalized.periodType,expires_at:normalized.expirationAt,auto_renewing:normalized.autoRenewing,billing_issue_detected:normalized.billingIssue,last_event_id:normalized.id,last_event_type:normalized.type,last_event_at:normalized.eventAt,last_synced_at:new Date().toISOString(),updated_at:new Date().toISOString()},{onConflict:'user_id'});
 await db.from('revenuecat_webhook_events').insert({event_id:normalized.id,user_id:normalized.appUserId,event_type:normalized.type,event_at:normalized.eventAt,processing_result:stale?'STALE':'APPLIED'});
 return json({received:true,result:stale?'STALE':'APPLIED'});
});
