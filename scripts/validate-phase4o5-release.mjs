import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

const read = (name) => JSON.parse(fs.readFileSync(`data/curriculum/${name}`, 'utf8'));
const hash = (name) => crypto.createHash('sha256').update(fs.readFileSync(name)).digest('hex');
const manifest = read('phase4o5-release-manifest-v1.json');
const regression = read('phase4o5-release-regression-v1.json');
const subscription = read('phase4o5-subscription-nonregression-v1.json');
const router = read('phase4o5-router-release-validation-v1.json');
const build = read('phase4o5-build-readiness-v1.json');
const post = read('phase4o5-postrelease-validation-plan-v1.json');

assert.equal(manifest.productionState.mode, 'LEGACY');
assert.equal(manifest.productionState.cohortPercentage, 0);
assert.equal(manifest.productionState.parentV2Exposure, false);
for (const file of manifest.requiredForPhase4ORelease) assert(fs.existsSync(file), `missing release file ${file}`);
for (const file of manifest.requiredDependenciesAndProtectedReplay) assert(fs.existsSync(file), `missing dependency ${file}`);
for (const file of manifest.alreadyDeployedServerArtifacts) assert(fs.existsSync(file), `missing server artifact ${file}`);
assert(!manifest.requiredForPhase4ORelease.some((file) => file.startsWith('app/help-now/') || file.startsWith('app/safety/') || file.startsWith('app/admin/')));

assert.equal(regression.routing.telemetryInfluencesRouting, false);
assert.equal(regression.protectedHashes.phase4eShadowV1, hash('lib/personalization/recommendation/scoring.ts'));
assert.equal(regression.protectedHashes.phase4mShadowV2, hash('lib/personalization/recommendation/scoringV2.ts'));
assert.equal(regression.protectedHashes.phase4jCrosswalk, hash('data/curriculum/phase4j-assessment-canonical-crosswalk-v1.json'));
assert.equal(subscription.result, 'PASS');
assert(Object.values(subscription.diffAudit).every((changed) => changed === false));
assert.deepEqual(router.expectedReleasedLegacyEvent, { route: 'LEGACY', reasonCode: 'LEGACY_MODE', outcome: 'LEGACY_SELECTION' });
assert.equal(router.liveEventFabricated, false);
assert.equal(build.classification, 'READY');
assert.deepEqual(build.environmentNames.requiredButMissingInEasProduction, []);
assert.equal(post.steps.length, 7);
assert(post.rollback.server.includes('EMERGENCY_LEGACY'));

const daily = fs.readFileSync('app/(tabs)/daily-lessons.tsx', 'utf8');
const queue = fs.readFileSync('lib/lessonQueue.ts', 'utf8');
const telemetry = fs.readFileSync('lib/personalization/recommendation/router.ts', 'utf8');
assert(daily.indexOf('getOpenDailyLessonInstance') < daily.indexOf('resolveServerRecommendationRoute'));
assert(daily.includes('if (!libraryLesson)'));
assert(queue.includes('getOpenDailyLessonInstance'));
assert(telemetry.includes('Operational telemetry is best-effort'));

console.log(JSON.stringify({
  valid: true,
  releaseFiles: manifest.requiredForPhase4ORelease.length,
  protectedDependencies: manifest.requiredDependenciesAndProtectedReplay.length,
  subscriptionNonregression: true,
  exports: regression.exports,
  classification: build.classification,
}, null, 2));
