import assert from 'node:assert/strict';
import fs from 'node:fs';

import { normalizeAdminIllustrationState } from '../lib/adminIllustrationState.ts';

const summary = (version, status) => ({
  id: `illustration-${version}`,
  version,
  status,
  source_content_hash: 'hash',
});
const state = (approved, candidate) => ({
  activity_id: 'activity-1',
  current_source_content_hash: 'hash',
  artwork_may_be_outdated: false,
  approved,
  candidate,
});

// A. No history.
assert.deepEqual(normalizeAdminIllustrationState(state(null, null)), state(null, null));

// B. Current failure without approved artwork remains actionable.
assert.equal(normalizeAdminIllustrationState(state(null, summary(1, 'failed'))).candidate?.version, 1);

// C/D/J/O. Historical failures cannot displace newer approved artwork.
for (const failedVersion of [1, 2, 3, 4]) {
  const result = normalizeAdminIllustrationState(
    state(summary(5, 'approved'), summary(failedVersion, 'failed')),
  );
  assert.equal(result.approved?.version, 5);
  assert.equal(result.candidate, null);
}

// E/F. Defensive mapping prevents historical terminal states from becoming active.
for (const terminalStatus of ['rejected', 'superseded', 'approved']) {
  const result = normalizeAdminIllustrationState(
    state(summary(5, 'approved'), summary(4, terminalStatus)),
  );
  assert.equal(result.candidate, null);
}

// G/H. New actionable replacement candidates remain visible beside approved art.
for (const actionableStatus of ['draft', 'generating']) {
  const result = normalizeAdminIllustrationState(
    state(summary(5, 'approved'), summary(6, actionableStatus)),
  );
  assert.equal(result.approved?.version, 5);
  assert.equal(result.candidate?.version, 6);
  assert.equal(result.candidate?.status, actionableStatus);
}

// I. A newer failed replacement remains actionable without displacing approved art.
const failedReplacement = normalizeAdminIllustrationState(
  state(summary(5, 'approved'), summary(6, 'failed')),
);
assert.equal(failedReplacement.approved?.version, 5);
assert.equal(failedReplacement.candidate?.version, 6);
assert.equal(failedReplacement.candidate?.status, 'failed');

const component = fs.readFileSync(
  'components/admin/ActivityIllustrationAdminSection.tsx',
  'utf8',
);
const api = fs.readFileSync('lib/adminActivityIllustrations.ts', 'utf8');

assert.match(api, /return normalizeAdminIllustrationState\(data as AdminIllustrationState\)/);
assert.match(component, /approved \? 'Try Again' : 'Retry Illustration'/);
assert.match(component, /approved \? 'Generate New Illustration' : 'Generate Illustration'/);
assert.match(component, /The approved illustration is still active and family-visible\./);
assert.match(component, /Keep Current Illustration/);

// K/L/M. Refresh, preview, and approval remain distinct non-generation actions.
const refresh = component.slice(component.indexOf('const refresh'), component.indexOf('const run ='));
const preview = component.slice(component.indexOf('const loadPrivatePreview'), component.indexOf('const candidate'));
assert.doesNotMatch(refresh, /generateActivityIllustration/);
assert.doesNotMatch(preview, /generateActivityIllustration/);
assert.match(component, /run\(\(\) => approveActivityIllustration/);
assert.doesNotMatch(
  component.slice(component.indexOf('run(() => approveActivityIllustration'), component.indexOf('<Action label="Reject"')),
  /generateActivityIllustration/,
);

// N. Only the explicit primary generation action invokes generation.
assert.equal((component.match(/generateActivityIllustration\(/g) || []).length, 1);
assert.match(component, /onPress=\{\(\) => void run\([\s\S]*generateActivityIllustration/);

console.log('Daily Adventures current illustration state matrix: PASS');
console.log('Historical failure suppression and replacement-failure UX: PASS');
console.log('Automatic generation paths: 0');
console.log('Real Gemini calls: 0');
