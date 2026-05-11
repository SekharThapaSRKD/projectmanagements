# Professional TeamFlow - Pricing & Subscription System

## Overview

TeamFlow now includes a professional multi-tier pricing system with Stripe integration. Users start with a **Free plan** that includes limits for workspaces and projects, and can upgrade to **Pro** or **Enterprise** plans for unlimited features.

## Pricing Tiers

### Free Plan
- **Cost**: $0/month
- **Workspaces**: 2
- **Projects per Workspace**: 2
- **Team Members**: 5
- **Storage**: 1 GB
- **Monthly API Calls**: 10,000
- **Features**: Basic task management, Kanban & Scrum boards, basic reporting

### Pro Plan
- **Cost**: $99/month
- **Workspaces**: 10
- **Projects per Workspace**: 50
- **Team Members**: 50
- **Storage**: 100 GB
- **Monthly API Calls**: 1,000,000
- **Features**: Advanced task management, custom workflows, advanced reporting, integrations, priority support, API access

### Enterprise Plan
- **Cost**: $299/month
- **Workspaces**: Unlimited
- **Projects per Workspace**: Unlimited
- **Team Members**: Unlimited
- **Storage**: 1 TB
- **Monthly API Calls**: 100,000,000
- **Features**: All Pro features + dedicated account manager, SLA guarantee, advanced security & compliance, 24/7 support, custom integrations, SSO & SAML

## Features Implementation

### 1. User Account with Subscription

Each user account now includes subscription information:

```typescript
interface Account {
  id: string;
  email: string;
  name: string;
  subscriptionId?: string;  // Links to subscription record
  // ... other fields
}

interface Subscription {
  id: string;
  accountId: string;
  plan: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'canceled' | 'past_due' | 'trial';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### 2. Workspace & Project Limits

When creating a workspace or project, the system automatically checks the user's plan and enforces limits:

```typescript
// Project creation validates limits
const limits = getUserPlanLimits(userPlan);
if (workspaceProjects.length >= limits.projectsPerWorkspace) {
  return reply.status(403).send({
    error: `Project limit reached for ${userPlan} plan`,
    limit: limits.projectsPerWorkspace,
    current: workspaceProjects.length,
  });
}
```

### 3. Stripe Integration

The backend integrates with Stripe for payment processing:

- **Create customers** in Stripe when users upgrade
- **Manage subscriptions** with automatic billing
- **Handle webhooks** for payment events
- **Support plan upgrades/downgrades** with prorated billing

## Backend API Endpoints

### Get Current Subscription
```
GET /api/v1/subscription
Authorization: Bearer <token>

Response:
{
  subscription: {
    id: string,
    plan: 'free' | 'pro' | 'enterprise',
    status: 'active' | 'canceled',
    currentPeriodStart: Date,
    currentPeriodEnd: Date
  },
  plan: { id, name, price, limits, features },
  limits: { workspaces, projectsPerWorkspace, ... }
}
```

### Upgrade/Downgrade Plan
```
POST /api/v1/subscription/update
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  planId: 'pro' | 'enterprise'
}

Response:
{
  success: true,
  subscription: { ... }
}
```

### Create Checkout Session
```
POST /api/v1/checkout
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  planId: 'pro' | 'enterprise'
}

Response:
{
  success: true,
  planId: string,
  subscription: { ... }
}
```

### Cancel Subscription
```
POST /api/v1/subscription/cancel
Authorization: Bearer <token>

Response:
{
  success: true,
  message: 'Subscription will be canceled at period end'
}
```

### Stripe Webhook Handler
```
POST /api/v1/webhooks/stripe
Headers: stripe-signature: <signature>

Handles events:
- customer.subscription.updated
- customer.subscription.deleted
- invoice.payment_succeeded
- invoice.payment_failed
```

## Frontend Components

### Pricing View
Display all pricing plans, current subscription, and upgrade/downgrade options:

```tsx
import { PricingView } from '@/components/pricing-view';

export default function PricingPage() {
  return <PricingView />;
}
```

Features:
- Display all 3 pricing tiers
- Show current plan with badge
- Display features and limits for each plan
- Upgrade/downgrade buttons
- Subscription status and renewal date
- Professional card-based layout

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install stripe
```

### 2. Configure Stripe

Create a Stripe account at https://stripe.com and get your API keys:

1. Go to Dashboard → Developers → API keys
2. Copy your Secret Key and Publishable Key
3. Create products for Pro and Enterprise plans
4. Get the Price IDs

### 3. Update Environment Variables

Edit `backend/.env.local`:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PRO_PRICE_ID=price_pro_monthly
STRIPE_ENTERPRISE_PRICE_ID=price_enterprise_monthly
```

### 4. Setup Webhooks

In Stripe Dashboard:

1. Go to Developers → Webhooks
2. Click "Add endpoint"
3. URL: `https://your-domain.com/api/v1/webhooks/stripe`
4. Events to listen for:
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the Signing Secret to `STRIPE_WEBHOOK_SECRET`

### 5. Database Setup

The system automatically creates MongoDB collections:
- `subscriptions` - stores subscription records
- Updated `accounts` - now includes `subscriptionId` field

### 6. First Login Flow

When a user logs in for the first time:

1. A default **Free** subscription is automatically created
2. Limits are enforced: 2 workspaces, 2 projects per workspace
3. User can upgrade immediately to Pro or Enterprise

## Usage Examples

### Check User's Plan Limits

```typescript
const subscription = await mongoService.getSubscriptionByAccountId(userId);
const limits = getUserPlanLimits(subscription?.plan || 'free');

console.log(limits.workspaces);  // e.g., 2 for free, 10 for pro
```

### Upgrade User Plan

```typescript
const response = await fetch('/api/v1/subscription/update', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ planId: 'pro' })
});
```

### Check if User Hit Limit

```typescript
const workspaceCount = await mongoService.getUserWorkspaces(userId).length;
const limits = getUserPlanLimits(userPlan);

if (workspaceCount >= limits.workspaces) {
  throw new Error('Workspace limit reached. Upgrade to create more workspaces.');
}
```

## Key Files Modified/Created

### New Files:
- `backend/src/config/pricing.ts` - Pricing tier definitions
- `backend/src/services/stripe-service.ts` - Stripe API integration
- `backend/src/routes/stripe.ts` - Payment routes
- `frontend/components/pricing-view.tsx` - Pricing UI component

### Modified Files:
- `backend/src/types/models.ts` - Added Subscription interface
- `backend/src/services/mongo-service.ts` - Added subscription methods
- `backend/src/routes/projects.ts` - Added limit checking
- `backend/src/app.ts` - Registered Stripe routes
- `backend/package.json` - Added stripe dependency
- `backend/.env.local` - Added Stripe configuration

## Error Handling

### Project Limit Exceeded
```json
{
  "error": "Project limit reached for free plan",
  "limit": 2,
  "current": 2,
  "message": "Upgrade to create more projects. Current limit: 2"
}
```

### Workspace Limit Exceeded
```json
{
  "error": "Workspace limit reached for free plan",
  "limit": 2,
  "current": 2,
  "message": "Upgrade to create more workspaces. Current limit: 2"
}
```

## Testing

### Test Payment Flow

1. Use Stripe test mode
2. Test card: `4242 4242 4242 4242` (any future expiry, any CVC)
3. Use in `/api/v1/checkout` endpoint

### Test Webhook

Use Stripe CLI:

```bash
stripe listen --forward-to localhost:4000/api/v1/webhooks/stripe
stripe trigger customer.subscription.updated
```

## Security Considerations

- ✅ JWT authentication on all payment routes
- ✅ Stripe webhook signature verification
- ✅ Server-side limit enforcement
- ✅ No payment details stored locally (handled by Stripe)
- ✅ Secure environment variable storage

## Future Enhancements

1. **Annual Billing**: Add yearly subscription option with discount
2. **Trials**: Implement free trial periods for Pro/Enterprise
3. **Usage Tracking**: Monitor actual usage vs. plan limits
4. **Invoices**: Generate and email invoices for payments
5. **Team Billing**: Per-seat pricing for team members
6. **Custom Plans**: Enterprise customers can request custom limits
7. **Analytics**: Track subscription revenue and churn

## Support & Documentation

- Stripe API Docs: https://stripe.com/docs/api
- TeamFlow Docs: Check README.md in root directory

---

**Version**: 1.0.0  
**Last Updated**: May 2026
