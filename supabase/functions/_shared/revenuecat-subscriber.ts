export const isUuid = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );

type RecordValue = Record<string, unknown>;
type Fetcher = (input: string | URL, init?: RequestInit) => Promise<Response>;

const record = (value: unknown): RecordValue =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as RecordValue)
    : {};
const text = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : null;
const number = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;
const bool = (value: unknown) =>
  typeof value === 'boolean' ? value : null;
const iso = (value: number | null) =>
  value === null ? null : new Date(value).toISOString();
const listItems = (value: unknown) => {
  const list = record(value);
  return Array.isArray(list.items) ? list.items.map(record) : null;
};

const ACTIVE_PAID = new Set(['active', 'in_grace_period', 'in_billing_retry']);
const INACTIVE = new Set(['expired', 'paused']);

export class RevenueCatLookupError extends Error {
  code: string;
  status?: number;

  constructor(code: string, status?: number) {
    super(code);
    this.name = 'RevenueCatLookupError';
    this.code = code;
    this.status = status;
  }
}

async function parseJson(response: Response) {
  try {
    return await response.json();
  } catch {
    throw new RevenueCatLookupError('MALFORMED_JSON', response.status);
  }
}

async function getJson(url: string, secret: string, fetcher: Fetcher) {
  const response = await fetcher(url, {
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${secret}`,
    },
  });

  if (!response.ok) {
    throw new RevenueCatLookupError(
      response.status === 404 ? 'CUSTOMER_NOT_FOUND' : 'UPSTREAM_ERROR',
      response.status
    );
  }

  return parseJson(response);
}

function hasConfiguredEntitlement(
  subscription: RecordValue,
  entitlementId: string
) {
  const entitlements = record(subscription.entitlements);
  const items = listItems(entitlements);
  if (!items || entitlements.next_page !== null) return null;
  return items.some(
    (item) =>
      text(item.lookup_key) === entitlementId && text(item.state) === 'active'
  );
}

export async function normalizeRevenueCatV2(
  customerPayload: unknown,
  subscriptionPayloads: unknown[],
  userId: string,
  entitlementId: string,
  observedAt = new Date().toISOString()
) {
  const customer = record(customerPayload);
  if (text(customer.object) !== 'customer' || text(customer.id) !== userId) {
    throw new RevenueCatLookupError('IDENTITY_MISMATCH');
  }

  const subscriptions = subscriptionPayloads.map(record);
  const candidates: RecordValue[] = [];

  for (const subscription of subscriptions) {
    if (
      text(subscription.object) !== 'subscription' ||
      text(subscription.customer_id) !== userId
    ) {
      throw new RevenueCatLookupError('IDENTITY_MISMATCH');
    }

    const matches = hasConfiguredEntitlement(subscription, entitlementId);
    if (matches === null) {
      throw new RevenueCatLookupError('INCOMPLETE_ENTITLEMENT_PAGE');
    }
    if (matches) candidates.push(subscription);
  }

  const ranked = candidates.sort((a, b) => {
    const score = (item: RecordValue) => {
      const production = text(item.environment) === 'production' ? 100 : 0;
      const access = bool(item.gives_access) === true ? 10 : 0;
      return production + access + (number(item.current_period_ends_at) ?? 0) / 1e15;
    };
    return score(b) - score(a);
  });
  const selected = ranked[0];

  if (!selected) {
    return snapshot(userId, entitlementId, {
      state: 'FREE',
      environment: 'UNKNOWN',
      active: false,
      observedAt,
    });
  }

  const environmentValue = text(selected.environment);
  if (environmentValue !== 'production' && environmentValue !== 'sandbox') {
    throw new RevenueCatLookupError('UNSUPPORTED_ENVIRONMENT');
  }

  const status = text(selected.status);
  const givesAccess = bool(selected.gives_access);
  const endsAt = number(selected.current_period_ends_at);
  if (!status || givesAccess === null) {
    throw new RevenueCatLookupError('MALFORMED_SUBSCRIPTION');
  }

  const unexpired = endsAt === null || endsAt > Date.now();
  const active =
    givesAccess &&
    unexpired &&
    (status === 'trialing' || ACTIVE_PAID.has(status));

  if (
    !active &&
    !INACTIVE.has(status) &&
    !ACTIVE_PAID.has(status) &&
    status !== 'trialing'
  ) {
    throw new RevenueCatLookupError('UNSUPPORTED_STATUS');
  }

  const state = active ? (status === 'trialing' ? 'TRIAL' : 'PRO') : 'FREE';
  return snapshot(userId, entitlementId, {
    state,
    environment: environmentValue === 'production' ? 'PRODUCTION' : 'SANDBOX',
    active,
    productId: text(selected.product_id),
    store: text(selected.store),
    periodType: status === 'trialing' ? 'TRIAL' : 'NORMAL',
    expiresAt: iso(endsAt),
    autoRenewing: [
      'will_renew',
      'will_change_product',
      'has_already_renewed',
    ].includes(text(selected.auto_renewal_status) ?? ''),
    billingIssue: status === 'in_billing_retry',
    observedAt,
  });
}

async function snapshot(
  userId: string,
  entitlementId: string,
  value: {
    state: 'FREE' | 'TRIAL' | 'PRO';
    environment: 'PRODUCTION' | 'SANDBOX' | 'UNKNOWN';
    active: boolean;
    productId?: string | null;
    store?: string | null;
    periodType?: string | null;
    expiresAt?: string | null;
    autoRenewing?: boolean;
    billingIssue?: boolean;
    observedAt: string;
  }
) {
  const canonical = JSON.stringify({ userId, entitlementId, ...value });
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(canonical)
  );
  const fingerprint = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32);

  return {
    rpc: {
      requested_user_id: userId,
      requested_fingerprint: fingerprint,
      requested_state: value.state,
      requested_entitlement_id: entitlementId,
      requested_product_id: value.productId ?? null,
      requested_store: value.store ?? null,
      requested_environment: value.environment,
      requested_entitlement_active: value.active,
      requested_period_type: value.periodType ?? null,
      requested_expires_at: value.expiresAt ?? null,
      requested_auto_renewing: value.autoRenewing ?? false,
      requested_billing_issue: value.billingIssue ?? false,
      requested_observed_at: value.observedAt,
    },
  };
}

export async function fetchRevenueCatSnapshot(
  userId: string,
  entitlementId: string,
  secret: string,
  projectId: string,
  fetcher: Fetcher = fetch
) {
  if (!isUuid(userId) || !projectId.trim()) {
    throw new RevenueCatLookupError('INVALID_CONFIGURATION');
  }

  const project = encodeURIComponent(projectId);
  const customerId = encodeURIComponent(userId);
  const customerUrl = `https://api.revenuecat.com/v2/projects/${project}/customers/${customerId}`;
  const customer = await getJson(customerUrl, secret, fetcher);

  if (text(record(customer).project_id) !== projectId) {
    throw new RevenueCatLookupError('PROJECT_MISMATCH');
  }

  let nextUrl: string | null =
    `https://api.revenuecat.com/v2/projects/${project}/customers/${customerId}/subscriptions?limit=100`;
  const subscriptions: unknown[] = [];
  const expectedPath =
    `/v2/projects/${project}/customers/${customerId}/subscriptions`;

  while (nextUrl) {
    const page = record(await getJson(nextUrl, secret, fetcher));
    const items = listItems(page);
    if (
      text(page.object) !== 'list' ||
      !items ||
      !Object.prototype.hasOwnProperty.call(page, 'next_page')
    ) {
      throw new RevenueCatLookupError('MALFORMED_SUBSCRIPTION_LIST');
    }

    subscriptions.push(...items);
    const next = text(page.next_page);
    if (!next) {
      nextUrl = null;
      continue;
    }

    const parsed = new URL(next, 'https://api.revenuecat.com');
    if (
      parsed.origin !== 'https://api.revenuecat.com' ||
      parsed.pathname !== expectedPath
    ) {
      throw new RevenueCatLookupError('INVALID_PAGINATION');
    }
    nextUrl = parsed.toString();
  }

  return normalizeRevenueCatV2(
    customer,
    subscriptions,
    userId,
    entitlementId
  );
}
