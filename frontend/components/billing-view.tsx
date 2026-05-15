'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, CreditCard, AlertCircle, Check } from 'lucide-react';
import { UsageDashboard } from './usage-dashboard';

interface Subscription {
  id: string;
  plan: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'canceled' | 'past_due' | 'trial';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd?: boolean;
}

export function BillingView() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const currentTier = subscription?.plan ?? 'free';

  const fetchSubscription = async () => {
    try {
      const response = await fetch('/api/v1/subscription', {
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
      setMessage({ type: 'error', text: 'Failed to load subscription details' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) {
      return;
    }

    setCanceling(true);
    try {
      const response = await fetch('/api/v1/subscription/cancel', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
        },
      });

      if (response.ok) {
        setMessage({
          type: 'success',
          text: 'Subscription canceled. Your access will continue until the end of the current billing period.',
        });
        await fetchSubscription();
      } else {
        setMessage({ type: 'error', text: 'Failed to cancel subscription' });
      }
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      setMessage({ type: 'error', text: 'An error occurred while canceling' });
    } finally {
      setCanceling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-[hsl(var(--muted))]">Loading billing information...</div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 backdrop-blur-md">
        <p className="text-yellow-300">No subscription information available</p>
      </div>
    );
  }

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'enterprise':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/50';
      case 'pro':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/50';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-300';
      case 'canceled':
        return 'text-red-300';
      case 'past_due':
        return 'text-yellow-300';
      default:
        return 'text-gray-300';
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold mb-2 text-white">Billing & Subscription</h2>
        <p className="text-[hsl(var(--muted))]">Manage your TeamFlow subscription and resource usage</p>
      </div>

      <div className={`rounded-2xl border p-4 ${currentTier === 'free' ? 'border-blue-500/20 bg-blue-500/10' : 'border-emerald-500/20 bg-emerald-500/10'}`}>
        <div className="flex items-start gap-3">
          <CheckCircle2 className={`mt-0.5 h-5 w-5 ${currentTier === 'free' ? 'text-blue-300' : 'text-emerald-300'}`} />
          <div>
            <p className="text-sm font-semibold text-white">
              {currentTier === 'free' ? 'Free plan active' : `${currentTier.toUpperCase()} unlocked`}
            </p>
            <p className="text-sm text-[hsl(var(--muted))]">
              {currentTier === 'free'
                ? 'Upgrade to unlock premium workspaces, projects, and team limits.'
                : 'Your paid plan is active and the premium limits are enabled in the app.'}
            </p>
          </div>
        </div>
      </div>

      {/* Usage Dashboard */}
      <UsageDashboard />

      {message && (
        <div
          className={`p-4 rounded-lg border ${
            message.type === 'success'
              ? 'bg-green-50/10 border-green-500/30 text-green-300'
              : 'bg-red-50/10 border-red-500/30 text-red-300'
          }`}
        >
          <div className="flex gap-2">
            {message.type === 'success' ? (
              <Check className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <p>{message.text}</p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4 text-white">Current Plan</h3>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className={`px-3 py-1 rounded-full border text-sm font-semibold capitalize ${getPlanBadgeColor(subscription.plan)}`}>
                  {subscription.plan === 'free' ? 'Free Plan' : `${subscription.plan} Unlocked`}
                </span>
                <span className={`text-sm font-semibold capitalize ${getStatusColor(subscription.status)}`}>
                  {subscription.status}
                </span>
              </div>
              <p className="text-[hsl(var(--muted))] text-sm">
                Billing cycle starts: {new Date(subscription.currentPeriodStart).toLocaleDateString()}
              </p>
              <p className="text-[hsl(var(--muted))] text-sm">
                Billing cycle ends: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
              {subscription.cancelAtPeriodEnd && (
                <p className="text-yellow-300 text-sm mt-2">
                  ⚠️ Your subscription will be canceled at the end of your current billing period
                </p>
              )}
            </div>
            <CreditCard className="w-12 h-12 text-[hsl(var(--accent))]/50" />
          </div>
        </div>

        {subscription.plan !== 'free' && subscription.status === 'active' && !subscription.cancelAtPeriodEnd && (
          <div className="border-t border-white/10 pt-4">
            <h3 className="text-lg font-semibold mb-4 text-white">Manage Subscription</h3>
            <button
              onClick={handleCancelSubscription}
              disabled={canceling}
              className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/50 rounded-xl py-3 font-semibold disabled:opacity-50 transition"
            >
              {canceling ? 'Canceling...' : 'Cancel Subscription'}
            </button>
            <p className="text-sm text-[hsl(var(--muted))] mt-2">
              Your access will continue until the end of your billing period
            </p>
          </div>
        )}

        {subscription.cancelAtPeriodEnd && (
          <div className="border-t border-white/10 pt-4 bg-yellow-500/10 p-4 rounded-lg border border-yellow-500/30">
            <p className="text-sm text-yellow-300">
              Your subscription is scheduled to cancel on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 backdrop-blur-md">
        <p className="text-blue-300 text-sm">
          <strong>💡 Tip:</strong> You can upgrade your plan at any time. Your billing will be adjusted proportionally.
        </p>
      </div>
    </div>
  );
}
