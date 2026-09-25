// ─── CGRF Header ───────────────────────────────────────────────
// File:        src/integrations/n8n-webhook.test.ts
// Stage:       08_TEST
// SRS:         SRS-CN-FINANCE-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-finance
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     src/integrations/n8n-webhook.ts
// EnumType:    Test
// EnumEdges:   VALIDATES src/integrations/n8n-webhook.ts
// DAG Node:    finance.integrations.n8n.test
// Intent:      Verify signed ingress, replay bounds, schema sanitization, and fail-closed responses.
// ───────────────────────────────────────────────────────────────

import { createHmac } from 'node:crypto';
import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { describe, expect, it, vi } from 'vitest';

import { AllowAllFeatureGate, IntegrationHealthRegistry } from './contracts.js';
import { N8nWebhookIntegration, sanitizeN8nEvent, verifySignature } from './n8n-webhook.js';

describe('n8n webhook', () => {
  it('accepts a current valid signature and rejects tampering or replay', () => {
    const body = '{"event":true}';
    const timestamp = '1790337600';
    const signature = `sha256=${createHmac('sha256', 'secret').update(`${timestamp}.${body}`).digest('hex')}`;
    const now = new Date('2026-09-25T12:00:00.000Z');
    expect(verifySignature(body, timestamp, signature, 'secret', now)).toBe(true);
    expect(verifySignature(`${body}x`, timestamp, signature, 'secret', now)).toBe(false);
    expect(verifySignature(body, '1790330000', signature, 'secret', now)).toBe(false);
    expect(verifySignature(body, `${timestamp}junk`, signature, 'secret', now)).toBe(false);
    expect(verifySignature(body, timestamp, 'sha256=bad', 'secret', now)).toBe(false);
  });

  it('sanitizes a workflow event and excludes unknown fields', () => {
    expect(
      sanitizeN8nEvent({
        event_type: 'forecast_generated', event_id: 'forecast_1', status: 'completed',
        observed_units: 1, occurred_at: '2026-09-25T12:00:00.000Z', quest_state: 'closed',
        amount: 999, tenant: 'private',
      }),
    ).toEqual({
      source: 'n8n', type: 'forecast_run', opaque_id: 'forecast_1', status: 'completed',
      units: 1, occurred_at: '2026-09-25T12:00:00.000Z', quest_state: 'closed',
    });
    expect(() => sanitizeN8nEvent({ event_type: 'unknown' })).toThrow(TypeError);
  });

  it('handles valid signed POST requests and rejects other methods', async () => {
    const body = JSON.stringify({
      event_type: 'reconciliation_complete', event_id: 'recon_1', status: 'completed',
      observed_units: 2, occurred_at: '2026-09-25T12:00:00.000Z',
    });
    const timestamp = '1790337600';
    const signature = `sha256=${createHmac('sha256', 'secret').update(`${timestamp}.${body}`).digest('hex')}`;
    const record = vi.fn().mockResolvedValue(undefined);
    const integration = new N8nWebhookIntegration(
      'secret', new AllowAllFeatureGate(), { record }, new IntegrationHealthRegistry(),
      () => new Date('2026-09-25T12:00:00.000Z'),
    );
    const accepted = responseHarness();
    await integration.handle(requestHarness(body, 'POST', { 'x-citadel-timestamp': timestamp, 'x-citadel-signature': signature }), accepted.response);
    expect(accepted.status()).toBe(202);
    expect(record).toHaveBeenCalledOnce();
    const rejected = responseHarness();
    await integration.handle(requestHarness('', 'GET'), rejected.response);
    expect(rejected.status()).toBe(405);
  });

  it('fails closed without a configured secret', async () => {
    const harness = responseHarness();
    const integration = new N8nWebhookIntegration(
      undefined, new AllowAllFeatureGate(), { record: vi.fn() }, new IntegrationHealthRegistry(),
    );
    await integration.handle(requestHarness('{}', 'POST'), harness.response);
    expect(harness.status()).toBe(503);
  });
});

function requestHarness(
  body: string,
  method: string,
  headers: Record<string, string> = {},
): IncomingMessage {
  return Object.assign(Readable.from([body]), { method, url: '/webhooks/n8n', headers }) as IncomingMessage;
}

function responseHarness(): { readonly response: ServerResponse; status(): number } {
  let statusCode = 0;
  const response = {
    writeHead(status: number): typeof response { statusCode = status; return response; },
    end(): typeof response { return response; },
  };
  return { response: response as unknown as ServerResponse, status: () => statusCode };
}
