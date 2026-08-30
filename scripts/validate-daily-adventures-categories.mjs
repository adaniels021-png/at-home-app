import { assert, contains, excludes, pass, read } from './daily-adventures-validator-utils.mjs';

const categorySource = read('lib/activityCategories.ts');
const sql = read('supabase/migrations/20260830120000_daily_adventures_phase_a_foundation.sql');
const canonical = ['home', 'outdoor', 'community', 'movement', 'sensory', 'creative', 'calm'];

for (const category of canonical) {
  contains(categorySource, new RegExp(`'${category}'`), `Missing canonical category ${category}`);
}

assert((categorySource.match(/At Home/g) || []).length === 1, 'At Home display label is missing or duplicated');
contains(categorySource, /movement: 'Movement'/, 'Movement label is not canonical');
excludes(categorySource.match(/ACTIVITY_CATEGORIES = \[[\s\S]*?\] as const/)?.[0] || '', /surprise/, 'Surprise is stored as a canonical category');
contains(categorySource, /throw new Error\(`Invalid activity category:/, 'Invalid categories do not fail explicitly');
contains(sql, /activity_library_category_canonical/, 'Library category constraint is missing');
contains(sql, /activity_queue_category_canonical/, 'Queue category constraint is missing');
contains(sql, /Invalid activity_library categories must be reviewed explicitly/, 'Migration does not fail on unknown library values');

pass('Canonical activity category contract');
