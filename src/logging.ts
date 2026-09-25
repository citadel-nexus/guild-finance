// ─── CGRF Header ───────────────────────────────────────────────
// File:        src/logging.ts
// Stage:       07_BUILD
// SRS:         SRS-CN-FINANCE-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-finance
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     src/config.ts
// EnumType:    Service
// EnumEdges:   DEPENDS_ON src/config.ts
// DAG Node:    finance.logging
// Intent:      Emit public-safe structured service logs without serializing private payloads.
// ───────────────────────────────────────────────────────────────

type LogFields = Readonly<Record<string, boolean | number | string | null>>;

function serialize(event: string, fields: LogFields): string {
  return JSON.stringify({ event, ...fields });
}

export function logInfo(event: string, fields: LogFields = {}): void {
  console.info(serialize(event, fields));
}

export function logWarn(event: string, fields: LogFields = {}): void {
  console.warn(serialize(event, fields));
}

export function logError(event: string, fields: LogFields = {}): void {
  console.error(serialize(event, fields));
}
