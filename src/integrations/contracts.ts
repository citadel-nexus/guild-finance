// ─── CGRF Header ───────────────────────────────────────────────
// File:        src/integrations/contracts.ts
// Stage:       07_BUILD
// SRS:         SRS-CN-FINANCE-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-finance
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     src/automation/livingworld-emitter.ts, src/progression.ts
// EnumType:    Adapter
// EnumEdges:   DEPENDS_ON src/automation/livingworld-emitter.ts; DEPENDS_ON src/progression.ts
// DAG Node:    finance.integrations.contracts
// Intent:      Enforce one sanitized public contract between private providers and the living-world floor.
// ───────────────────────────────────────────────────────────────

import type { FinanceLivingWorld } from '../automation/livingworld-emitter.js';
import type { QuestState } from '../finance-floor.js';
import type { ProgressionMetric } from '../progression.js';

export type IntegrationName =
  | 'customer_io'
  | 'gitlab'
  | 'guild_comms'
  | 'n8n'
  | 'posthog'
  | 'supabase';

export type IntegrationStatus = 'degraded' | 'disabled' | 'healthy';

export type GuildActivityType =
  | 'commission_calculation'
  | 'forecast_run'
  | 'meeting_managed'
  | 'merge_request'
  | 'revenue_reconciliation'
  | 'transaction_observed';

export interface SanitizedGuildActivity {
  readonly occurred_at: string;
  readonly opaque_id: string;
  readonly quest_state?: QuestState;
  readonly source: IntegrationName;
  readonly status: 'blocked' | 'completed' | 'failed' | 'opened';
  readonly type: GuildActivityType;
  readonly units: number;
}

export interface FeatureGate {
  enabled(flag: string): Promise<boolean>;
}

export interface ActivityAnalytics {
  capture(activity: SanitizedGuildActivity): Promise<void>;
}

export interface GuildActivitySink {
  record(activity: SanitizedGuildActivity): Promise<void>;
}

export interface IntegrationHealth {
  readonly checked_at: string;
  readonly name: IntegrationName;
  readonly status: IntegrationStatus;
}

export class IntegrationHealthRegistry {
  private readonly states = new Map<IntegrationName, IntegrationHealth>();

  public set(name: IntegrationName, status: IntegrationStatus, checkedAt = new Date()): void {
    this.states.set(name, { name, status, checked_at: checkedAt.toISOString() });
  }

  public snapshot(): readonly IntegrationHealth[] {
    return [...this.states.values()].sort((left, right) => left.name.localeCompare(right.name));
  }
}

export class RollingActivityProjector {
  private readonly observations: Array<{ readonly at: number; readonly units: number }> = [];

  public constructor(
    private readonly clock: () => Date = () => new Date(),
    private readonly windowMs = 300_000,
    private readonly saturationUnits = 100,
  ) {
    if (windowMs <= 0 || saturationUnits <= 0) throw new RangeError('activity projection bounds must be positive');
  }

  public observe(units: number): number {
    if (!Number.isSafeInteger(units) || units <= 0) throw new RangeError('activity units must be a positive safe integer');
    const now = this.clock().getTime();
    this.observations.push({ at: now, units });
    while (this.observations[0]?.at !== undefined && now - this.observations[0].at > this.windowMs) {
      this.observations.shift();
    }
    const observedUnits = this.observations.reduce((total, observation) => total + observation.units, 0);
    return Math.min(1, observedUnits / this.saturationUnits);
  }
}

export class FinanceActivitySink implements GuildActivitySink {
  public constructor(
    private readonly floor: FinanceLivingWorld,
    private readonly projector: RollingActivityProjector,
    private readonly analytics: ActivityAnalytics,
  ) {}

  public async record(activity: SanitizedGuildActivity): Promise<void> {
    validateActivity(activity);
    await this.floor.heartbeat(this.projector.observe(activity.units));
    const metric = progressionMetric(activity.type);
    if (metric !== null && activity.status === 'completed') this.floor.recordProgress(metric, activity.units);
    if (activity.quest_state !== undefined) {
      await this.floor.updateQuest({
        id: activity.opaque_id,
        state: activity.quest_state,
        title: questTitle(activity.type),
      });
    }
    await this.analytics.capture(activity);
  }
}

export class AllowAllFeatureGate implements FeatureGate {
  public async enabled(): Promise<boolean> {
    return true;
  }
}

export class NoopActivityAnalytics implements ActivityAnalytics {
  public async capture(): Promise<void> {
    return Promise.resolve();
  }
}

export function validateActivity(activity: SanitizedGuildActivity): void {
  if (!Number.isSafeInteger(activity.units) || activity.units <= 0) throw new RangeError('activity units must be positive');
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(activity.opaque_id)) throw new TypeError('activity id must be opaque');
  if (Number.isNaN(Date.parse(activity.occurred_at))) throw new TypeError('activity timestamp must be ISO-8601');
}

function progressionMetric(type: GuildActivityType): ProgressionMetric | null {
  const metrics: Partial<Record<GuildActivityType, ProgressionMetric>> = {
    commission_calculation: 'commissions_attributed',
    forecast_run: 'forecasts_generated',
    meeting_managed: 'meetings_managed',
    revenue_reconciliation: 'revenue_processed',
    transaction_observed: 'revenue_processed',
  };
  return metrics[type] ?? null;
}

function questTitle(type: GuildActivityType): string {
  const titles: Record<GuildActivityType, string> = {
    commission_calculation: 'Commission attribution',
    forecast_run: 'Finance forecast',
    meeting_managed: 'Finance meeting',
    merge_request: 'Finance merge request review',
    revenue_reconciliation: 'Revenue reconciliation',
    transaction_observed: 'Transaction processing',
  };
  return titles[type];
}
