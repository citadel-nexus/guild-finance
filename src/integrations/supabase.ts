// ─── CGRF Header ───────────────────────────────────────────────
// File:        src/integrations/supabase.ts
// Stage:       07_BUILD
// SRS:         SRS-CN-FINANCE-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-finance
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     src/integrations/contracts.ts, @supabase/supabase-js
// EnumType:    Adapter
// EnumEdges:   DEPENDS_ON src/integrations/contracts.ts; CONSUMES sanitized Supabase activity outbox
// DAG Node:    finance.integrations.supabase
// Intent:      Convert RLS-protected transaction outbox events into count-only floor activity and quests.
// ───────────────────────────────────────────────────────────────

import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';

import { logWarn } from '../logging.js';
import type {
  FeatureGate,
  GuildActivitySink,
  IntegrationHealthRegistry,
  SanitizedGuildActivity,
} from './contracts.js';

export interface SupabaseConfig {
  readonly anon_key: string;
  readonly public_activity_table: string;
  readonly url: string;
}

export class SupabaseActivityBridge {
  private channel: RealtimeChannel | null = null;

  public constructor(
    private readonly config: SupabaseConfig,
    private readonly gate: FeatureGate,
    private readonly sink: GuildActivitySink,
    private readonly health: IntegrationHealthRegistry,
    private readonly client: SupabaseClient = createClient(config.url, config.anon_key, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  ) {}

  public async start(): Promise<boolean> {
    try {
      if (!(await this.gate.enabled('finance-supabase-realtime'))) {
        this.health.set('supabase', 'disabled');
        return false;
      }
      this.channel = this.client
        .channel('finance-public-activity')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: this.config.public_activity_table },
          (payload) => {
            const activity = sanitizeSupabaseActivity(payload.new);
            if (activity !== null) void this.recordSafely(activity);
          },
        )
        .subscribe((status) => {
          this.health.set('supabase', status === 'SUBSCRIBED' ? 'healthy' : 'degraded');
        });
      return true;
    } catch (error) {
      this.degrade(error);
      return false;
    }
  }

  public async close(): Promise<void> {
    if (this.channel !== null) await this.client.removeChannel(this.channel);
  }

  private async recordSafely(activity: SanitizedGuildActivity): Promise<void> {
    try {
      await this.sink.record(activity);
    } catch (error) {
      this.degrade(error);
    }
  }

  private degrade(error: unknown): void {
    this.health.set('supabase', 'degraded');
    logWarn('supabase_bridge_degraded', { error_type: error instanceof Error ? error.name : 'UnknownError' });
  }
}

export function createSupabaseBridge(
  gate: FeatureGate,
  sink: GuildActivitySink,
  health: IntegrationHealthRegistry,
  env: NodeJS.ProcessEnv = process.env,
): SupabaseActivityBridge | null {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_ANON_KEY;
  const table = env.SUPABASE_FINANCE_ACTIVITY_TABLE;
  if (url === undefined || key === undefined || table === undefined) {
    health.set('supabase', 'disabled');
    return null;
  }
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(table)) {
    health.set('supabase', 'degraded');
    logWarn('supabase_bridge_degraded', { reason: 'invalid_table_name' });
    return null;
  }
  try {
    return new SupabaseActivityBridge({ url, anon_key: key, public_activity_table: table }, gate, sink, health);
  } catch (error) {
    health.set('supabase', 'degraded');
    logWarn('supabase_bridge_degraded', { error_type: error instanceof Error ? error.name : 'UnknownError' });
    return null;
  }
}

export function sanitizeSupabaseActivity(value: unknown): SanitizedGuildActivity | null {
  if (!isRecord(value)) return null;
  const types = [
    'commission_calculation',
    'forecast_run',
    'meeting_managed',
    'revenue_reconciliation',
    'transaction_observed',
  ] as const;
  const statuses = ['blocked', 'completed', 'failed', 'opened'] as const;
  const type = types.find((candidate) => candidate === value.event_type);
  const status = statuses.find((candidate) => candidate === value.status);
  if (
    type === undefined ||
    status === undefined ||
    typeof value.opaque_id !== 'string' ||
    typeof value.occurred_at !== 'string' ||
    typeof value.units !== 'number'
  ) return null;
  const base: SanitizedGuildActivity = {
    source: 'supabase',
    type,
    status,
    units: value.units,
    opaque_id: value.opaque_id,
    occurred_at: value.occurred_at,
  };
  if (value.quest_state === 'open' || value.quest_state === 'closed') {
    return { ...base, quest_state: value.quest_state };
  }
  return base;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
