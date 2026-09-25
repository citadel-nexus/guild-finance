// ─── CGRF Header ───────────────────────────────────────────────
// File:        src/mobile/product-analytics.ts
// Stage:       07_BUILD
// SRS:         SRS-CN-FINANCE-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-finance
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     posthog-js, GET /realm/finance.json
// EnumType:    Adapter
// EnumEdges:   CONSUMES GET /realm/finance.json; PRODUCES PostHog mobile engagement
// DAG Node:    finance.mobile.analytics
// Intent:      Measure anonymous mobile and realm engagement with deployment-supplied PostHog configuration.
// ───────────────────────────────────────────────────────────────

import { posthog } from 'posthog-js';

export interface MobileAnalyticsConfig {
  readonly api_host: string;
  readonly api_key: string;
}

export interface MobileAnalytics {
  realmEnabled(): Promise<boolean>;
  realmViewed(activityLevel: number, questCount: number): void;
}

class DisabledMobileAnalytics implements MobileAnalytics {
  public async realmEnabled(): Promise<boolean> {
    return Promise.resolve(true);
  }

  public realmViewed(): void {}
}

class PostHogMobileAnalytics implements MobileAnalytics {
  public constructor(config: MobileAnalyticsConfig) {
    posthog.init(config.api_key, {
      api_host: config.api_host,
      autocapture: false,
      capture_pageview: false,
      person_profiles: 'identified_only',
    });
    posthog.capture('finance_mobile_loaded', { guild: 'finance' });
  }

  public async realmEnabled(): Promise<boolean> {
    return new Promise((resolve) => {
      const subscription: { close?: () => void } = {};
      let settled = false;
      const finish = (enabled: boolean): void => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        subscription.close?.();
        resolve(enabled);
      };
      const timeout = window.setTimeout(() => finish(false), 2_000);
      subscription.close = posthog.onFeatureFlags((_flags, _variants, metadata) => {
        finish(metadata?.errorsLoading !== true && posthog.getFeatureFlag('finance-mobile-realm-feed') === true);
      });
      posthog.reloadFeatureFlags();
    });
  }

  public realmViewed(activityLevel: number, questCount: number): void {
    posthog.capture('finance_realm_viewed', {
      activity_state: activityLevel === 0 ? 'quiet' : 'active',
      quest_count: questCount,
    });
  }
}

export function initializeMobileAnalytics(config: MobileAnalyticsConfig | undefined): MobileAnalytics {
  if (config === undefined || config.api_key.length === 0 || config.api_host.length === 0) {
    return new DisabledMobileAnalytics();
  }
  return new PostHogMobileAnalytics(config);
}
