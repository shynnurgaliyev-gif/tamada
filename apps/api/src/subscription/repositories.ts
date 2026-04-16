import type { Db } from '../db';

export type SubscriptionStatus = 'trial' | 'active' | 'expiring' | 'expired' | 'blocked' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'cancelled';
export type PaymentProviderType = 'kaspi' | 'other';

export type Subscription = {
  id: string;
  account_id: string | null;
  provider_id: string | null;
  plan_code: string;
  status: SubscriptionStatus;
  starts_at: Date;
  expires_at: Date;
  trial_ends_at: Date | null;
  grace_until: Date | null;
  included_profile_count: number;
  extra_profile_slots: number;
  max_active_profiles: number;
  created_at: Date;
  updated_at: Date;
};

export type Payment = {
  id: string;
  account_id: string | null;
  provider_id: string | null;
  subscription_id: string | null;
  payment_provider: PaymentProviderType;
  invoice_id: string | null;
  external_reference: string | null;
  amount: string;
  currency: string;
  status: PaymentStatus;
  phone: string | null;
  payload_json: unknown;
  paid_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export const VISIBLE_STATUSES: SubscriptionStatus[] = ['trial', 'active', 'expiring'];
export const TRIAL_DAYS = 30;
export const EXPIRING_WARN_DAYS = 3;
export const SUBSCRIPTION_PRICE = 9900; // KZT per month
export const BASE_INCLUDED_PROFILE_COUNT = 1;
export const PRODUCT_MAX_ACTIVE_PROFILES = 3;

export type PlanLimits = {
  included_profile_count: number;
  extra_profile_slots: number;
  max_active_profiles: number;
};

export function planLimits(sub: Subscription | null): PlanLimits {
  return {
    included_profile_count: sub?.included_profile_count ?? BASE_INCLUDED_PROFILE_COUNT,
    extra_profile_slots: sub?.extra_profile_slots ?? 0,
    max_active_profiles: sub?.max_active_profiles ?? PRODUCT_MAX_ACTIVE_PROFILES,
  };
}

// ---- Subscriptions ----

/** Find active subscription by account_id (covers all profiles of the account). */
export async function findActiveSubscriptionByAccount(db: Db, accountId: string): Promise<Subscription | null> {
  const rows = await db<Subscription[]>`
    SELECT * FROM subscriptions
    WHERE account_id = ${accountId}
      AND status NOT IN ('cancelled')
    ORDER BY created_at DESC
    LIMIT 1
  `;
  return rows[0] ?? null;
}

/** Legacy lookup by provider_id — routes through account for backwards compat. */
export async function findActiveSubscription(db: Db, providerId: string): Promise<Subscription | null> {
  const rows = await db<Subscription[]>`
    SELECT s.* FROM subscriptions s
    WHERE s.account_id = (SELECT account_id FROM providers WHERE id = ${providerId})
      AND s.status NOT IN ('cancelled')
    ORDER BY s.created_at DESC
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function startTrial(db: Db, accountId: string): Promise<Subscription> {
  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 86400000);
  const rows = await db<Subscription[]>`
    INSERT INTO subscriptions (account_id, plan_code, status, starts_at, expires_at, trial_ends_at)
    VALUES (${accountId}, 'basic', 'trial', NOW(), ${trialEndsAt}, ${trialEndsAt})
    RETURNING *
  `;
  if (!rows[0]) throw new Error('Failed to start trial');
  return rows[0];
}

export async function updateSubscriptionStatus(db: Db, id: string, status: SubscriptionStatus): Promise<void> {
  await db`UPDATE subscriptions SET status = ${status} WHERE id = ${id}`;
}

export async function extendSubscription(db: Db, id: string, days: number): Promise<Subscription | null> {
  const rows = await db<Subscription[]>`
    UPDATE subscriptions SET
      status = 'active',
      expires_at = GREATEST(expires_at, NOW()) + INTERVAL '1 day' * ${days}
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] ?? null;
}

export async function logEvent(db: Db, data: {
  accountId?: string | undefined;
  providerId?: string | undefined;
  subscriptionId?: string | undefined;
  eventType: string;
  payloadJson?: object | undefined;
}): Promise<void> {
  await db`
    INSERT INTO subscription_events (account_id, provider_id, subscription_id, event_type, payload_json)
    VALUES (${data.accountId ?? null}, ${data.providerId ?? null}, ${data.subscriptionId ?? null}, ${data.eventType},
            ${data.payloadJson ? JSON.stringify(data.payloadJson) : null})
  `;
}

export function daysLeft(sub: Subscription): number {
  const ms = sub.expires_at.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}

export function computeStatus(sub: Subscription): SubscriptionStatus {
  const days = daysLeft(sub);
  if (sub.status === 'blocked' || sub.status === 'cancelled') return sub.status;
  if (days <= 0) return 'expired';
  if (days <= EXPIRING_WARN_DAYS) return 'expiring';
  if (sub.status === 'trial') return 'trial';
  return 'active';
}

// ---- Payments ----

export async function createPayment(db: Db, data: {
  accountId: string;
  providerId?: string | undefined;
  subscriptionId?: string | undefined;
  paymentProvider: PaymentProviderType;
  amount: number;
  currency: string;
  phone?: string | undefined;
  invoiceId?: string | undefined;
}): Promise<Payment> {
  const rows = await db<Payment[]>`
    INSERT INTO payments
      (account_id, provider_id, subscription_id, payment_provider, amount, currency, phone, invoice_id)
    VALUES
      (${data.accountId}, ${data.providerId ?? null}, ${data.subscriptionId ?? null}, ${data.paymentProvider},
       ${data.amount}, ${data.currency}, ${data.phone ?? null}, ${data.invoiceId ?? null})
    RETURNING *
  `;
  if (!rows[0]) throw new Error('Failed to create payment');
  return rows[0];
}

export async function findPaymentByInvoiceId(db: Db, invoiceId: string): Promise<Payment | null> {
  const rows = await db<Payment[]>`
    SELECT * FROM payments WHERE invoice_id = ${invoiceId} LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function updatePayment(db: Db, id: string, data: Record<string, unknown>): Promise<void> {
  await db`UPDATE payments SET ${db(data)} WHERE id = ${id}`;
}

export async function findPaymentsByProvider(db: Db, providerId: string, limit = 10): Promise<Payment[]> {
  return db<Payment[]>`
    SELECT * FROM payments WHERE provider_id = ${providerId}
    ORDER BY created_at DESC LIMIT ${limit}
  `;
}

export async function findPaymentsByAccount(db: Db, accountId: string, limit = 10): Promise<Payment[]> {
  return db<Payment[]>`
    SELECT * FROM payments WHERE account_id = ${accountId}
    ORDER BY created_at DESC LIMIT ${limit}
  `;
}
