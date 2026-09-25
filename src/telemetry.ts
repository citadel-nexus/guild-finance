// ─── CGRF Header ───────────────────────────────────────────────
// File:        src/telemetry.ts
// Stage:       07_BUILD
// SRS:         SRS-CN-FINANCE-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-finance
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     src/instrumentation.ts, src/config.ts, hot-shots
// EnumType:    Service
// EnumEdges:   DEPENDS_ON src/instrumentation.ts; PRODUCES finance.floor.activity.heartbeat; PRODUCES finance.floor.quest.throughput; PRODUCES finance.floor.champion.transition
// DAG Node:    finance.telemetry.metrics
// Intent:      Measure real floor heartbeats, quest throughput, and champion transitions without affecting service availability.
// ───────────────────────────────────────────────────────────────

import { StatsD } from 'hot-shots';

import { OBSERVABILITY_TAGS, SERVICE_NAME } from './config.js';
import { tracer } from './instrumentation.js';
import { logWarn } from './logging.js';

export interface FloorTelemetry {
  activityHeartbeat(activityLevel: number): void;
  championTransition(previous: string, current: string): void;
  questThroughput(state: string): void;
  trace<T>(operation: string, tags: Readonly<Record<string, string | number>>, work: () => Promise<T>): Promise<T>;
}

export class NoopFloorTelemetry implements FloorTelemetry {
  public activityHeartbeat(): void {}

  public championTransition(): void {}

  public questThroughput(): void {}

  public async trace<T>(
    _operation: string,
    _tags: Readonly<Record<string, string | number>>,
    work: () => Promise<T>,
  ): Promise<T> {
    return work();
  }
}

export class DatadogFloorTelemetry implements FloorTelemetry {
  private readonly statsd: StatsD;

  public constructor() {
    this.statsd = new StatsD({
      prefix: 'finance.floor.',
      globalTags: { service: SERVICE_NAME, ...OBSERVABILITY_TAGS },
      errorHandler: (error: Error): void => {
        logWarn('datadog_metrics_degraded', { error_type: error.name });
      },
    });
  }

  public activityHeartbeat(activityLevel: number): void {
    this.statsd.increment('activity.heartbeat');
    this.statsd.gauge('activity.level', activityLevel);
  }

  public championTransition(previous: string, current: string): void {
    this.statsd.increment('champion.transition', 1, [`from:${previous}`, `to:${current}`]);
  }

  public questThroughput(state: string): void {
    this.statsd.increment('quest.throughput', 1, [`state:${state}`]);
  }

  public async trace<T>(
    operation: string,
    tags: Readonly<Record<string, string | number>>,
    work: () => Promise<T>,
  ): Promise<T> {
    return tracer.trace(operation, { tags: { ...OBSERVABILITY_TAGS, ...tags } }, work);
  }
}
