'use client';

import React, { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';

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

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const response = await fetch('/api/v1/subscription', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('teamflow-auth')}`,
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
    if (planId === 'free' || !subscription) return;

    setUpgrading(planId);
    try {
      const response = await fetch('/api/v1/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('teamflow-auth')}`,
        },
        body: JSON.stringify({ planId }),
      });

      if (response.ok) {
        // Refresh subscription
        const subResponse = await fetch('/api/v1/subscription', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('teamflow-auth')}`,
          },
        });
        if (subResponse.ok) {
          const data = await subResponse.json();
          setSubscription(data.subscription);
        }
      }
    } catch (error) {
      console.error('Failed to upgrade:', error);
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

      <div className="grid md:grid-cols-3 gap-6">
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
    </div>
  );
}
