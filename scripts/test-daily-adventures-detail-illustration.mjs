import assert from 'node:assert/strict';
import fs from 'node:fs';

const illustration = fs.readFileSync(
  'components/activities/ActivityIllustration.tsx',
  'utf8',
);
const detail = fs.readFileSync('app/activities/[activityId].tsx', 'utf8');
const explore = fs.readFileSync('app/activities/explore.tsx', 'utf8');
const today = fs.readFileSync(
  'components/activities/DailyAdventuresHomeScreen.tsx',
  'utf8',
);

assert.match(illustration, /detail\?: boolean/);
assert.match(illustration, /compact \? styles\.compact : detail \? styles\.detail : styles\.full/);
assert.match(illustration, /detail: \{ width: '100%', aspectRatio: 4 \/ 3 \}/);
assert.match(illustration, /resizeMode="cover"/);
assert.match(illustration, /image: \{ width: '100%', height: '100%' \}/);
assert.match(illustration, /overflow: 'hidden'/);
assert.match(illustration, /borderRadius: 24/);

assert.match(detail, /<ActivityIllustration[\s\S]*?category=\{activity\.category\}[\s\S]*?detail[\s\S]*?imageSource=/);
assert.equal((detail.match(/\bdetail\b/g) || []).length, 1);
assert.match(detail, /activity\.illustration_url \? \{ uri: activity\.illustration_url \} : undefined/);
assert.match(detail, /snapshot\.illustration_url/);

assert.doesNotMatch(explore, /<ActivityIllustration[^>]*\bdetail\b/);
assert.match(explore, /<ActivityIllustration[^>]*\bcompact\b/);
assert.doesNotMatch(today, /<ActivityIllustration[^>]*\bdetail\b/);
assert.match(today, /style=\{styles\.featuredArt\}/);

assert.match(illustration, /onError=\{\(\) => setFailedSourceKey\(sourceKey\)\}/);
assert.match(illustration, /failedSourceKey !== sourceKey/);
assert.match(illustration, /<Ionicons/);
assert.doesNotMatch(detail + illustration, /draft_storage_path|generateActivityIllustration|Gemini/i);

console.log('Daily Adventures detail illustration framing: PASS');
console.log('Detail-only responsive 4:3 cover; Explore and Today variants unchanged: PASS');
console.log('Approved URL and broken-image category fallback contracts: PASS');
console.log('Real Gemini calls: 0');
