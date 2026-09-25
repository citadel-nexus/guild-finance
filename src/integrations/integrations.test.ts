// ─── CGRF Header ───────────────────────────────────────────────
// File:        src/integrations/integrations.test.ts
// Stage:       08_TEST
// SRS:         SRS-CN-FINANCE-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-finance
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     src/integrations/contracts.ts, src/integrations/customer-io.ts, src/integrations/gitlab.ts, src/integrations/posthog.ts, src/integrations/supabase.ts
// EnumType:    Test
// EnumEdges:   VALIDATES src/integrations/contracts.ts; VALIDATES src/integrations/customer-io.ts; VALIDATES src/integrations/gitlab.ts; VALIDATES src/integrations/posthog.ts; VALIDATES src/integrations/supabase.ts
// DAG Node:    finance.integrations.test
// Intent:      Prove provider payload sanitization, feature gates, notifications, health, and fail-soft behavior.
// ───────────────────────────────────────────────────────────────

import type { PostHog } from 'posthog-node';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import { FinanceLivingWorld, NoopFloorPublisher } from '../automation/livingworld-emitter.js';
import { FinanceFloorState } from '../finance-floor.js';
import {
  AllowAllFeatureGate,
  FinanceActivitySink,
  IntegrationHealthRegistry,
  RollingActivityProjector,
  type GuildActivitySink,
  type SanitizedGuildActivity,
} from './contracts.js';
import { CustomerIoIntegration } from './customer-io.js';
import { createGitLabBridge, GitLabReadOnlyBridge, sanitizeProjection } from './gitlab.js';
import { createPostHogIntegration, DisabledPostHog, PostHogIntegration } from './posthog.js';
import { createSupabaseBridge, sanitizeSupabaseActivity, SupabaseActivityBridge } from './supabase.js';

describe('integration contracts', () => {
  it('projects observed units over a rolling window without fabricated input', () => {
    let now = new Date('2026-09-25T12:00:00.000Z');
    const projector = new RollingActivityProjector(() => now, 1_000, 10);
    expect(projector.observe(2)).toBe(0.2);
    expect(projector.observe(20)).toBe(1);
    now = new Date('2026-09-25T12:00:01.001Z');
    expect(projector.observe(1)).toBe(0.1);
    expect(() => projector.observe(0)).toThrow(RangeError);
    expect(() => new RollingActivityProjector(() => now, 0, 1)).toThrow(RangeError);
  });

  it('drives floor activity, progression, quests, and analytics from sanitized events', async () => {
    const floor = new FinanceLivingWorld(new FinanceFloorState(), new NoopFloorPublisher());
    const capture = vi.fn().mockResolvedValue(undefined);
    const sink = new FinanceActivitySink(
      floor,
      new RollingActivityProjector(() => new Date(), 60_000, 100),
      { capture },
    );
    const event: SanitizedGuildActivity = {
      source: 'supabase',
      type: 'revenue_reconciliation',
      status: 'completed',
      units: 100,
      opaque_id: 'event_1',
      occurred_at: '2026-09-25T12:00:00.000Z',
      quest_state: 'closed',
    };
    await sink.record(event);
    expect(floor.realm()).toMatchObject({
      activity_level: 1,
      quests: [{ id: 'event_1', title: 'Revenue reconciliation', state: 'closed' }],
    });
    expect(capture).toHaveBeenCalledWith(event);
    await expect(sink.record({ ...event, opaque_id: 'bad id' })).rejects.toThrow(TypeError);
  });
});

describe('CustomerIoIntegration', () => {
  it('segments finance members and sends count-only notification hooks', async () => {
    const request = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    const health = new IntegrationHealthRegistry();
    const client = new CustomerIoIntegration(
      { site_id: 'site', api_key: 'key', track_url: 'https://customer.test/api/v1/' },
      new AllowAllFeatureGate(),
      health,
      request,
    );
    const recipient = { member_id: 'member_opaque', financial_role: 'treasurer' } as const;
    await expect(client.segment(recipient)).resolves.toBe(true);
    await expect(client.revenueMilestone(recipient, 2)).resolves.toBe(true);
    await expect(client.forecastSummary(recipient, 0)).resolves.toBe(true);
    await expect(client.commissionPayout(recipient, 3)).resolves.toBe(true);
    await expect(client.meetingReminder(recipient, 15)).resolves.toBe(true);
    expect(request).toHaveBeenCalledTimes(5);
    expect(String(request.mock.calls[0]?.[0])).toBe('https://customer.test/api/v1/customers/member_opaque');
    expect(health.snapshot()[0]?.status).toBe('healthy');
    await expect(client.segment({ ...recipient, member_id: 'private email' })).rejects.toThrow(TypeError);
    await expect(client.revenueMilestone(recipient, 0)).rejects.toThrow(RangeError);
  });

  it('fails soft when the feature flag is off or the provider throws', async () => {
    const health = new IntegrationHealthRegistry();
    const disabled = new CustomerIoIntegration(
      { site_id: 'site', api_key: 'key', track_url: 'https://customer.test/' },
      { enabled: vi.fn().mockResolvedValue(false) },
      health,
      vi.fn(),
    );
    await expect(disabled.forecastSummary({ member_id: 'm1', financial_role: 'member' }, 1)).resolves.toBe(false);
    const failed = new CustomerIoIntegration(
      { site_id: 'site', api_key: 'key', track_url: 'https://customer.test/' },
      new AllowAllFeatureGate(),
      health,
      vi.fn().mockRejectedValue(new Error('offline')),
    );
    await expect(failed.commissionPayout({ member_id: 'm1', financial_role: 'analyst' }, 1)).resolves.toBe(false);
  });
});

describe('GitLabReadOnlyBridge', () => {
  it('sanitizes config, pipeline, and merge request activity', async () => {
    const responses = [
      { revision: 'v2', integrations: { supabase: true, stripe: false } },
      [{ status: 'success', private_data: 'ignored' }],
      [{ iid: 7, title: 'private title' }],
    ];
    const request = vi.fn().mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify(responses.shift()), { status: 200 })),
    );
    const recorded: SanitizedGuildActivity[] = [];
    const sink: GuildActivitySink = { record: async (activity) => void recorded.push(activity) };
    const health = new IntegrationHealthRegistry();
    const bridge = new GitLabReadOnlyBridge(
      { base_url: 'https://gitlab.test', project_id: '75', read_token: 'runtime', config_path: 'finance.json', ref: 'main' },
      new AllowAllFeatureGate(),
      sink,
      health,
      request,
      () => new Date('2026-09-25T12:00:00.000Z'),
    );
    await expect(bridge.sync()).resolves.toEqual({
      financial_config: { enabled_integration_count: 1, revision: 'v2' },
      open_merge_requests: 1,
      pipeline_status: 'success',
    });
    expect(recorded[0]).toMatchObject({ source: 'gitlab', type: 'merge_request', quest_state: 'open' });
    expect(JSON.stringify(recorded)).not.toContain('private title');
    expect(request).toHaveBeenCalledTimes(3);
  });

  it('returns a safe projection for malformed private payloads', () => {
    expect(sanitizeProjection({ revision: 'bad revision!', integrations: {} }, [{ status: 'secret' }], null)).toEqual({
      financial_config: { enabled_integration_count: 0, revision: 'unavailable' },
      open_merge_requests: 0,
      pipeline_status: 'unknown',
    });
  });

  it('disables missing configuration and fails soft when reads are gated or unavailable', async () => {
    const health = new IntegrationHealthRegistry();
    const sink = { record: vi.fn() };
    expect(createGitLabBridge(new AllowAllFeatureGate(), sink, health, {})).toBeNull();
    const gated = new GitLabReadOnlyBridge(
      { base_url: 'https://gitlab.test', project_id: '75', read_token: 'runtime', config_path: 'finance.json', ref: 'main' },
      { enabled: vi.fn().mockResolvedValue(false) }, sink, health, vi.fn(),
    );
    await expect(gated.sync()).resolves.toBeNull();
    const unavailable = new GitLabReadOnlyBridge(
      { base_url: 'https://gitlab.test', project_id: '75', read_token: 'runtime', config_path: 'finance.json', ref: 'main' },
      new AllowAllFeatureGate(), sink, health, vi.fn().mockRejectedValue(new Error('offline')),
    );
    await expect(unavailable.sync()).resolves.toBeNull();
    expect(health.snapshot().find((item) => item.name === 'gitlab')?.status).toBe('degraded');
  });
});

describe('Supabase activity boundary', () => {
  it('allowlists sanitized outbox fields and drops raw records', () => {
    expect(
      sanitizeSupabaseActivity({
        event_type: 'transaction_observed',
        status: 'completed',
        units: 2,
        opaque_id: 'txn_1',
        occurred_at: '2026-09-25T12:00:00.000Z',
        quest_state: 'closed',
        amount: 999,
        tenant_id: 'private',
      }),
    ).toEqual({
      source: 'supabase',
      type: 'transaction_observed',
      status: 'completed',
      units: 2,
      opaque_id: 'txn_1',
      occurred_at: '2026-09-25T12:00:00.000Z',
      quest_state: 'closed',
    });
    expect(sanitizeSupabaseActivity({ event_type: 'unknown' })).toBeNull();
  });

  it('rejects unsafe configured table names before creating a client', () => {
    const health = new IntegrationHealthRegistry();
    expect(
      createSupabaseBridge(new AllowAllFeatureGate(), { record: vi.fn() }, health, {
        SUPABASE_URL: 'https://supabase.test',
        SUPABASE_ANON_KEY: 'runtime',
        SUPABASE_FINANCE_ACTIVITY_TABLE: 'private.table',
      }),
    ).toBeNull();
    expect(health.snapshot()[0]?.status).toBe('degraded');
  });

  it('records realtime outbox events and degrades callback failures without rejecting startup', async () => {
    let receive: ((payload: { readonly new: unknown }) => void) | undefined;
    const channel = {
      on: vi.fn((_type, _filter, callback: (payload: { readonly new: unknown }) => void) => {
        receive = callback;
        return channel;
      }),
      subscribe: vi.fn((callback: (status: string) => void) => {
        callback('SUBSCRIBED');
        return channel;
      }),
    } as unknown as RealtimeChannel;
    const client = {
      channel: vi.fn().mockReturnValue(channel),
      removeChannel: vi.fn().mockResolvedValue('ok'),
    } as unknown as SupabaseClient;
    const record = vi.fn().mockRejectedValue(new Error('floor unavailable'));
    const health = new IntegrationHealthRegistry();
    const bridge = new SupabaseActivityBridge(
      { url: 'https://supabase.test', anon_key: 'runtime', public_activity_table: 'finance_activity' },
      new AllowAllFeatureGate(),
      { record },
      health,
      client,
    );

    await expect(bridge.start()).resolves.toBe(true);
    receive?.({
      new: {
        event_type: 'transaction_observed', status: 'completed', units: 1,
        opaque_id: 'txn_2', occurred_at: '2026-09-25T12:00:00.000Z',
      },
    });
    await vi.waitFor(() => expect(record).toHaveBeenCalledOnce());
    await vi.waitFor(() => expect(health.snapshot()[0]?.status).toBe('degraded'));
    await bridge.close();
    expect(client.removeChannel).toHaveBeenCalledWith(channel);
  });
});

describe('PostHogIntegration', () => {
  it('tracks allowlisted activity and uses boolean flags as circuit breakers', async () => {
    const client = {
      capture: vi.fn(),
      getFeatureFlag: vi.fn().mockResolvedValue(true),
      shutdown: vi.fn().mockResolvedValue(undefined),
    } as unknown as PostHog;
    const health = new IntegrationHealthRegistry();
    const integration = new PostHogIntegration(client, health);
    await integration.capture({
      source: 'n8n', type: 'forecast_run', status: 'completed', units: 1,
      opaque_id: 'forecast_1', occurred_at: '2026-09-25T12:00:00.000Z',
    });
    await expect(integration.enabled('finance-n8n-webhooks')).resolves.toBe(true);
    await integration.close();
    expect(client.capture).toHaveBeenCalledWith(expect.objectContaining({ event: 'finance_forecast_run' }));
    expect(client.shutdown).toHaveBeenCalledOnce();
    const disabled = new DisabledPostHog(health);
    await expect(disabled.enabled('flag')).resolves.toBe(false);
    await expect(disabled.capture({} as SanitizedGuildActivity)).resolves.toBeUndefined();
    await disabled.close();
  });

  it('fails flags closed and degrades analytics exceptions', async () => {
    const client = {
      capture: vi.fn(() => { throw new Error('offline'); }),
      getFeatureFlag: vi.fn().mockRejectedValue(new Error('offline')),
      shutdown: vi.fn().mockResolvedValue(undefined),
    } as unknown as PostHog;
    const health = new IntegrationHealthRegistry();
    const integration = new PostHogIntegration(client, health);
    await integration.capture({
      source: 'n8n', type: 'commission_calculation', status: 'completed', units: 1,
      opaque_id: 'commission_1', occurred_at: '2026-09-25T12:00:00.000Z',
    });
    await expect(integration.enabled('finance-customer-io')).resolves.toBe(false);
    expect(health.snapshot().find((item) => item.name === 'posthog')?.status).toBe('degraded');
    expect(createPostHogIntegration(health, {})).toBeInstanceOf(DisabledPostHog);
  });
});
