// =============================================================================
// ZURT - Stripe Service
// Wraps Stripe API calls with expo-web-browser for checkout/portal flows
// =============================================================================

import * as WebBrowser from 'expo-web-browser';
import {
  fetchStripePlans,
  createStripeCheckout,
  createStripeCustomerPortal,
  fetchStripeSubscriptionStatus,
} from './api';

export const stripeService = {
  /** Fetch investor plans (Basic, PRO, Unlimited, Enterprise) */
  async getInvestorPlans() {
    return fetchStripePlans('customer');
  },

  /** Fetch consultant plans (only Banker) */
  async getConsultantPlans() {
    const plans = await fetchStripePlans('consultant');
    return plans.filter((p: any) => p.code === 'banker');
  },

  /** Open Stripe Checkout in the in-app browser */
  async openCheckout(planId: string, billing: 'monthly' | 'annual' = 'monthly') {
    const data = await createStripeCheckout(planId, billing);
    if (data?.url) {
      await WebBrowser.openBrowserAsync(data.url);
    }
  },

  /** Open Stripe Customer Portal to manage subscription */
  async openCustomerPortal() {
    const data = await createStripeCustomerPortal();
    if (data?.url) {
      await WebBrowser.openBrowserAsync(data.url);
    }
  },

  /** Get current subscription status */
  async getSubscriptionStatus() {
    return fetchStripeSubscriptionStatus();
  },
};
