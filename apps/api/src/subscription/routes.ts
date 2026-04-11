import type { FastifyPluginAsync } from 'fastify';
import type { Db } from '../db';
import type { AppEnv } from '@tamada/config';
import { getAuthAccount } from '../auth/middleware';
import { findProviderById } from '../providers/repositories';
import * as repo from './repositories';
import { createPaymentProvider } from './payment-provider';

export function createSubscriptionRoutes(db: Db, env: AppEnv) {
  const plugin: FastifyPluginAsync = async (app) => {
    const kaspiKey = (env as unknown as Record<string, string | undefined>)['KASPI_API_KEY'];
    const paymentProvider = createPaymentProvider(kaspiKey);

    // GET /providers/:id/subscription
    app.get('/providers/:id/subscription', async (req, reply) => {
      const account = await getAuthAccount(db, req);
      if (!account) return reply.code(401).send({ ok: false, error: 'Unauthorized' });

      const { id } = req.params as { id: string };
      const provider = await findProviderById(db, id);
      if (!provider) return reply.code(404).send({ ok: false, error: 'Provider not found' });
      if (provider.account_id !== account.id) return reply.code(403).send({ ok: false, error: 'Forbidden' });

      const sub = await repo.findActiveSubscription(db, id);
      if (!sub) return reply.send({ ok: true, subscription: null });

      const computed = repo.computeStatus(sub);
      if (computed !== sub.status) {
        await repo.updateSubscriptionStatus(db, sub.id, computed);
        sub.status = computed;
      }

      const payments = await repo.findPaymentsByProvider(db, id, 5);
      return reply.send({ ok: true, subscription: { ...sub, status: computed }, days_left: repo.daysLeft(sub), payments });
    });

    // POST /providers/:id/subscription/start-trial
    app.post('/providers/:id/subscription/start-trial', async (req, reply) => {
      const account = await getAuthAccount(db, req);
      if (!account) return reply.code(401).send({ ok: false, error: 'Unauthorized' });

      const { id } = req.params as { id: string };
      const provider = await findProviderById(db, id);
      if (!provider) return reply.code(404).send({ ok: false, error: 'Provider not found' });
      if (provider.account_id !== account.id) return reply.code(403).send({ ok: false, error: 'Forbidden' });

      const existing = await repo.findActiveSubscription(db, id);
      if (existing) return reply.code(400).send({ ok: false, error: 'Subscription already exists' });

      const sub = await repo.startTrial(db, id);
      await repo.logEvent(db, { providerId: id, subscriptionId: sub.id, eventType: 'trial_started' });
      return reply.code(201).send({ ok: true, subscription: sub, days_left: repo.daysLeft(sub) });
    });

    // GET /providers/:id/subscription/days-left
    app.get('/providers/:id/subscription/days-left', async (req, reply) => {
      const account = await getAuthAccount(db, req);
      if (!account) return reply.code(401).send({ ok: false, error: 'Unauthorized' });

      const { id } = req.params as { id: string };
      const provider = await findProviderById(db, id);
      if (!provider) return reply.code(404).send({ ok: false, error: 'Provider not found' });
      if (provider.account_id !== account.id) return reply.code(403).send({ ok: false, error: 'Forbidden' });

      const sub = await repo.findActiveSubscription(db, id);
      if (!sub) return reply.send({ ok: true, days_left: 0, status: null });
      const computed = repo.computeStatus(sub);
      return reply.send({ ok: true, days_left: repo.daysLeft(sub), status: computed });
    });

    // POST /providers/:id/subscription/refresh-status
    app.post('/providers/:id/subscription/refresh-status', async (req, reply) => {
      const account = await getAuthAccount(db, req);
      if (!account) return reply.code(401).send({ ok: false, error: 'Unauthorized' });

      const { id } = req.params as { id: string };
      const provider = await findProviderById(db, id);
      if (!provider) return reply.code(404).send({ ok: false, error: 'Provider not found' });
      if (provider.account_id !== account.id) return reply.code(403).send({ ok: false, error: 'Forbidden' });

      const sub = await repo.findActiveSubscription(db, id);
      if (!sub) return reply.send({ ok: true, subscription: null });
      const computed = repo.computeStatus(sub);
      if (computed !== sub.status) {
        await repo.updateSubscriptionStatus(db, sub.id, computed);
        await repo.logEvent(db, { providerId: id, subscriptionId: sub.id, eventType: `status_changed_to_${computed}` });
        sub.status = computed;
      }
      return reply.send({ ok: true, subscription: { ...sub, status: computed }, days_left: repo.daysLeft(sub) });
    });

    // POST /providers/:id/payments/create-invoice
    app.post('/providers/:id/payments/create-invoice', async (req, reply) => {
      const account = await getAuthAccount(db, req);
      if (!account) return reply.code(401).send({ ok: false, error: 'Unauthorized' });

      const { id } = req.params as { id: string };
      const provider = await findProviderById(db, id);
      if (!provider) return reply.code(404).send({ ok: false, error: 'Provider not found' });
      if (provider.account_id !== account.id) return reply.code(403).send({ ok: false, error: 'Forbidden' });

      const body = req.body as Record<string, unknown>;
      const phone = typeof body['phone'] === 'string' ? body['phone'] : null;
      if (!phone) return reply.code(400).send({ ok: false, error: 'phone required' });

      const sub = await repo.findActiveSubscription(db, id);
      const amount = repo.SUBSCRIPTION_PRICE;

      const payment = await repo.createPayment(db, {
        providerId: id,
        subscriptionId: sub?.id,
        paymentProvider: 'kaspi',
        amount,
        currency: 'KZT',
        phone,
      });

      const invoiceResult = await paymentProvider.createInvoice({
        amount,
        currency: 'KZT',
        phone,
        description: `Подписка тамада — ${provider.display_name}`,
        externalId: payment.id,
      });

      await repo.updatePayment(db, payment.id, { invoice_id: invoiceResult.invoiceId });
      await repo.logEvent(db, {
        providerId: id, subscriptionId: sub?.id,
        eventType: 'invoice_created',
        payloadJson: { payment_id: payment.id, invoice_id: invoiceResult.invoiceId, amount },
      });

      return reply.code(201).send({
        ok: true,
        payment_id: payment.id,
        invoice_id: invoiceResult.invoiceId,
        amount,
        currency: 'KZT',
        payment_url: invoiceResult.paymentUrl,
        message: 'Счёт выставлен. Kaspi отправит уведомление на указанный номер телефона.',
      });
    });

    // POST /payments/webhook  (called by payment provider)
    app.post('/payments/webhook', async (req, reply) => {
      const result = paymentProvider.parseWebhook(req.body);
      if (!result) return reply.code(400).send({ ok: false, error: 'Invalid webhook payload' });

      const payment = await repo.findPaymentByInvoiceId(db, result.invoiceId);
      if (!payment) return reply.code(404).send({ ok: false, error: 'Payment not found' });

      const updates: Record<string, unknown> = { status: result.status };
      if (result.externalReference) updates['external_reference'] = result.externalReference;
      if (result.status === 'paid') updates['paid_at'] = new Date();
      if (result.rawPayload) updates['payload_json'] = JSON.stringify(result.rawPayload);
      await repo.updatePayment(db, payment.id, updates);

      if (result.status === 'paid' && payment.subscription_id) {
        await repo.extendSubscription(db, payment.subscription_id, 30);
        await repo.logEvent(db, {
          providerId: payment.provider_id,
          subscriptionId: payment.subscription_id,
          eventType: 'payment_received',
          payloadJson: { payment_id: payment.id, amount: payment.amount },
        });
      }

      return reply.send({ ok: true });
    });
  };

  return plugin;
}

// Helper exported for use in other modules (public profile check, bot)
export async function getSubscriptionStatus(db: Db, providerId: string) {
  const sub = await repo.findActiveSubscription(db, providerId);
  if (!sub) return { status: null, days_left: 0, is_visible: false };
  const status = repo.computeStatus(sub);
  return {
    status,
    days_left: repo.daysLeft(sub),
    expires_at: sub.expires_at,
    is_visible: repo.VISIBLE_STATUSES.includes(status),
  };
}
