// ─── CGRF Header ───────────────────────────────────────────────
// File:        src/progression.ts
// Stage:       07_BUILD
// SRS:         SRS-CN-FINANCE-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-finance
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     .bits/progression.md
// EnumType:    Service
// EnumEdges:   CONSUMES .bits/progression.md; PRODUCES src/finance-floor.ts
// DAG Node:    finance.floor.progression
// Intent:      Derive structure growth only from verified cumulative operation counts.
// ───────────────────────────────────────────────────────────────

export type ProgressionMetric =
  | 'commissions_attributed'
  | 'forecasts_generated'
  | 'meetings_managed'
  | 'revenue_processed';

export type StructureLevel = 1 | 2 | 3 | 4 | 5;

export interface ProgressionTotals {
  readonly commissions_attributed: number;
  readonly forecasts_generated: number;
  readonly meetings_managed: number;
  readonly revenue_processed: number;
}

export const EMPTY_PROGRESSION: ProgressionTotals = Object.freeze({
  commissions_attributed: 0,
  forecasts_generated: 0,
  meetings_managed: 0,
  revenue_processed: 0,
});

export const PROGRESSION_THRESHOLDS: Readonly<Record<Exclude<StructureLevel, 1>, ProgressionTotals>> =
  Object.freeze({
    2: { revenue_processed: 100, forecasts_generated: 5, commissions_attributed: 10, meetings_managed: 10 },
    3: { revenue_processed: 1_000, forecasts_generated: 25, commissions_attributed: 100, meetings_managed: 50 },
    4: { revenue_processed: 10_000, forecasts_generated: 100, commissions_attributed: 500, meetings_managed: 250 },
    5: { revenue_processed: 100_000, forecasts_generated: 500, commissions_attributed: 2_500, meetings_managed: 1_000 },
  });

export function structureLevel(totals: ProgressionTotals): StructureLevel {
  validateTotals(totals);
  for (const level of [5, 4, 3, 2] as const) {
    const threshold = PROGRESSION_THRESHOLDS[level];
    if (Object.keys(threshold).every((key) => totals[key as ProgressionMetric] >= threshold[key as ProgressionMetric])) {
      return level;
    }
  }
  return 1;
}

export function addProgress(
  totals: ProgressionTotals,
  metric: ProgressionMetric,
  units: number,
): ProgressionTotals {
  validateUnits(units);
  return { ...totals, [metric]: totals[metric] + units };
}

export function validateTotals(totals: ProgressionTotals): void {
  for (const value of Object.values(totals)) validateUnits(value);
}

function validateUnits(units: number): void {
  if (!Number.isSafeInteger(units) || units < 0) {
    throw new RangeError('progression units must be a non-negative safe integer');
  }
}
