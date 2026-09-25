// ─── CGRF Header ───────────────────────────────────────────────
// File:        src/automation/nats-listener.ts
// Stage:       07_BUILD
// SRS:         SRS-CN-FINANCE-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-finance
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     src/config.ts, nats
// EnumType:    Adapter
// EnumEdges:   DEPENDS_ON src/config.ts
// DAG Node:    finance.nats.listener
// Intent:      Consume only the Finance namespace with structured logs and fail-soft source handling.
// ───────────────────────────────────────────────────────────────

import { connect, StringCodec, type NatsConnection } from 'nats';

import { NATS_PREFIX } from '../config.js';
import { logInfo, logWarn } from '../logging.js';

const sc = StringCodec();

export type FinanceMessageHandler = (subject: string, data: string) => Promise<void>;

export async function startListener(
  handler: FinanceMessageHandler,
  natsUrl: string | undefined = process.env.NATS_URL,
): Promise<NatsConnection | null> {
  if (natsUrl === undefined || natsUrl.trim().length === 0) {
    logWarn('finance_listener_degraded', { reason: 'nats_url_missing' });
    return null;
  }

  try {
    const connection = await connect({ servers: natsUrl });
    const subscription = connection.subscribe(`${NATS_PREFIX}.>`);
    logInfo('finance_listener_started', { namespace: `${NATS_PREFIX}.*` });
    void (async (): Promise<void> => {
      for await (const message of subscription) {
        await handler(message.subject, sc.decode(message.data));
      }
    })();
    return connection;
  } catch (error) {
    logWarn('finance_listener_degraded', {
      reason: 'nats_unavailable',
      error_type: error instanceof Error ? error.name : 'UnknownError',
    });
    return null;
  }
}
