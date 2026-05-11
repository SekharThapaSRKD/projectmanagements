export interface PricingPlan {
  id: 'free' | 'pro' | 'enterprise';
  name: string;
  price: number; // Monthly price in cents
  stripePriceId: string;
  limits: {
    workspaces: number;
    projectsPerWorkspace: number;
    teamMembers: number;
    storage: number; // in GB
    monthlyApiCalls: number;
  };
  features: string[];
}

export const PRICING_PLANS: Record<string, PricingPlan> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    stripePriceId: '', // No Stripe ID for free plan
    limits: {
      workspaces: 1,
      projectsPerWorkspace: 2,
      teamMembers: 5,
      storage: 1, // 1GB
      monthlyApiCalls: 10000,
    },
    features: [
      'Up to 1 workspace',
      'Up to 2 projects per workspace',
      'Up to 5 team members',
      '1 GB storage',
      'Basic task management',
      'Kanban & Scrum boards',
      'Basic reporting',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 9900, // $99/month in cents
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID || 'price_pro_monthly',
    limits: {
      workspaces: 10,
      projectsPerWorkspace: 50,
      teamMembers: 50,
      storage: 100, // 100GB
      monthlyApiCalls: 1000000,
    },
    features: [
      'Up to 10 workspaces',
      'Up to 50 projects per workspace',
      'Up to 50 team members',
      '100 GB storage',
      'Advanced task management',
      'Custom workflows',
      'Advanced reporting & analytics',
      'Integrations',
      'Priority support',
      'API access',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 29900, // $299/month in cents
    stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise_monthly',
    limits: {
      workspaces: 999,
      projectsPerWorkspace: 999,
      teamMembers: 999,
      storage: 1000, // 1TB
      monthlyApiCalls: 100000000,
    },
    features: [
      'Unlimited workspaces',
      'Unlimited projects',
      'Unlimited team members',
      '1 TB storage',
      'Custom features',
      'Dedicated account manager',
      'SLA guarantee',
      'Advanced security & compliance',
      '24/7 priority support',
      'Custom integrations',
      'Advanced analytics',
      'SSO & SAML',
    ],
  },
};

export function getPlanById(planId: string): PricingPlan | null {
  return PRICING_PLANS[planId] || null;
}

export function getUserPlanLimits(plan: 'free' | 'pro' | 'enterprise') {
  return getPlanById(plan)?.limits || PRICING_PLANS.free.limits;
}
