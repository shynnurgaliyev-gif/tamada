// Abstract payment provider interface
// Add new providers by implementing PaymentProvider and registering in createPaymentProvider()

export type InvoiceRequest = {
  amount: number;
  currency: string;
  phone: string;
  description: string;
  externalId: string; // our payment.id
};

export type InvoiceResult = {
  invoiceId: string;
  paymentUrl: string | null;
  rawResponse: unknown;
};

export type WebhookResult = {
  invoiceId: string;
  status: 'paid' | 'failed' | 'cancelled';
  externalReference: string | null;
  rawPayload: unknown;
};

export interface PaymentProvider {
  createInvoice(req: InvoiceRequest): Promise<InvoiceResult>;
  parseWebhook(body: unknown): WebhookResult | null;
}

// ---- Kaspi stub (replace with real Kaspi Gold API when ready) ----
class KaspiPaymentProvider implements PaymentProvider {
  constructor(private readonly apiKey: string | undefined) {}

  async createInvoice(req: InvoiceRequest): Promise<InvoiceResult> {
    // TODO: integrate real Kaspi Gold API
    // For now return a stub invoice so the flow works end-to-end
    const invoiceId = `kaspi_${req.externalId}`;
    console.log(`[Kaspi stub] create invoice: ${req.amount} ${req.currency} for ${req.phone}, id=${invoiceId}`);
    return {
      invoiceId,
      paymentUrl: null, // Kaspi sends push notification to phone, no redirect URL
      rawResponse: { stub: true },
    };
  }

  parseWebhook(body: unknown): WebhookResult | null {
    // Real Kaspi sends XML or JSON depending on integration type
    // Stub: accept JSON { invoice_id, status }
    if (typeof body !== 'object' || !body) return null;
    const b = body as Record<string, unknown>;
    const invoiceId = typeof b['invoice_id'] === 'string' ? b['invoice_id'] : null;
    const status = typeof b['status'] === 'string' ? b['status'] : null;
    if (!invoiceId || !status) return null;
    const mapped = status === 'PAID' || status === 'paid' ? 'paid'
      : status === 'FAILED' || status === 'failed' ? 'failed' : 'cancelled';
    return {
      invoiceId,
      status: mapped,
      externalReference: typeof b['reference'] === 'string' ? b['reference'] : null,
      rawPayload: body,
    };
  }
}

export function createPaymentProvider(apiKey: string | undefined): PaymentProvider {
  return new KaspiPaymentProvider(apiKey);
}
