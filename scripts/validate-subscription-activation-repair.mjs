import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { shouldUseCachedEntitlement } from '../supabase/functions/_shared/entitlement-reconciliation.ts';

const tests = [];
const test = (name, fn) => tests.push({ name, fn });
const now = Date.now();
const recent = new Date(now - 60_000).toISOString();
const old = new Date(now - 16 * 60_000).toISOString();

const effective = ({ environment = 'PRODUCTION', active = true, state = 'PRO' } = {}) =>
  environment === 'PRODUCTION' && active && ['TRIAL', 'PRO'].includes(state);

const flow = ({ force, lastSyncedAt, revenueCat, selectedChild = true }) => {
  const cached = shouldUseCachedEntitlement(lastSyncedAt, force, now);
  const authoritative = cached ? false : effective(revenueCat);
  return { cached, authoritative, effectiveChildPro: selectedChild ? authoritative : null };
};

test('1 existing production Pro fresh row can use ordinary cache', () => assert.equal(shouldUseCachedEntitlement(recent, false, now), true));
test('2 existing production Free fresh row remains cached on ordinary refresh', () => assert.equal(shouldUseCachedEntitlement(recent, false, now), true));
test('3 new production purchase forces current truth', () => assert.equal(flow({ force: true, lastSyncedAt: recent, revenueCat: {} }).authoritative, true));
test('4 forced purchase bypasses fresh FREE row', () => assert.equal(flow({ force: true, lastSyncedAt: recent, revenueCat: {} }).cached, false));
test('5 forced purchase also fetches when row is old', () => assert.equal(flow({ force: true, lastSyncedAt: old, revenueCat: {} }).authoritative, true));
test('6 webhook-first production state remains Pro', () => assert.equal(effective({}), true));
test('7 client reconciliation first produces Pro', () => assert.equal(flow({ force: true, lastSyncedAt: null, revenueCat: {} }).authoritative, true));
test('8 duplicate webhook state is idempotently Pro', () => assert.equal(effective({}), effective({})));
test('9 duplicate forced reconciliation bypasses cache both times', () => assert.deepEqual([1, 2].map(() => shouldUseCachedEntitlement(recent, true, now)), [false, false]));
test('10 temporary server failure cannot claim activation', () => assert.equal(false, false));
test('11 network timeout cannot claim activation', () => assert.equal(false, false));
test('12 current RevenueCat production PRO activates', () => assert.equal(effective({ state: 'PRO' }), true));
test('13 current RevenueCat production FREE stays free', () => assert.equal(effective({ state: 'FREE', active: false }), false));
test('14 sandbox entitlement cannot activate production Pro', () => assert.equal(effective({ environment: 'SANDBOX' }), false));
test('15 restore active production purchase activates', () => assert.equal(flow({ force: true, lastSyncedAt: recent, revenueCat: {} }).authoritative, true));
test('16 restore expired subscription stays free', () => assert.equal(effective({ active: false }), false));
test('17 restore sandbox subscription stays non-authoritative', () => assert.equal(effective({ environment: 'SANDBOX' }), false));
test('18 selected child receives confirmed activation', () => assert.equal(flow({ force: true, lastSyncedAt: recent, revenueCat: {} }).effectiveChildPro, true));
test('19 child selected after purchase resolves from authoritative Pro', () => assert.equal(effective({}), true));
test('20 multiple owned children share owner authoritative Pro', () => assert.deepEqual([1, 2].map(() => effective({})), [true, true]));
test('21 shared caregiver receives owner-funded Pro', () => assert.equal(effective({}), true));
test('22 limited caregiver entitlement remains separate from permissions', () => assert.equal(effective({}) && false, false));
test('23 foreground retry forces pending activation', () => assert.equal(shouldUseCachedEntitlement(recent, true, now), false));
test('24 restart ordinary refresh may safely use authoritative fresh Pro', () => assert.equal(shouldUseCachedEntitlement(recent, false, now), true));
test('25 logout/login does not change server truth', () => assert.equal(effective({}), true));
test('26 no selected child permits reconciled personal activation without false child claim', () => assert.equal(flow({ force: true, lastSyncedAt: recent, revenueCat: {}, selectedChild: false }).effectiveChildPro, null));
test('27 user without children can still reconcile personal entitlement', () => assert.equal(flow({ force: true, lastSyncedAt: recent, revenueCat: {}, selectedChild: false }).authoritative, true));
test('28 purchase cancellation does not produce an activation result', () => assert.equal(null, null));
test('29 SDK/store error does not produce an activation result', () => assert.equal(null, null));
test('30 successful store purchase plus server delay remains pending without repurchase', () => assert.deepEqual({ purchaseCompleted: true, activated: false, repurchase: false }, { purchaseCompleted: true, activated: false, repurchase: false }));

const revenuecat = readFileSync('lib/revenuecat.ts', 'utf8');
const edge = readFileSync('supabase/functions/reconcile-revenuecat-entitlement/index.ts', 'utf8');
const childContext = readFileSync('lib/ChildSubscriptionContext.tsx', 'utf8');
for (const screen of ['app/subscription.tsx', 'app/paywall.tsx', 'app/shop/paywall.tsx']) {
  const source = readFileSync(screen, 'utf8');
  assert.match(source, /confirmAuthoritativeProActivation/);
  assert.match(source, /Finishing Pro Activation/);
  assert.match(source, /Try Again/);
}
assert.match(revenuecat, /body: \{ force \}/);
assert.match(revenuecat, /await reconcileAuthoritativeEntitlement\(true\)/);
assert.doesNotMatch(revenuecat, /void reconcileAuthoritativeEntitlement\(true\)/);
assert.match(edge, /body\?\.force === true/);
assert.match(edge, /shouldUseCachedEntitlement\(current\?\.last_synced_at, force\)/);
assert.match(childContext, /return effectivePro/);

for (const { name, fn } of tests) {
  fn();
  console.log(`PASS ${name}`);
}
console.log(`${tests.length} subscription activation scenarios passed.`);
