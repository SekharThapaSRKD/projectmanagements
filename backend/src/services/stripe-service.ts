import Stripe from 'stripe';

export class StripeService {
  private stripe: Stripe;

  constructor() {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    this.stripe = new Stripe(apiKey, {
      apiVersion: '2024-04-10',
    });
  }

  // Create a customer in Stripe
  async createCustomer(email: string, name: string) {
    return this.stripe.customers.create({
      email,
      name,
      description: `TeamFlow user: ${email}`,
    });
  }

  // Get customer
  async getCustomer(customerId: string) {
    return this.stripe.customers.retrieve(customerId);
  }

  // Create subscription
  async createSubscription(customerId: string, priceId: string) {
    return this.stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });
  }

  // Get subscription
  async getSubscription(subscriptionId: string) {
    return this.stripe.subscriptions.retrieve(subscriptionId);
  }

  // Update subscription
  async updateSubscription(subscriptionId: string, priceId: string) {
    const existingSubscription = await this.stripe.subscriptions.retrieve(subscriptionId);
    const firstItem = existingSubscription.items.data[0];
    if (!firstItem) {
      throw new Error('Stripe subscription has no line items');
    }

    return this.stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: firstItem.id,
          price: priceId,
        },
      ],
      proration_behavior: 'create_prorations',
    });
  }

  // Cancel subscription
  async cancelSubscription(subscriptionId: string, atPeriodEnd: boolean = true) {
    return this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: atPeriodEnd,
    });
  }

  // Create payment method
  async createPaymentMethod(token: string) {
    return this.stripe.paymentMethods.create({
      type: 'card',
      card: {
        token,
      },
    });
  }

  // Attach payment method to customer
  async attachPaymentMethodToCustomer(paymentMethodId: string, customerId: string) {
    return this.stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });
  }

  // Set default payment method
  async setDefaultPaymentMethod(customerId: string, paymentMethodId: string) {
    return this.stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
  }

  // Create invoice
  async createInvoice(customerId: string, description: string, amount: number) {
    return this.stripe.invoices.create({
      customer: customerId,
      description,
      auto_advance: false,
    });
  }

  // Finalize invoice
  async finalizeInvoice(invoiceId: string) {
    return this.stripe.invoices.finalizeInvoice(invoiceId);
  }

  // Get upcoming invoice
  async getUpcomingInvoice(customerId: string) {
    return this.stripe.invoices.retrieveUpcoming({
      customer: customerId,
    });
  }

  // List subscriptions for customer
  async listSubscriptionsForCustomer(customerId: string) {
    return this.stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 100,
    });
  }

  // Create checkout session for subscription purchase
  async createCheckoutSession(input: {
    customerId: string;
    successUrl: string;
    cancelUrl: string;
    priceId?: string;
    amountCents?: number;
    planName: string;
    planId: 'pro' | 'enterprise';
    accountId: string;
  }) {
    const { customerId, successUrl, cancelUrl, priceId, amountCents, planName, planId, accountId } = input;

    if (!priceId && (!amountCents || amountCents <= 0)) {
      throw new Error('Either priceId or valid amountCents must be provided');
    }

    let lineItem: Stripe.Checkout.SessionCreateParams.LineItem;
    const hasRealStripePriceId = Boolean(priceId && /^price_[A-Za-z0-9]+$/.test(priceId));

    if (hasRealStripePriceId && priceId) {
      lineItem = { price: priceId, quantity: 1 };
    } else {
      lineItem = {
        price_data: {
          currency: 'usd',
          product_data: { name: `${planName} Plan` },
          recurring: { interval: 'month' },
          unit_amount: amountCents as number,
        },
        quantity: 1,
      };
    }

    return this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: [lineItem],
      metadata: {
        planId,
        accountId,
      },
      subscription_data: {
        metadata: {
          planId,
          accountId,
        },
      },
    });
  }

  async getCheckoutSession(sessionId: string) {
    return this.stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });
  }

  // Verify webhook signature
  verifyWebhookSignature(body: Buffer, signature: string): Stripe.Event {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not set');
    }
    return this.stripe.webhooks.constructEvent(body, signature, webhookSecret);
  }
}

export default new StripeService();
