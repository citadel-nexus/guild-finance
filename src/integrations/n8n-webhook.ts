// ─── CGRF Header ───────────────────────────────────────────────
// File:        src/integrations/n8n-webhook.ts
// Stage:       07_BUILD
// SRS:         SRS-CN-FINANCE-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-finance
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     src/integrations/contracts.ts
// EnumType:    Route
// EnumEdges:   DEPENDS_ON src/integrations/contracts.ts; CONSUMES POST /webhooks/n8n
// DAG Node:    finance.integrations.n8n
// Intent:      Accept replay-bounded HMAC-authenticated workflow events through a sanitized schema.
// ───────────────────────────────────────────────────────────────

import { createHmac, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { logWarn } from '../logging.js';
import type {
  FeatureGate,
  GuildActivitySink,
  GuildActivityType,
  IntegrationHealthRegistry,
  SanitizedGuildActivity,
} from './contracts.js';

const MAX_BODY_BYTES = 65_536;
const MAX_CLOCK_SKEW_MS = 300_000;

export class N8nWebhookIntegration {
  public constructor(
    private readonly secret: string | undefined,
    private readonly gate: FeatureGate,
    private readonly sink: GuildActivitySink,
    private readonly health: IntegrationHealthRegistry,
    private readonly clock: () => Date = () => new Date(),
  ) {
    health.set('n8n', secret === undefined ? 'disabled' : 'healthy');
  }

  public async handle(request: IncomingMessage, response: ServerResponse): Promise<boolean> {
    const path = new URL(request.url ?? '/', 'http://localhost').pathname;
    if (path !== '/webhooks/n8n') return false;
    if (request.method !== 'POST') {
      writeJson(response, 405, { error: 'method_not_allowed' }, { allow: 'POST' });
      return true;
    }
    if (this.secret === undefined || !(await this.gate.enabled('finance-n8n-webhooks'))) {
      this.health.set('n8n', 'disabled');
      writeJson(response, 503, { error: 'integration_disabled' });
      return true;
    }
    try {
      const body = await readBody(request);
      const timestamp = singleHeader(request.headers['x-citadel-timestamp']);
      const signature = singleHeader(request.headers['x-citadel-signature']);
      if (!verifySignature(body, timestamp, signature, this.secret, this.clock())) {
        writeJson(response, 401, { error: 'invalid_signature' });
        return true;
      }
      const activity = sanitizeN8nEvent(JSON.parse(body) as unknown);
      await this.sink.record(activity);
      this.health.set('n8n', 'healthy');
      writeJson(response, 202, { accepted: true });
    } catch (error) {
      this.health.set('n8n', 'degraded');
      logWarn('n8n_webhook_rejected', { error_type: error instanceof Error ? error.name : 'UnknownError' });
      writeJson(response, error instanceof SyntaxError || error instanceof TypeError ? 400 : 503, {
        error: 'webhook_rejected',
      });
    }
    return true;
  }
}

export function verifySignature(
  body: string,
  timestamp: string | undefined,
  signature: string | undefined,
  secret: string,
  now: Date,
): boolean {
  if (timestamp === undefined || signature === undefined || !signature.startsWith('sha256=')) return false;
  if (!/^\d{10}$/.test(timestamp)) return false;
  const timestampMs = Number.parseInt(timestamp, 10) * 1_000;
  if (!Number.isSafeInteger(timestampMs) || Math.abs(now.getTime() - timestampMs) > MAX_CLOCK_SKEW_MS) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  const supplied = signature.slice('sha256='.length);
  if (!/^[a-f0-9]{64}$/.test(supplied)) return false;
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(supplied, 'hex'));
}

export function sanitizeN8nEvent(value: unknown): SanitizedGuildActivity {
  if (!isRecord(value)) throw new TypeError('webhook body must be an object');
  const map: Record<string, GuildActivityType> = {
    commission_calculated: 'commission_calculation',
    forecast_generated: 'forecast_run',
    meeting_managed: 'meeting_managed',
    reconciliation_complete: 'revenue_reconciliation',
    transaction_observed: 'transaction_observed',
  };
  const type = typeof value.event_type === 'string' ? map[value.event_type] : undefined;
  if (
    type === undefined ||
    typeof value.event_id !== 'string' ||
    typeof value.observed_units !== 'number' ||
    typeof value.occurred_at !== 'string'
  ) throw new TypeError('webhook event does not match the public schema');
  const status = value.status;
  if (status !== 'blocked' && status !== 'completed' && status !== 'failed' && status !== 'opened') {
    throw new TypeError('webhook status is invalid');
  }
  const base: SanitizedGuildActivity = {
    source: 'n8n',
    type,
    status,
    units: value.observed_units,
    opaque_id: value.event_id,
    occurred_at: value.occurred_at,
  };
  if (value.quest_state === 'open' || value.quest_state === 'closed') {
    return { ...base, quest_state: value.quest_state };
  }
  return base;
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new RangeError('webhook body exceeds limit');
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function singleHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function writeJson(
  response: ServerResponse,
  status: number,
  body: object,
  headers: Readonly<Record<string, string>> = {},
): void {
  response.writeHead(status, { ...headers, 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
