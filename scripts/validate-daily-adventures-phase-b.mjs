import { assert, contains, excludes, pass, read } from './daily-adventures-validator-utils.mjs';

const route = read('app/(tabs)/activities.tsx');
const screen = read('components/activities/DailyAdventuresHomeScreen.tsx');
const explore = read('app/activities/explore.tsx');
const detail = read('app/activities/[activityId].tsx');
const saved = read('app/(tabs)/saved.tsx');
const categories = read('lib/activityCategories.ts');
const combinedFamilyUi = `${screen}\n${explore}\n${detail}`;

contains(route, /export \{ default \} from '\.\.\/\.\.\/components\/activities\/DailyAdventuresHomeScreen'/,
  'The family route does not default to the Phase B screen');
contains(screen, /getMyDailyAdventures\(childId\)/, 'Daily assignments do not use the secure RPC helper');
contains(screen, /\.slice\(0, 3\)/, 'The daily presentation is not capped to the three server assignments');
contains(screen, /ordered\.length !== 3/, 'Incomplete daily assignment state is not handled');
contains(explore, /if \(!childId \|\| entitlementLoading \|\| !isPro\) return/, 'Free users are not guarded from library requests');
contains(screen, /if \(!childId \|\| !isPro \|\| entitlementLoading \|\| surpriseLoading\) return/, 'Free users are not guarded from Surprise requests');
contains(explore, /searchMyActivityLibrary/, 'Trial\/Pro library does not use secure search');
contains(explore, /PAGE_SIZE = 5/, 'Library pagination does not use the approved five-item page size');
contains(explore, /afterTitle: cursor\?\.title[\s\S]*afterId: cursor\?\.id/, 'Library cursor pagination is missing');
contains(explore, /requestRef\.current \+= 1[\s\S]*setResults\(\[\]\)/, 'Selected-child stale catalog clearing is missing');
contains(explore, /setTimeout\(\(\) => setDebouncedQuery\(query\.trim\(\)\), 350\)/, 'Search is not debounced');
contains(explore, /FlatList/, 'The scalable vertical library is not virtualized');
excludes(screen, /horizontal[\s\S]*pagingEnabled|snapToInterval|CARD_WIDTH/, 'The Phase B screen still contains the giant horizontal carousel');
excludes(screen, /Try This|Why It Helps/, 'Full activity instructions remain on the family home/list screen');

for (const label of ['All', 'At Home', 'Outdoor', 'Community', 'Movement', 'Sensory', 'Creative', 'Calm']) {
  assert(explore.includes(label) || categories.includes(label), `Missing canonical family label ${label}`);
}
excludes(categories, /movement: 'Active'/, 'Movement is still labeled Active');
excludes(explore, /FILTERS[^;]*surprise|id:\s*['"]surprise/i, 'Surprise is treated as a stored category/filter');

contains(screen, /pathname: '\/activities\/\[activityId\]'/, 'Home/list navigation does not use stable activity IDs');
contains(detail, /getMyActivityDetail\(childId, activityId\)/, 'Detail does not use the secure detail helper');
contains(detail, /getMySavedActivitySnapshot\(childId, savedActivityId\)/, 'Retained snapshot fallback is missing');
contains(detail, /setMyActivityState\(childId, activity\.id, update\)/, 'Detail state writes do not use the secure RPC');
contains(saved, /pathname: '\/activities\/\[activityId\]'/, 'Saved stable-ID detail navigation is missing');

excludes(combinedFamilyUi, /\b33\b|\b500\b|total activities|results count|Explore all \d+/i,
  'A family-facing library total/count is present');
excludes(combinedFamilyUi, /bunbun|bun bun/i, 'Bun Bun is referenced by Daily Adventures family UI');
contains(screen, /Start 14-Day Free Trial/, 'Free locked Explore CTA is missing');
contains(screen, /accessibilityRole="button"/, 'Family actions lack explicit accessibility roles');

pass('Daily Adventures Phase B family access, routing, scalability, and presentation contracts');
