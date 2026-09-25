// ─── CGRF Header ───────────────────────────────────────────────
// File:        src/config.ts
// Stage:       07_BUILD
// SRS:         SRS-CN-FINANCE-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-finance
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     .bits/srs/SRS-CN-FINANCE-LIVINGWORLD-001.md
// EnumType:    ConfigDoc
// EnumEdges:   CONSUMES SRS-CN-FINANCE-LIVINGWORLD-001; GATES citadel.finance.*
// DAG Node:    finance.runtime.config
// Intent:      Centralize the immutable public Finance Guild contract and prevent subject drift.
// ───────────────────────────────────────────────────────────────

export const GUILD = 'finance' as const;
export const CHAMPION = 'Sterling' as const;
export const CHAMPION_COLOR = '#00703C' as const;
export const SERVICE_NAME = 'guild-mcp-finance' as const;
export const DEFAULT_PORT = 8092;
export const NATS_PREFIX = 'citadel.finance' as const;

export const FLOOR_SUBJECTS = Object.freeze({
  activity: `${NATS_PREFIX}.activity`,
  quest: `${NATS_PREFIX}.quest`,
  champion: `${NATS_PREFIX}.champion`,
});

export type FloorSubject = (typeof FLOOR_SUBJECTS)[keyof typeof FLOOR_SUBJECTS];

export const OBSERVABILITY_TAGS = Object.freeze({
  srs_code: 'SRS-CN-FINANCE-LIVINGWORLD-001',
  dispatch_id: 'DISP-LIVINGWORLD-finance',
  seat: 'BITS-CODEGEN',
});
