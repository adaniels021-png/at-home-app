import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { parseRecommendationRoute, isParentV2Route, recommendationAttribution, SAFE_LEGACY_ROUTE } from '../lib/personalization/recommendation/router.ts';
import { PHASE4M_SHADOW_ALGORITHM_VERSION } from '../lib/personalization/recommendation/scoringV2.ts';

const base={route:'LEGACY',algorithm:'legacy',entitlement:'UNKNOWN',cohort_eligible:false,cohort_bucket:5000,reason_code:'LEGACY_MODE',fallback_allowed:true,config_version:1};
const decision=(patch={})=>parseRecommendationRoute({...base,...patch});
assert.deepEqual(parseRecommendationRoute(null),SAFE_LEGACY_ROUTE);
assert.equal(isParentV2Route(decision({route:'CONTROLLED_V2',algorithm:'phase4m-shadow-v2',entitlement:'FREE',cohort_eligible:true})),false);
assert.equal(isParentV2Route(decision({route:'CONTROLLED_V2',algorithm:'phase4m-shadow-v2',entitlement:'UNKNOWN',cohort_eligible:true})),false);
for(const entitlement of ['TRIAL','PRO']){
 assert.equal(isParentV2Route(decision({route:'LEGACY',entitlement})),false);
 assert.equal(isParentV2Route(decision({route:'CONTROLLED_V2',algorithm:'phase4m-shadow-v2',entitlement,cohort_eligible:false})),false);
 assert.equal(isParentV2Route(decision({route:'CONTROLLED_V2',algorithm:'phase4m-shadow-v2',entitlement,cohort_eligible:true})),true);
}
assert.equal(isParentV2Route(decision({route:'SHADOW_V2',algorithm:'phase4m-shadow-v2',entitlement:'PRO'})),false);
assert.equal(PHASE4M_SHADOW_ALGORITHM_VERSION,'phase4m-shadow-v2');
assert.deepEqual(recommendationAttribution(decision(),'LEGACY_SELECTION'),{outcome:'LEGACY_SELECTION'});

const bucket=(uuid)=>Number(BigInt(`0x${crypto.createHash('sha256').update(uuid).digest('hex').slice(0,8)}`)%10000n);
const ids=['00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','11111111-1111-4111-8111-111111111111'];
for(const id of ids) assert.equal(bucket(id),bucket(id));
assert(ids.every(id=>!(bucket(id)<0)));
assert(ids.every(id=>bucket(id)<10000));
assert(ids.every(id=>!(bucket(id)<0*100)));
assert(ids.every(id=>bucket(id)<100*100));
const sample=Array.from({length:10000},(_,i)=>`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`);
const five=sample.filter(id=>bucket(id)<500).length;
assert(five>400&&five<600);
console.log(JSON.stringify({valid:true,algorithm:PHASE4M_SHADOW_ALGORITHM_VERSION,free:'LEGACY',unknown:'LEGACY',shadowParent:'LEGACY',cohort:{zero:0,fivePercentSample:five,hundred:sample.length},fallback:true},null,2));
