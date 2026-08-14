import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const read=(name)=>JSON.parse(fs.readFileSync(`data/curriculum/${name}`,'utf8'));
const baseline=read('phase4m-pro-baseline-v1.json'),contract=read('phase4m-ranking-contract-v2.json'),results=read('phase4m-shadow-v2-results-v1.json'),pairs=read('phase4m-controlled-pairs-v1.json'),regression=read('phase4m-regression-v1.json');
assert.equal(baseline.trialProProfiles,25);assert.equal(baseline.top1.strong,7);assert.equal(baseline.top1.acceptable,17);assert.equal(baseline.top1.questionable,1);assert.equal(baseline.directCanonicalTargetTop1,23);
assert.equal(contract.algorithmVersion,'phase4m-shadow-v2');assert.equal(contract.parentConsumer,false);assert.equal(contract.timeEligibility,false);assert.equal(results.profileCount,50);assert.equal(regression.freeEntitlementControl,'ENTITLEMENT_CONTROL_PASSED');assert.equal(regression.determinism.passed,true);assert.equal(regression.production.databaseWrites,0);assert.equal(regression.production.activePrimaryMappings,0);assert.equal(regression.safety.readinessEligibilityUnchanged,true);
const byId=new Map(pairs.pairs.map((pair)=>[pair.id,pair]));
assert.deepEqual(byId.get('speech_aac_parity').after.base.top10.map((x)=>x.lessonId),byId.get('speech_aac_parity').after.variant.top10.map((x)=>x.lessonId));
assert.notEqual(byId.get('support_more_less').after.base.top10[0].lessonId,byId.get('support_more_less').after.variant.top10[0].lessonId);
assert(byId.get('interest_none_bubbles').after.variant.top10.some((x)=>x.reasons.some((reason)=>reason.code==='interest_match')));
assert.equal(byId.get('self_advocacy_exact').after.variant.top10[0].skill,'communication.self_advocacy');
assert.equal(byId.get('broad_vs_exact_matching').after.variant.top10[0].skill,'learning.matching');
assert.equal(byId.get('explicit_bedtime_over_clock').after.variant.top10[0].skill,'routines.bedtime_preparation');
assert(byId.get('restriction_loud').after.variant.eligiblePool<=byId.get('restriction_loud').after.base.eligiblePool);
assert.notEqual(byId.get('recency').after.base.top10[0].lessonId,byId.get('recency').after.variant.top10[0].lessonId);
const v1Hash=crypto.createHash('sha256').update(fs.readFileSync('lib/personalization/recommendation/scoring.ts')).digest('hex');assert.equal(v1Hash,'be6fe07f503c74c05c5be0557ee249ca8da42bab392f40638d7fe1f12caf5284');
console.log(JSON.stringify({valid:true,profiles:50,pairs:pairs.count,algorithm:contract.algorithmVersion,free:regression.freeEntitlementControl,determinism:true,v1Unchanged:true},null,2));
