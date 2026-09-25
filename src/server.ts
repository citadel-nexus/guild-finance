// ─── CGRF Header ───────────────────────────────────────────────
// File:        src/server.ts
// Stage:       07_BUILD
// SRS:         SRS-CN-FINANCE-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-finance
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     src/routes/realm.ts, src/automation/livingworld-emitter.ts, src/telemetry.ts
// EnumType:    Service
// EnumEdges:   DEPENDS_ON src/routes/realm.ts; DEPENDS_ON src/automation/livingworld-emitter.ts
// DAG Node:    finance.http.server
// Intent:      Compose the public service so HTTP remains available when NATS or telemetry is absent.
// ───────────────────────────────────────────────────────────────

import { createServer, type Server } from 'node:http';

import {
  createNatsFloorPublisher,
  FinanceLivingWorld,
  type FloorPublisher,
} from './automation/livingworld-emitter.js';
import { FinanceFloorState } from './finance-floor.js';
import { createRealmRouter } from './routes/realm.js';
import { DatadogFloorTelemetry, type FloorTelemetry } from './telemetry.js';

export interface FinanceApplication {
  readonly floor: FinanceLivingWorld;
  readonly server: Server;
  close(): Promise<void>;
}

export interface FinanceApplicationOptions {
  readonly natsUrl?: string;
  readonly publisher?: FloorPublisher;
  readonly telemetry?: FloorTelemetry;
}

export async function createFinanceApplication(
  options: FinanceApplicationOptions = {},
): Promise<FinanceApplication> {
  const publisher =
    options.publisher ?? (await createNatsFloorPublisher(options.natsUrl ?? process.env.NATS_URL));
  const telemetry = options.telemetry ?? new DatadogFloorTelemetry();
  const floor = new FinanceLivingWorld(new FinanceFloorState(), publisher, telemetry);
  const router = createRealmRouter(floor);
  const server = createServer((request, response) => {
    void router(request, response).catch(() => {
      if (!response.headersSent) {
        response.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
      }
      response.end(JSON.stringify({ error: 'request_failed' }));
    });
  });

  return {
    floor,
    server,
    async close(): Promise<void> {
      await new Promise<void>((resolve, reject) => {
        if (!server.listening) {
          resolve();
          return;
        }
        server.close((error) => (error === undefined ? resolve() : reject(error)));
      });
      await publisher.close?.();
    },
  };
}
