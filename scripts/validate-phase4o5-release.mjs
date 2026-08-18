import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

const read = (name) => JSON.parse(fs.readFileSync(`data/curriculum/${name}`, 'utf8'));
const hash = (name) => crypto.createHash('sha256').update(fs.readFileSync(name)).digest('hex');
const historicalManifest = read('phase4o5-release-manifest-v1.json');
const manifest = read('phase4o5-release-manifest-v2.json');
const regression = read('phase4o5-release-regression-v2.json');
const subscription = read('phase4o5-subscription-nonregression-v2.json');
const router = read('phase4o5-router-release-validation-v2.json');
const build = read('phase4o5-build-readiness-v2.json');
const post = read('phase4o5-postrelease-validation-plan-v2.json');

assert.equal(historicalManifest.productionState.mode, 'LEGACY');
assert.equal(historicalManifest.productionState.cohortPercentage, 0);
assert.equal(manifest.release, '1.0.9');
assert.equal(manifest.productionState.source, 'CURRENT_OWNER_CONFIRMED');
assert.equal(manifest.productionState.mode, 'CONTROLLED_V2');
assert.equal(manifest.productionState.cohortPercentage, 25);
assert.equal(manifest.productionState.mutationPerformedByReleaseReconciliation, false);
for (const file of manifest.requiredExactFiles) assert(fs.existsSync(file), `missing 1.0.9 release file ${file}`);
const localMigrationVersions = new Set(
  fs.readdirSync('supabase/migrations')
    .map((name) => name.match(/^(\d{14})_.*\.sql$/)?.[1])
    .filter(Boolean)
);
for (const version of manifest.reconciledRemoteMigrationVersions) {
  assert(localMigrationVersions.has(version), `missing deployed migration source ${version}`);
}
for (const scope of ['app/help-now/**', 'app/safety/**', 'app/admin/**', 'components/AdminRouteGate.tsx']) {
  assert(manifest.includedScope.includes(scope), `approved scope missing from manifest: ${scope}`);
}
assert(manifest.excludedScope.includes('Bun Bun World runtime/game functionality'));
assert(!fs.existsSync('.bash_history'), 'shell history must not be present in the release candidate');
assert(fs.readFileSync('.easignore', 'utf8').split(/\r?\n/).includes('.bash_history'));
assert(fs.readFileSync('.easignore', 'utf8').split(/\r?\n/).includes('.npm/'));
const appRoutes = fs.readdirSync('app', { recursive: true })
  .filter((name) => typeof name === 'string')
  .map((name) => name.toLowerCase());
for (const forbiddenRoute of ['phase9f2a', 'storage-test', 'sunny-valley', 'bun-bun-world']) {
  assert(!appRoutes.some((name) => name.includes(forbiddenRoute)), `forbidden runtime route ${forbiddenRoute}`);
}
const adminLayout = fs.readFileSync('app/admin/_layout.tsx', 'utf8');
const adminGate = fs.readFileSync('components/AdminRouteGate.tsx', 'utf8');
const adminAccess = fs.readFileSync('lib/adminAccess.ts', 'utf8');
const settings = fs.readFileSync('app/(tabs)/settings.tsx', 'utf8');
assert(adminLayout.includes('<AdminRouteGate>'));
assert(adminGate.includes('if (!isAdmin)'));
assert(adminAccess.includes("supabase.rpc('is_app_admin')"));
assert(settings.includes('{isAppAdmin ? ('));

assert.equal(regression.routing.telemetryInfluencesRouting, false);
assert.equal(regression.protectedHashes.phase4eShadowV1, hash('lib/personalization/recommendation/scoring.ts'));
assert.equal(regression.protectedHashes.phase4mShadowV2, hash('lib/personalization/recommendation/scoringV2.ts'));
assert.equal(regression.protectedHashes.phase4jCrosswalk, hash('data/curriculum/phase4j-assessment-canonical-crosswalk-v1.json'));
assert.equal(subscription.result, 'PASS');
assert(Object.values(subscription.commerceDiffAudit).every((changed) => changed === false));
assert.equal(subscription.approvedInfrastructureChanges.authoritativeReconciliationClient, true);
assert.equal(router.productionState.mode, 'CONTROLLED_V2');
assert.equal(router.productionState.cohortPercentage, 25);
assert.equal(router.expectedOutcomes.free, 'LEGACY');
assert.equal(router.expectedOutcomes.unknown, 'LEGACY');
assert.equal(router.expectedOutcomes.trialOrProInsideCohort, 'CONTROLLED_V2');
assert.equal(router.telemetryInfluencesSelection, false);
assert.equal(router.liveEventFabricated, false);
assert.equal(build.release, '1.0.9');
assert.equal(build.classification, 'READY_PENDING_FINAL_BUILD_GATE');
assert.equal(build.eas.appVersionSource, 'remote');
assert.equal(build.ios.currentRemoteBuild, '48');
assert.equal(build.ios.expectedNextBuild, '49');
assert.equal(build.android.currentRemoteVersionCode, 25);
assert.equal(build.android.expectedNextVersionCode, 26);
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
  release: manifest.release,
  releaseFiles: manifest.requiredExactFiles.length,
  approvedScopeEntries: manifest.includedScope.length,
  subscriptionNonregression: true,
  productionState: {
    source: manifest.productionState.source,
    mode: manifest.productionState.mode,
    cohortPercentage: manifest.productionState.cohortPercentage,
  },
  exports: regression.exports,
  classification: build.classification,
}, null, 2));
