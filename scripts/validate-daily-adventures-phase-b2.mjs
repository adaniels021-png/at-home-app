import { contains, excludes, pass, read } from './daily-adventures-validator-utils.mjs';

const route = read('app/(tabs)/activities.tsx');
const home = read('components/activities/DailyAdventuresHomeScreen.tsx');
const explore = read('app/activities/explore.tsx');
const illustration = read('components/activities/ActivityIllustration.tsx');

contains(route, /DailyAdventuresHomeScreen/, 'Approved Daily Adventures home route changed');
contains(home, /Three ideas picked just for your day\./, 'Approved B.2 supporting copy is missing');
excludes(home, /Three personalized ideas/, 'Old personalized supporting copy remains');
contains(home, /\.slice\(0, 3\)/, 'Exactly-three daily presentation changed');
excludes(home, /searchMyActivityLibrary|Load 5 More|TextInput/, 'Catalog returned to Daily Adventures home');
contains(home, /router\.push\('\/activities\/explore'\)/, 'Separate Explore navigation changed');
contains(explore, /exploreHero/, 'Explore hero was removed');
contains(explore, /minHeight: 98/, 'Explore hero does not retain the approved compact height');
contains(explore, /const PAGE_SIZE = 5/, 'Explore page size changed');
contains(explore, /Load 5 More/, 'Load 5 More changed');
excludes(`${home}\n${explore}`, /total (activities|results)|\b33 activities\b|\b500 activities\b/i, 'Family-facing catalog count was introduced');
excludes(`${home}\n${explore}`, /bunbun|bun bun/i, 'Bun Bun was introduced');
contains(illustration, /imageSource\?: ImageSourcePropType/, 'Reusable future illustration integration point is missing');
excludes(`${home}\n${explore}\n${illustration}`, /gemini|generate-ai-asset-image|ai_asset_generation_queue|worksheet-art/i, 'Phase C illustration infrastructure started early');

pass('Daily Adventures Phase B.2 final polish and Phase C boundary contracts');
