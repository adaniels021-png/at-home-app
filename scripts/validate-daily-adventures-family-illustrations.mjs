import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const home = read('components/activities/DailyAdventuresHomeScreen.tsx');
const explore = read('app/activities/explore.tsx');
const legacyExplore = read('components/activities/DailyAdventuresScreen.tsx');
const detail = read('app/activities/[activityId].tsx');
const illustration = read('components/activities/ActivityIllustration.tsx');
const api = read('lib/dailyAdventuresApi.ts');
const foundation = read('supabase/migrations/20260831120000_daily_adventures_activity_illustration_foundation.sql');

assert.match(home, /item\.illustration_url \? \{ uri: item\.illustration_url \} : undefined/);
assert.match(explore, /item\.illustration_url \? \{ uri: item\.illustration_url \} : undefined/);
assert.equal((legacyExplore.match(/item\.illustration_url \? \{ uri: item\.illustration_url \} : undefined/g) || []).length, 2);
assert.match(detail, /activity\.illustration_url \? \{ uri: activity\.illustration_url \} : undefined/);
assert.match(detail, /snapshot\.illustration_url/);
assert.match(illustration, /onError=\{\(\) => setFailedSourceKey\(sourceKey\)\}/);
assert.match(illustration, /failedSourceKey !== sourceKey/);
assert.match(api, /illustration_url: string \| null/);
assert.match(api, /get_my_surprise_activity/);
assert.match(api, /page_size: input\.limit \|\| 5/);
assert.match(foundation, /illustration\.id = activity\.approved_illustration_id and illustration\.status = 'approved'/i);
assert.doesNotMatch(home + explore + detail, /draft_storage_path|illustration_id|generation_reason/);

console.log('Daily Adventures family illustration wiring: PASS');
console.log('Approved-only URLs, category fallback, and broken-image fallback: PASS');
