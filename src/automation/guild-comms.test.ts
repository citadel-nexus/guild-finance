// ─── CGRF Header ───────────────────────────────────────────────
// File:        src/automation/guild-comms.test.ts
// Stage:       08_TEST
// SRS:         SRS-CN-FINANCE-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-finance
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     src/automation/guild-comms.ts
// EnumType:    Test
// EnumEdges:   VALIDATES src/automation/guild-comms.ts
// DAG Node:    finance.guild.comms.test
// Intent:      Verify count-only message schemas and the canonical Finance broadcast subject.
// ───────────────────────────────────────────────────────────────

import { StringCodec, type Msg, type NatsConnection, type Subscription } from 'nats';
import { describe, expect, it, vi } from 'vitest';

import { GUILD_COMMS_SUBJECTS } from '../config.js';
import { AllowAllFeatureGate, IntegrationHealthRegistry } from '../integrations/contracts.js';
import { createGuildCommsBridge, GuildCommsBridge, sanitizeCommissionClaim } from './guild-comms.js';

describe('guild communications', () => {
  it('allowlists commission claim schema and rejects private or malformed shapes', () => {
    expect(
      sanitizeCommissionClaim({
        schema_version: 1, type: 'commission_claim', source_guild: 'creator',
        claim_id: 'claim_1', claim_count: 2, status: 'open',
        observed_at: '2026-09-25T12:00:00.000Z', amount: 999,
      }),
    ).toMatchObject({ source_guild: 'creator', claim_count: 2, status: 'open' });
    expect(() => sanitizeCommissionClaim({ source_guild: 'bad guild' })).toThrow(TypeError);
  });

  it('broadcasts count-only revenue health on the canonical NATS subject', async () => {
    const publish = vi.fn();
    const flush = vi.fn().mockResolvedValue(undefined);
    const connection = { publish, flush } as unknown as NatsConnection;
    const bridge = new GuildCommsBridge(connection, { record: vi.fn() }, new IntegrationHealthRegistry());
    const message = {
      schema_version: 1, type: 'revenue_health', source_guild: 'finance',
      reconciliation_count: 10, commission_count: 2, health: 'healthy',
      observed_at: '2026-09-25T12:00:00.000Z',
    } as const;
    await bridge.broadcast(message);
    expect(publish.mock.calls[0]?.[0]).toBe(GUILD_COMMS_SUBJECTS.revenueBroadcast);
    expect(JSON.parse(StringCodec().decode(publish.mock.calls[0]?.[1] as Uint8Array))).toEqual(message);
    await expect(bridge.broadcast({ ...message, commission_count: -1 })).rejects.toThrow(TypeError);
  });

  it('consumes matching claims and closes the subscription and connection', async () => {
    const codec = StringCodec();
    const messages = [
      {
        subject: 'citadel.guild.comms.creator.finance',
        data: codec.encode(JSON.stringify({
          schema_version: 1, type: 'commission_claim', source_guild: 'creator',
          claim_id: 'claim_2', claim_count: 3, status: 'closed',
          observed_at: '2026-09-25T12:00:00.000Z',
        })),
      },
      {
        subject: 'citadel.guild.comms.trade.finance',
        data: codec.encode(JSON.stringify({
          schema_version: 1, type: 'commission_claim', source_guild: 'trade',
          claim_id: 'claim_3', claim_count: 1, status: 'open',
          observed_at: '2026-09-25T12:01:00.000Z',
        })),
      },
    ];
    const unsubscribe = vi.fn();
    const subscription = {
      unsubscribe,
      async *[Symbol.asyncIterator](): AsyncIterator<Msg> {
        for (const message of messages) yield message as Msg;
      },
    } as unknown as Subscription;
    const drain = vi.fn().mockResolvedValue(undefined);
    const connection = { subscribe: vi.fn().mockReturnValue(subscription), drain } as unknown as NatsConnection;
    const record = vi.fn().mockResolvedValue(undefined);
    const health = new IntegrationHealthRegistry();
    const bridge = new GuildCommsBridge(connection, { record }, health);

    bridge.start();
    await vi.waitFor(() => expect(record).toHaveBeenCalledTimes(2));
    expect(record).toHaveBeenCalledWith(expect.objectContaining({
      source: 'guild_comms', type: 'commission_calculation', units: 3, quest_state: 'closed',
    }));
    await bridge.close();
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(drain).toHaveBeenCalledOnce();
  });

  it('creates only authorized connections and degrades connector failures', async () => {
    const health = new IntegrationHealthRegistry();
    const sink = { record: vi.fn() };
    const connector = vi.fn().mockRejectedValue(new Error('offline'));
    await expect(createGuildCommsBridge(undefined, new AllowAllFeatureGate(), sink, health, connector)).resolves.toBeNull();
    expect(connector).not.toHaveBeenCalled();
    await expect(createGuildCommsBridge(
      'nats://public.test', { enabled: vi.fn().mockResolvedValue(false) }, sink, health, connector,
    )).resolves.toBeNull();
    expect(connector).not.toHaveBeenCalled();
    await expect(createGuildCommsBridge('nats://public.test', new AllowAllFeatureGate(), sink, health, connector)).resolves.toBeNull();
    expect(health.snapshot().find((item) => item.name === 'guild_comms')?.status).toBe('degraded');
  });

  it('starts a bridge after an authorized connector succeeds', async () => {
    const subscription = {
      unsubscribe: vi.fn(),
      async *[Symbol.asyncIterator](): AsyncIterator<Msg> {},
    } as unknown as Subscription;
    const connection = {
      subscribe: vi.fn().mockReturnValue(subscription),
      drain: vi.fn().mockResolvedValue(undefined),
    } as unknown as NatsConnection;
    const connector = vi.fn().mockResolvedValue(connection);
    const health = new IntegrationHealthRegistry();
    const bridge = await createGuildCommsBridge(
      'nats://public.test', new AllowAllFeatureGate(), { record: vi.fn() }, health, connector,
    );
    expect(bridge).toBeInstanceOf(GuildCommsBridge);
    expect(health.snapshot()[0]?.status).toBe('healthy');
    await bridge?.close();
  });
});
