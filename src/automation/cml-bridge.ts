// ─── CGRF Header ───────────────────────────────────────────────
// File:        src/automation/cml-bridge.ts
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
// DAG Node:    finance.cml.bridge
// Intent:      Report only real CML handler output and typed failure state on the Finance namespace.
// ───────────────────────────────────────────────────────────────

import { connect, StringCodec } from 'nats';

import { NATS_PREFIX } from '../config.js';
import { logInfo, logWarn } from '../logging.js';

const codec = StringCodec();
const TASK_SUBJECT = `${NATS_PREFIX}.cml.task`;
const RESULT_SUBJECT = `${NATS_PREFIX}.cml.result`;

interface CmlTask {
  readonly task_id: string;
}

export type CmlTaskHandler = (task: CmlTask) => Promise<unknown>;

export async function startCmlBridge(
  handler: CmlTaskHandler,
  natsUrl: string | undefined = process.env.NATS_URL,
): Promise<void> {
  if (natsUrl === undefined || natsUrl.trim().length === 0) {
    logWarn('cml_bridge_degraded', { reason: 'nats_url_missing' });
    return;
  }

  const connection = await connect({ servers: natsUrl });
  const subscription = connection.subscribe(TASK_SUBJECT);
  logInfo('cml_bridge_started', { transport: 'nats' });
  for await (const message of subscription) {
    const task = parseTask(codec.decode(message.data));
    try {
      const output = await handler(task);
      connection.publish(
        RESULT_SUBJECT,
        codec.encode(JSON.stringify({ task_id: task.task_id, status: 'done', output })),
      );
    } catch (error) {
      connection.publish(
        RESULT_SUBJECT,
        codec.encode(
          JSON.stringify({
            task_id: task.task_id,
            status: 'failed',
            error_type: error instanceof Error ? error.name : 'UnknownError',
          }),
        ),
      );
    }
  }
}

function parseTask(payload: string): CmlTask {
  const candidate = JSON.parse(payload) as Partial<CmlTask>;
  if (typeof candidate.task_id !== 'string' || candidate.task_id.length === 0) {
    throw new TypeError('CML task requires a task_id');
  }
  return { task_id: candidate.task_id };
}
