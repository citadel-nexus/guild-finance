// ─── CGRF Header ───────────────────────────────────────────────
// File:        src/mobile/index.ts
// Stage:       07_BUILD
// SRS:         SRS-CN-FINANCE-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-finance
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     src/mobile/rum.ts, src/mobile/product-analytics.ts, GET /realm/finance.json
// EnumType:    Widget
// EnumEdges:   DEPENDS_ON src/mobile/rum.ts; DEPENDS_ON src/mobile/product-analytics.ts; CONSUMES GET /realm/finance.json
// DAG Node:    finance.mobile.client
// Intent:      Project the public Finance realm feed into a small-screen interface without inventing values.
// ───────────────────────────────────────────────────────────────

import type { FinanceRealm } from '../finance-floor.js';
import {
  initializeFinanceRum,
  reportRealmFailure,
  reportRealmRendered,
  type FinanceRumConfig,
} from './rum.js';
import {
  initializeMobileAnalytics,
  type MobileAnalyticsConfig,
} from './product-analytics.js';

declare global {
  interface Window {
    __FINANCE_RUM_CONFIG__?: FinanceRumConfig;
    __FINANCE_POSTHOG_CONFIG__?: MobileAnalyticsConfig;
  }
}

initializeFinanceRum(window.__FINANCE_RUM_CONFIG__);
const analytics = initializeMobileAnalytics(window.__FINANCE_POSTHOG_CONFIG__);
void refreshRealm();

async function refreshRealm(): Promise<void> {
  try {
    if (!(await analytics.realmEnabled())) throw new Error('Realm feed disabled by feature flag');
    const response = await fetch('/realm/finance.json', { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`Realm request returned ${response.status}`);
    const realm = (await response.json()) as FinanceRealm;
    renderRealm(realm);
    reportRealmRendered(realm.activity_level, realm.quests.length);
    analytics.realmViewed(realm.activity_level, realm.quests.length);
  } catch (error) {
    reportRealmFailure(error);
    renderDegraded();
  }
}

function renderRealm(realm: FinanceRealm): void {
  const meter = requiredElement<HTMLElement>('activity-meter');
  const meterRoot = meter.parentElement;
  const percentage = Math.round(realm.activity_level * 100);
  meter.style.width = `${percentage}%`;
  meterRoot?.setAttribute('aria-valuenow', String(realm.activity_level));
  requiredElement('activity-value').textContent =
    realm.activity_level === 0 ? 'Quiet floor' : `${percentage}% observed activity`;

  replaceList(
    'quests',
    realm.quests.length === 0
      ? ['No active guild work reported.']
      : realm.quests.map((quest) => `${quest.title} — ${quest.state}`),
  );
  replaceList(
    'structures',
    realm.structures.map((structure) => `${structure.kind} · level ${structure.level}`),
  );
}

function renderDegraded(): void {
  requiredElement('activity-value').textContent = 'Quiet floor — feed unavailable';
  replaceList('quests', ['No guild work is available.']);
  replaceList('structures', ['Public floor feed unavailable.']);
}

function replaceList(id: string, items: readonly string[]): void {
  const list = requiredElement<HTMLUListElement>(id);
  list.replaceChildren(
    ...items.map((item) => {
      const element = document.createElement('li');
      element.textContent = item;
      return element;
    }),
  );
}

function requiredElement<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (element === null) throw new Error(`Required element is missing: ${id}`);
  return element as T;
}
