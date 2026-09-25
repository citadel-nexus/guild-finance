// ─── CGRF Header ───────────────────────────────────────────────
// File:        src/progression.test.ts
// Stage:       08_TEST
// SRS:         SRS-CN-FINANCE-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-finance
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     src/progression.ts
// EnumType:    Test
// EnumEdges:   VALIDATES src/progression.ts
// DAG Node:    finance.progression.test
// Intent:      Verify every structure threshold and reject invented or invalid counters.
// ───────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import { addProgress, EMPTY_PROGRESSION, PROGRESSION_THRESHOLDS, structureLevel } from './progression.js';

describe('floor progression', () => {
  it('advances only when every real counter reaches a level threshold', () => {
    expect(structureLevel(EMPTY_PROGRESSION)).toBe(1);
    expect(structureLevel(PROGRESSION_THRESHOLDS[2])).toBe(2);
    expect(structureLevel(PROGRESSION_THRESHOLDS[3])).toBe(3);
    expect(structureLevel(PROGRESSION_THRESHOLDS[4])).toBe(4);
    expect(structureLevel(PROGRESSION_THRESHOLDS[5])).toBe(5);
    expect(structureLevel({ ...PROGRESSION_THRESHOLDS[3], meetings_managed: 49 })).toBe(2);
  });

  it('increments only non-negative safe integer observations', () => {
    expect(addProgress(EMPTY_PROGRESSION, 'forecasts_generated', 1).forecasts_generated).toBe(1);
    expect(() => addProgress(EMPTY_PROGRESSION, 'forecasts_generated', -1)).toThrow(RangeError);
    expect(() => structureLevel({ ...EMPTY_PROGRESSION, revenue_processed: 0.5 })).toThrow(RangeError);
  });
});
