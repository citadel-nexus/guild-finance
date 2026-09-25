// ─── CGRF Header ───────────────────────────────────────────────
// File:        src/automation/guild-comms.ts
// Stage:       07_BUILD
// SRS:         SRS-CN-FINANCE-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-finance
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     src/config.ts, src/integrations/contracts.ts, nats
// EnumType:    Service
// EnumEdges:   PRODUCES citadel.guild.comms.finance.broadcast; CONSUMES citadel.guild.comms.*.finance
// DAG Node:    finance.guild.comms
// Intent:      Broadcast count-only revenue health and receive sanitized commission claims from peer guilds.
// ───────────────────────────────────────────────────────────────

import { createHash } from 'node:crypto';
import { connect, StringCodec, type NatsConnection, type Subscription } from 'nats';

import { GUILD_COMMS_SUBJECTS } from '../config.js';
import type { FeatureGate, GuildActivitySink, IntegrationHealthRegistry } from '../integrations/contracts.js';
import { logWarn } from '../logging.js';

export interface RevenueHealthBroadcast {
  readonly commission_count: number;
  readonly health: 'critical' | 'healthy' | 'warning';
  readonly observed_at: string;
  readonly reconciliation_count: number;
  readonly schema_version: 1;
  readonly source_guild: 'finance';
  readonly type: 'revenue_health';
}

export interface CommissionClaim {
  readonly claim_count: number;
  readonly claim_id: string;
  readonly observed_at: string;
  readonly schema_version: 1;
  readonly source_guild: string;
  readonly status: 'closed' | 'open';
  readonly type: 'commission_claim';
}

export class GuildCommsBridge {
  private readonly codec = StringCodec();
  private subscription: Subscription | null = null;

  public constructor(
    private readonly connection: NatsConnection,
    private readonly sink: GuildActivitySink,
    private readonly health: IntegrationHealthRegistry,
  ) {}

  public start(): void {
    this.subscription = this.connection.subscribe(GUILD_COMMS_SUBJECTS.commissionClaims);
    void this.consume(this.subscription);
    this.health.set('guild_comms', 'healthy');
  }

  public async broadcast(message: RevenueHealthBroadcast): Promise<void> {
    validateBroadcast(message);
    this.connection.publish(
      GUILD_COMMS_SUBJECTS.revenueBroadcast,
      this.codec.encode(JSON.stringify(message)),
    );
    await this.connection.flush();
  }

  public async close(): Promise<void> {
    this.subscription?.unsubscribe();
    await this.connection.drain();
  }

  private async consume(subscription: Subscription): Promise<void> {
    try {
      for await (const message of subscription) {
        const sourceGuild = message.subject.split('.')[3];
        const claim = sanitizeCommissionClaim(JSON.parse(this.codec.decode(message.data)) as unknown);
        if (sourceGuild === undefined || claim.source_guild !== sourceGuild) continue;
        await this.sink.record({
          source: 'guild_comms',
          type: 'commission_calculation',
          status: claim.status === 'open' ? 'opened' : 'completed',
          units: claim.claim_count,
          opaque_id: opaqueClaimId(claim.source_guild, claim.claim_id),
          occurred_at: claim.observed_at,
          quest_state: claim.status,
        });
      }
    } catch (error) {
      this.health.set('guild_comms', 'degraded');
      logWarn('guild_comms_degraded', { error_type: error instanceof Error ? error.name : 'UnknownError' });
    }
  }
}

export async function createGuildCommsBridge(
  natsUrl: string | undefined,
  gate: FeatureGate,
  sink: GuildActivitySink,
  health: IntegrationHealthRegistry,
  connector: typeof connect = connect,
): Promise<GuildCommsBridge | null> {
  if (natsUrl === undefined || !(await gate.enabled('finance-guild-comms'))) {
    health.set('guild_comms', 'disabled');
    return null;
  }
  try {
    const bridge = new GuildCommsBridge(await connector({ servers: natsUrl }), sink, health);
    bridge.start();
    return bridge;
  } catch (error) {
    health.set('guild_comms', 'degraded');
    logWarn('guild_comms_degraded', { error_type: error instanceof Error ? error.name : 'UnknownError' });
    return null;
  }
}

export function sanitizeCommissionClaim(value: unknown): CommissionClaim {
  if (!isRecord(value)) throw new TypeError('commission claim must be an object');
  if (
    value.schema_version !== 1 ||
    value.type !== 'commission_claim' ||
    typeof value.source_guild !== 'string' ||
    !/^[a-z][a-z0-9-]{0,31}$/.test(value.source_guild) ||
    typeof value.claim_id !== 'string' ||
    !/^[A-Za-z0-9_-]{1,80}$/.test(value.claim_id) ||
    (value.status !== 'open' && value.status !== 'closed') ||
    typeof value.claim_count !== 'number' ||
    !Number.isSafeInteger(value.claim_count) ||
    value.claim_count <= 0 ||
    typeof value.observed_at !== 'string' ||
    Number.isNaN(Date.parse(value.observed_at))
  ) throw new TypeError('commission claim does not match the public schema');
  return value as unknown as CommissionClaim;
}

function validateBroadcast(value: RevenueHealthBroadcast): void {
  if (
    !Number.isSafeInteger(value.reconciliation_count) ||
    value.reconciliation_count < 0 ||
    !Number.isSafeInteger(value.commission_count) ||
    value.commission_count < 0 ||
    Number.isNaN(Date.parse(value.observed_at))
  ) throw new TypeError('revenue health message is invalid');
}

function opaqueClaimId(guild: string, claimId: string): string {
  return `claim-${createHash('sha256').update(`${guild}:${claimId}`).digest('hex').slice(0, 16)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
