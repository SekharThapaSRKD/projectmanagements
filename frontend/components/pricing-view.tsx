'use client';

import React, { useEffect, useState } from 'react';
import { Check, CheckCircle2, X } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';

interface Subscription {
  id: string;
  plan: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'canceled' | 'past_due' | 'trial';
  currentPeriodStart: string;
  currentPeriodEnd: string;
}

interface Plan {
  id: 'free' | 'pro' | 'enterprise';
  name: string;
  price: number;
  limits: {
    workspaces: number;
    projectsPerWorkspace: number;
    teamMembers: number;
    storage: number;
    monthlyApiCalls: number;
  };
  features: string[];
}

const PRICING_PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    limits: {
      workspaces: 1,
      projectsPerWorkspace: 2,
      teamMembers: 5,
      storage: 1,
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
  {
    id: 'pro',
    name: 'Pro',
    price: 99,
    limits: {
      workspaces: 10,
      projectsPerWorkspace: 50,
      teamMembers: 50,
      storage: 100,
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
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 299,
    limits: {
      workspaces: 999,
      projectsPerWorkspace: 999,
      teamMembers: 999,
      storage: 1000,
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
];

export function PricingView() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [confirmPlan, setConfirmPlan] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const baseUrl = (process.env.NEXT_PUBLIC_AUTH_PROVIDER_URL || '').trim().replace(/\/$/, '');
        const response = await fetch(`${baseUrl}/api/v1/subscription`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setSubscription(data.subscription);
        }
      } catch (error) {
        console.error('Failed to fetch subscription:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, []);

  const handleUpgrade = async (planId: string) => {
    if (planId === 'free') return;
    setConfirmPlan(planId);
  };

  const confirmUpgrade = async () => {
    if (!confirmPlan) return;

    setUpgrading(confirmPlan);
    try {
      const baseUrl = (process.env.NEXT_PUBLIC_AUTH_PROVIDER_URL || '').trim().replace(/\/$/, '');
      const response = await fetch(`${baseUrl}/api/v1/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
        },
        body: JSON.stringify({ planId: confirmPlan }),
      });

      const rawBody = await response.text();
      let data: { error?: string; checkoutUrl?: string; sessionId?: string } = {};
      try {
        data = rawBody ? JSON.parse(rawBody) : {};
      } catch {
        throw new Error(`Unexpected server response (${response.status}).`);
      }

      if (response.ok) {
        
        // Use Stripe checkout or redirect to payment URL
        if (data.checkoutUrl) {
          // Backend provided direct checkout URL
          window.location.href = data.checkoutUrl;
        } else if (data.sessionId) {
          // Use Stripe.js to redirect to checkout
          const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');
          if (stripe) {
            const result = await stripe.redirectToCheckout({ sessionId: data.sessionId });
            if (result.error) {
              console.error('Stripe redirect error:', result.error.message);
              alert('Failed to redirect to checkout: ' + result.error.message);
              setConfirmPlan(null);
            }
          }
        }
      } else {
        alert('Upgrade failed: ' + (data.error || 'Unknown error'));
        setConfirmPlan(null);
      }
    } catch (error) {
      console.error('Failed to upgrade:', error);
      alert('An error occurred. Please try again.');
      setConfirmPlan(null);
    } finally {
      setUpgrading(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-96">Loading...</div>;
  }

  const currentPlan = subscription?.plan || 'free';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Pricing Plans</h1>
        <p className="text-gray-600">Choose the perfect plan for your team</p>
      </div>

      <div id="pricing-plans" className="grid md:grid-cols-3 gap-6">
        {PRICING_PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`rounded-lg border-2 p-6 transition ${
              currentPlan === plan.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="mb-4">
              <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
              {currentPlan === plan.id && plan.id !== 'free' && (
                <div className="mb-2 inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Unlocked
                </div>
              )}
              {plan.id === 'free' ? (
                <p className="text-3xl font-bold">Free</p>
              ) : (
                <div>
                  <p className="text-3xl font-bold">${plan.price}</p>
                  <p className="text-sm text-gray-600">/month</p>
                </div>
              )}
            </div>

            <div className="mb-6 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-700">
                  {plan.limits.workspaces === 999
                    ? 'Unlimited'
                    : plan.limits.workspaces}
                </span>
                <span className="text-gray-600">Workspaces</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-700">
                  {plan.limits.projectsPerWorkspace === 999
                    ? 'Unlimited'
                    : plan.limits.projectsPerWorkspace}
                </span>
                <span className="text-gray-600">Projects per Workspace</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-700">
                  {plan.limits.teamMembers === 999
                    ? 'Unlimited'
                    : plan.limits.teamMembers}
                </span>
                <span className="text-gray-600">Team Members</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-700">
                  {plan.limits.storage === 1000
                    ? '1 TB'
                    : `${plan.limits.storage} GB`}
                </span>
                <span className="text-gray-600">Storage</span>
              </div>
            </div>

            {currentPlan === plan.id && (
              <button
                className="w-full mb-4 py-2 px-4 bg-blue-500 text-white rounded-lg font-semibold cursor-default"
                disabled
              >
                Current Plan
              </button>
            )}
            {currentPlan !== plan.id && plan.id !== 'free' && (
              <button
                onClick={() => handleUpgrade(plan.id)}
                disabled={upgrading === plan.id}
                className="w-full mb-4 py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50"
              >
                {upgrading === plan.id ? 'Upgrading...' : 'Upgrade'}
              </button>
            )}
            {plan.id === 'free' && currentPlan !== 'free' && (
              <button
                onClick={() => handleUpgrade('free')}
                disabled={upgrading === 'free'}
                className="w-full mb-4 py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold disabled:opacity-50"
              >
                {upgrading === 'free' ? 'Downgrading...' : 'Downgrade'}
              </button>
            )}

            <div className="space-y-2">
              <p className="font-semibold text-sm mb-2">Features:</p>
              {plan.features.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {subscription && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-gray-700">
            Current Plan: <span className="font-semibold capitalize">{subscription.plan}</span>
          </p>
          <p className="text-sm text-gray-700 mt-1">
            Status: <span className="font-semibold capitalize">{subscription.status}</span>
          </p>
          <p className="text-sm text-gray-700 mt-1">
            Renews on: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
          </p>
        </div>
      )}

      {/* Upgrade Confirmation Modal */}
      {confirmPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[hsl(var(--bg-elevated))] p-8 shadow-xl">
            <h3 className="text-2xl font-bold text-white mb-2">Confirm Upgrade</h3>
            <p className="text-[hsl(var(--muted))] mb-6">
              Upgrade to <span className="font-semibold text-[hsl(var(--accent))]">{PRICING_PLANS.find(p => p.id === confirmPlan)?.name}</span> plan for <span className="font-semibold text-white">${PRICING_PLANS.find(p => p.id === confirmPlan)?.price}/month</span>?
            </p>
            <div className="space-y-3 mb-8">
              <p className="text-sm text-[hsl(var(--muted))]">✓ Upgrade instantly</p>
              <p className="text-sm text-[hsl(var(--muted))]">✓ New features available immediately</p>
              <p className="text-sm text-[hsl(var(--muted))]">✓ Cancel anytime</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmPlan(null)}
                className="flex-1 rounded-xl border border-[hsl(var(--border))] bg-transparent px-4 py-3 font-semibold text-[hsl(var(--text))] transition hover:bg-[hsl(var(--bg-soft))]"
              >
                Cancel
              </button>
              <button
                onClick={confirmUpgrade}
                disabled={upgrading === confirmPlan}
                className="flex-1 rounded-xl bg-[hsl(var(--accent))] px-4 py-3 font-semibold text-black transition hover:opacity-90 disabled:opacity-50"
              >
                {upgrading === confirmPlan ? 'Processing...' : 'Proceed to Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
