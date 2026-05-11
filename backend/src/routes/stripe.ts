import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { MongoService } from '../services/mongo-service.js';
import type { StripeService } from '../services/stripe-service.js';
import { getPlanById } from '../config/pricing.js';
import type { Subscription } from '../types/models.js';
import { nanoid } from 'nanoid';

const createCheckoutSchema = z.object({
  planId: z.enum(['free', 'pro', 'enterprise']),
});

const updateSubscriptionSchema = z.object({
  planId: z.enum(['free', 'pro', 'enterprise']),
});

const addPaymentMethodSchema = z.object({
  token: z.string(),
});

export const registerStripeRoutes = async (
  fastify: FastifyInstance,
  mongoService: MongoService,
  stripeService: StripeService
) => {
  // ===== GET CURRENT SUBSCRIPTION =====
  fastify.get(
    '/api/v1/subscription',
    { onRequest: [(fastify as any).authenticate] },
    async (request, reply) => {
      try {
        const userId = (request.user as any).id;
        const userAccount = await mongoService.findAccountById(userId);

        if (!userAccount) {
          return reply.status(401).send({ error: 'User not found' });
        }

        let subscription = await mongoService.getSubscriptionByAccountId(userId);

        // If no subscription, create a free one
        if (!subscription) {
          const newSubscription: Subscription = {
            id: `sub_${nanoid(12)}`,
            accountId: userId,
            plan: 'free',
            status: 'active',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
            cancelAtPeriodEnd: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          subscription = await mongoService.createSubscription(newSubscription);
        }

        const plan = getPlanById(subscription.plan);

        return reply.send({
          subscription,
          plan,
          limits: plan?.limits,
        });
      } catch (error) {
        console.error('Get subscription error:', error);
        return reply.status(500).send({ error: 'Failed to fetch subscription' });
      }
    }
  );

  // ===== CREATE CHECKOUT SESSION =====
  fastify.post(
    '/api/v1/checkout',
    { onRequest: [(fastify as any).authenticate] },
    async (request, reply) => {
      try {
        const validation = createCheckoutSchema.safeParse(request.body);
        if (!validation.success) {
          return reply.status(400).send({ error: 'Validation failed', details: validation.error.flatten() });
        }

        const { planId } = validation.data;
        if (planId === 'free') {
          return reply.status(400).send({ error: 'Free plan cannot be checked out' });
        }

        const userId = (request.user as any).id;
        const userAccount = await mongoService.findAccountById(userId);

        if (!userAccount) {
          return reply.status(401).send({ error: 'User not found' });
        }

        const plan = getPlanById(planId);
        if (!plan) {
          return reply.status(404).send({ error: 'Plan not found' });
        }

        let subscription = await mongoService.getSubscriptionByAccountId(userId);

        // Create or update Stripe customer
        let stripeCustomerId = subscription?.stripeCustomerId;

        if (!stripeCustomerId) {
          const customer = await stripeService.createCustomer(userAccount.email, userAccount.name);
          stripeCustomerId = customer.id;

          // Create subscription
          const stripeSubscription = await stripeService.createSubscription(stripeCustomerId, plan.stripePriceId);

          if (!subscription) {
            subscription = await mongoService.createSubscription({
              id: `sub_${nanoid(12)}`,
              accountId: userId,
              plan: planId as any,
              status: 'active',
              stripeCustomerId,
              stripeSubscriptionId: stripeSubscription.id,
              currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
              currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
              cancelAtPeriodEnd: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          } else {
            await mongoService.updateSubscription(subscription.id, {
              stripeCustomerId,
              stripeSubscriptionId: stripeSubscription.id,
            });
          }
        } else {
          if (!subscription || !subscription.stripeSubscriptionId) {
            return reply.status(400).send({ error: 'No active Stripe subscription' });
          }

          // Update existing subscription
          const stripeSubscription = await stripeService.updateSubscription(
            subscription.stripeSubscriptionId!,
            plan.stripePriceId
          );

          await mongoService.updateSubscription(subscription.id, {
            plan: planId as any,
            currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
            currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
          });
        }

        return reply.send({
          success: true,
          planId,
          subscription: await mongoService.getSubscriptionByAccountId(userId),
        });
      } catch (error) {
        console.error('Checkout error:', error);
        return reply.status(500).send({ error: 'Failed to create checkout session' });
      }
    }
  );

  // ===== UPGRADE/DOWNGRADE SUBSCRIPTION =====
  fastify.post(
    '/api/v1/subscription/update',
    { onRequest: [(fastify as any).authenticate] },
    async (request, reply) => {
      try {
        const validation = updateSubscriptionSchema.safeParse(request.body);
        if (!validation.success) {
          return reply.status(400).send({ error: 'Validation failed', details: validation.error.flatten() });
        }

        const { planId } = validation.data;
        const userId = (request.user as any).id;

        const subscription = await mongoService.getSubscriptionByAccountId(userId);
        if (!subscription) {
          return reply.status(404).send({ error: 'Subscription not found' });
        }

        const plan = getPlanById(planId);
        if (!plan) {
          return reply.status(404).send({ error: 'Plan not found' });
        }

        if (planId === 'free') {
          // Cancel Stripe subscription if switching to free
          if (subscription.stripeSubscriptionId) {
            await stripeService.cancelSubscription(subscription.stripeSubscriptionId, true);
          }

          await mongoService.updateSubscription(subscription.id, {
            plan: 'free',
            cancelAtPeriodEnd: true,
          });
        } else {
          if (!subscription.stripeSubscriptionId) {
            return reply.status(400).send({ error: 'No active Stripe subscription' });
          }

          const stripeSubscription = await stripeService.updateSubscription(
            subscription.stripeSubscriptionId,
            plan.stripePriceId
          );

          await mongoService.updateSubscription(subscription.id, {
            plan: planId as any,
            currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
            currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
            cancelAtPeriodEnd: false,
          });
        }

        return reply.send({
          success: true,
          subscription: await mongoService.getSubscriptionByAccountId(userId),
        });
      } catch (error) {
        console.error('Update subscription error:', error);
        return reply.status(500).send({ error: 'Failed to update subscription' });
      }
    }
  );

  // ===== CANCEL SUBSCRIPTION =====
  fastify.post(
    '/api/v1/subscription/cancel',
    { onRequest: [(fastify as any).authenticate] },
    async (request, reply) => {
      try {
        const userId = (request.user as any).id;
        const subscription = await mongoService.getSubscriptionByAccountId(userId);

        if (!subscription) {
          return reply.status(404).send({ error: 'Subscription not found' });
        }

        if (subscription.stripeSubscriptionId) {
          await stripeService.cancelSubscription(subscription.stripeSubscriptionId, true);
        }

        await mongoService.updateSubscription(subscription.id, {
          cancelAtPeriodEnd: true,
        });

        return reply.send({ success: true, message: 'Subscription will be canceled at period end' });
      } catch (error) {
        console.error('Cancel subscription error:', error);
        return reply.status(500).send({ error: 'Failed to cancel subscription' });
      }
    }
  );

  // ===== WEBHOOK HANDLER =====
  fastify.post('/api/v1/webhooks/stripe', async (request, reply) => {
    try {
      const signature = request.headers['stripe-signature'] as string;
      if (!signature) {
        return reply.status(400).send({ error: 'Missing Stripe signature' });
      }

      const rawBody = (request as any).rawBody as Buffer;
      const event = stripeService.verifyWebhookSignature(rawBody, signature);

      switch (event.type) {
        case 'customer.subscription.updated':
          const subscriptionUpdated = event.data.object as any;
          await mongoService.updateSubscriptionByCustomerId(subscriptionUpdated.customer, {
            status: subscriptionUpdated.status as any,
            currentPeriodStart: new Date(subscriptionUpdated.current_period_start * 1000),
            currentPeriodEnd: new Date(subscriptionUpdated.current_period_end * 1000),
            cancelAtPeriodEnd: subscriptionUpdated.cancel_at_period_end,
          });
          break;

        case 'customer.subscription.deleted':
          const subscriptionDeleted = event.data.object as any;
          await mongoService.updateSubscriptionByCustomerId(subscriptionDeleted.customer, {
            status: 'canceled',
            cancelAtPeriodEnd: true,
          });
          break;

        case 'invoice.payment_succeeded':
          console.log('Payment succeeded:', event.data.object);
          break;

        case 'invoice.payment_failed':
          console.log('Payment failed:', event.data.object);
          break;
      }

      return reply.send({ received: true });
    } catch (error) {
      console.error('Webhook error:', error);
      return reply.status(400).send({ error: 'Webhook processing failed' });
    }
  });
};
