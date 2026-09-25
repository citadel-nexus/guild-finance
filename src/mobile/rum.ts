// ─── CGRF Header ───────────────────────────────────────────────
// File:        src/mobile/rum.ts
// Stage:       07_BUILD
// SRS:         SRS-CN-FINANCE-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-finance
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     @datadog/browser-rum, src/config.ts
// EnumType:    Adapter
// EnumEdges:   DEPENDS_ON src/config.ts; PRODUCES Datadog RUM mobile web vitals
// DAG Node:    finance.mobile.rum
// Intent:      Capture mobile web vitals only when deployment supplies an explicit public RUM configuration.
// ───────────────────────────────────────────────────────────────

import { datadogRum } from '@datadog/browser-rum';

import { SERVICE_NAME } from '../config.js';

export interface FinanceRumConfig {
  readonly applicationId: string;
  readonly clientToken: string;
  readonly env?: string;
  readonly version?: string;
}

export function initializeFinanceRum(config: FinanceRumConfig | undefined): boolean {
  if (config === undefined || config.applicationId.length === 0 || config.clientToken.length === 0) {
    return false;
  }

  datadogRum.init({
    applicationId: config.applicationId,
    clientToken: config.clientToken,
    service: SERVICE_NAME,
    env: config.env ?? 'production',
    version: config.version ?? '0.1.0',
    sessionSampleRate: 100,
    sessionReplaySampleRate: 0,
    trackResources: true,
    trackLongTasks: true,
    trackUserInteractions: true,
    defaultPrivacyLevel: 'mask-user-input',
  });
  datadogRum.startView({ name: 'finance-living-world', service: SERVICE_NAME });
  return true;
}

export function reportRealmRendered(activityLevel: number, questCount: number): void {
  datadogRum.addAction('finance_realm_rendered', {
    activity_level: activityLevel,
    quest_count: questCount,
  });
}

export function reportRealmFailure(error: unknown): void {
  datadogRum.addError(error instanceof Error ? error : new Error('Finance realm request failed'));
}
