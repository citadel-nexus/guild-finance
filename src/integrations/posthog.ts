// ─── CGRF Header ───────────────────────────────────────────────
// File:        src/integrations/posthog.ts
// Stage:       07_BUILD
// SRS:         SRS-CN-FINANCE-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-finance
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     src/integrations/contracts.ts, posthog-node
// EnumType:    Adapter
// EnumEdges:   DEPENDS_ON src/integrations/contracts.ts; PRODUCES PostHog sanitized guild activity
// DAG Node:    finance.integrations.posthog
// Intent:      Track public-safe floor operations and fail closed on integration feature flags.
// ───────────────────────────────────────────────────────────────

import { PostHog } from 'posthog-node';

import { logWarn } from '../logging.js';
import type {
  ActivityAnalytics,
  FeatureGate,
  IntegrationHealthRegistry,
  SanitizedGuildActivity,
} from './contracts.js';

const FLOOR_DISTINCT_ID = 'finance-floor';

export class PostHogIntegration implements ActivityAnalytics, FeatureGate {
  public constructor(
    private readonly client: PostHog,
    private readonly health: IntegrationHealthRegistry,
  ) {
    health.set('posthog', 'healthy');
  }

  public async capture(activity: SanitizedGuildActivity): Promise<void> {
    try {
      this.client.capture({
        distinctId: FLOOR_DISTINCT_ID,
        event: `finance_${activity.type}`,
        properties: {
          source: activity.source,
          status: activity.status,
          units: activity.units,
          occurred_at: activity.occurred_at,
        },
      });
      this.health.set('posthog', 'healthy');
    } catch (error) {
      this.degrade(error);
    }
  }

  public async enabled(flag: string): Promise<boolean> {
    try {
      const value = await this.client.getFeatureFlag(flag, FLOOR_DISTINCT_ID, {
        personProperties: { guild: 'finance', surface: 'living-world' },
      });
      this.health.set('posthog', 'healthy');
      return value === true;
    } catch (error) {
      this.degrade(error);
      return false;
    }
  }

  public async close(): Promise<void> {
    await this.client.shutdown();
  }

  private degrade(error: unknown): void {
    this.health.set('posthog', 'degraded');
    logWarn('posthog_degraded', { error_type: error instanceof Error ? error.name : 'UnknownError' });
  }
}

export class DisabledPostHog implements ActivityAnalytics, FeatureGate {
  public constructor(health: IntegrationHealthRegistry) {
    health.set('posthog', 'disabled');
  }

  public async capture(): Promise<void> {
    return Promise.resolve();
  }

  public async enabled(): Promise<boolean> {
    return false;
  }

  public async close(): Promise<void> {
    return Promise.resolve();
  }
}

export function createPostHogIntegration(
  health: IntegrationHealthRegistry,
  env: NodeJS.ProcessEnv = process.env,
): PostHogIntegration | DisabledPostHog {
  const apiKey = env.POSTHOG_API_KEY;
  const host = env.POSTHOG_HOST;
  if (apiKey === undefined || host === undefined) return new DisabledPostHog(health);
  return new PostHogIntegration(new PostHog(apiKey, { host }), health);
}
