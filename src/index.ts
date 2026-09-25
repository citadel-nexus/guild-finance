// ─── CGRF Header ───────────────────────────────────────────────
// File:        src/index.ts
// Stage:       07_BUILD
// SRS:         SRS-CN-FINANCE-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-finance
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     src/instrumentation.ts, src/server.ts
// EnumType:    Service
// EnumEdges:   DEPENDS_ON src/server.ts
// DAG Node:    finance.service.entrypoint
// Intent:      Start the traced Finance service on its declared port with orderly shutdown.
// ───────────────────────────────────────────────────────────────

import './instrumentation.js';

import { pathToFileURL } from 'node:url';

import { DEFAULT_PORT, SERVICE_NAME } from './config.js';
import { logError, logInfo } from './logging.js';
import { createFinanceApplication } from './server.js';

export async function main(): Promise<void> {
  const application = await createFinanceApplication();
  const configuredPort = Number.parseInt(process.env.PORT ?? String(DEFAULT_PORT), 10);
  const port = Number.isSafeInteger(configuredPort) && configuredPort >= 0 ? configuredPort : DEFAULT_PORT;

  await new Promise<void>((resolve, reject) => {
    application.server.once('error', reject);
    application.server.listen(port, '0.0.0.0', resolve);
  });
  logInfo('finance_service_started', { service: SERVICE_NAME, port });

  const shutdown = async (signal: string): Promise<void> => {
    logInfo('finance_service_stopping', { signal });
    await application.close();
  };
  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
}

const invokedPath = process.argv[1];
if (invokedPath !== undefined && import.meta.url === pathToFileURL(invokedPath).href) {
  void main().catch((error: unknown) => {
    logError('finance_service_failed', {
      error_type: error instanceof Error ? error.name : 'UnknownError',
    });
    process.exitCode = 1;
  });
}
