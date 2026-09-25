// ─── CGRF Header ───────────────────────────────────────────────
// File:        src/instrumentation.ts
// Stage:       07_BUILD
// SRS:         SRS-CN-FINANCE-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-finance
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     src/config.ts, dd-trace
// EnumType:    Service
// EnumEdges:   DEPENDS_ON src/config.ts; PRODUCES Datadog APM spans
// DAG Node:    finance.telemetry.apm
// Intent:      Initialize Datadog tracing before service modules load with dispatch provenance tags.
// ───────────────────────────────────────────────────────────────

import tracer from 'dd-trace';

import { OBSERVABILITY_TAGS, SERVICE_NAME } from './config.js';

tracer.init({
  service: SERVICE_NAME,
  env: process.env.DD_ENV ?? 'development',
  version: process.env.DD_VERSION ?? '0.1.0',
  logInjection: true,
  runtimeMetrics: true,
  tags: OBSERVABILITY_TAGS,
});

export { tracer };
