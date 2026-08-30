import { contains, excludes, pass, read } from './daily-adventures-validator-utils.mjs';

const route = read('app/(tabs)/activities.tsx');
const home = read('components/activities/DailyAdventuresHomeScreen.tsx');
const explore = read('app/activities/explore.tsx');
const detail = read('app/activities/[activityId].tsx');
const saved = read('app/(tabs)/saved.tsx');
const api = read('lib/dailyAdventuresApi.ts');
const categories = read('lib/activityCategories.ts');
const family = `${home}\n${explore}\n${detail}`;

contains(route, /DailyAdventuresHomeScreen/, 'Daily Adventures does not use the separated home screen');
excludes(home, /searchMyActivityLibrary|TextInput|FlatList|Load 5 More/, 'Home still contains or requests the activity catalog');
contains(home, /router\.push\('\/activities\/explore'\)/, 'Home does not navigate to the dedicated Explore route');
contains(home, /\.slice\(0, 3\)/, 'Home is not capped to exactly three server assignments');
contains(home, /getMyDailyAdventures\(childId\)/, 'Home does not use secure daily assignments');
contains(home, /if \(!childId \|\| !isPro \|\| entitlementLoading \|\| surpriseLoading\) return/, 'Free Surprise guard is missing');
contains(home, /Start 14-Day Free Trial/, 'Free locked Explore destination is missing');

contains(explore, /useChildSubscription/, 'Explore does not use authoritative selected-child entitlement');
contains(explore, /if \(!childId \|\| entitlementLoading \|\| !isPro\) return/, 'Explore can request the catalog without Pro access');
contains(explore, /if \(!selectedChild \|\| !isPro\)/, 'Direct Free Explore state is not gated');
contains(explore, /const PAGE_SIZE = 5/, 'Explore page size is not five');
contains(explore, /limit: PAGE_SIZE/, 'Explore does not send five as the server page size');
contains(explore, /Load 5 More/, 'Load 5 More affordance is missing');
contains(explore, /loadingMoreRef\.current/, 'Concurrent load-more protection is missing');
contains(explore, /setResults\(\[\]\)/, 'Pagination/results reset is missing');
contains(explore, /\[category, childId, debouncedQuery/, 'Search/category/child changes do not reset the first page');
contains(explore, /uniqueByStableId/, 'Stable activity ID deduplication is missing');
contains(explore, /new Set\(current\.map\(\(item\) => item\.id\)\)/, 'Deduplication is not based on stable library ID');
contains(explore, /afterTitle: cursor\?\.title[\s\S]*afterId: cursor\?\.id/, 'Cursor pagination is missing');
contains(explore, /setTimeout\(\(\) => setDebouncedQuery\(query\.trim\(\)\), 350\)/, 'Search debounce is missing');

contains(detail, /getMyActivityDetail\(childId, activityId\)/, 'Stable-ID detail was not preserved');
contains(detail, /getMySavedActivitySnapshot\(childId, savedActivityId\)/, 'Retained saved history was not preserved');
contains(saved, /pathname: '\/activities\/\[activityId\]'/, 'Saved stable-ID navigation was not preserved');
contains(api, /page_size: input\.limit \|\| 5/, 'API fallback page size is not five');

for (const label of ['All', 'At Home', 'Outdoor', 'Community', 'Movement', 'Sensory', 'Creative', 'Calm']) {
  contains(`${explore}\n${categories}`, new RegExp(label), `Missing canonical filter ${label}`);
}
excludes(explore, /['"]Surprise['"]|['"]Active['"]/, 'Explore contains a Surprise or Active filter');
excludes(family, /total (activities|results)|\b33 activities\b|\b500 activities\b|page \d+ of \d+/i, 'Family-facing catalog total is present');
excludes(family, /bunbun|bun bun/i, 'Bun Bun appears in Daily Adventures');
contains(explore, /accessibilityState=\{\{ selected \}\}/, 'Category selected state is not accessible');
contains(explore, /accessibilityState=\{\{ disabled: loadingMore \}\}/, 'Load-more disabled state is not accessible');

pass('Daily Adventures Phase B.1 separated discovery and five-at-a-time contracts');
