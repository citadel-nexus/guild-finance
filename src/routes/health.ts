// ─── CGRF Header ───────────────────────────────────────────────
// File:        src/routes/health.ts
// Stage:       07_BUILD
// SRS:         SRS-CN-FINANCE-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-finance
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     src/config.ts
// EnumType:    Route
// EnumEdges:   DEPENDS_ON src/config.ts
// DAG Node:    finance.health.route
// Intent:      Return public health aligned with the canonical Finance service identity.
// ───────────────────────────────────────────────────────────────

import { GUILD, NATS_PREFIX, SERVICE_NAME } from '../config.js';

export interface HealthResponse {
  readonly guild: typeof GUILD;
  readonly nats_prefix: string;
  readonly service: typeof SERVICE_NAME;
  readonly status: 'healthy';
  readonly timestamp: string;
  readonly version: string;
}

export function healthCheck(): HealthResponse {
  return {
    guild: GUILD,
    service: SERVICE_NAME,
    status: 'healthy',
    version: '0.1.0',
    nats_prefix: `${NATS_PREFIX}.*`,
    timestamp: new Date().toISOString(),
  };
}
