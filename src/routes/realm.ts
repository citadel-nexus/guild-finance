// ─── CGRF Header ───────────────────────────────────────────────
// File:        src/routes/realm.ts
// Stage:       07_BUILD
// SRS:         SRS-CN-FINANCE-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-finance
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     src/finance-floor.ts, src/routes/health.ts, src/mobile/page.ts, src/integrations/contracts.ts
// EnumType:    Route
// EnumEdges:   CONSUMES src/finance-floor.ts; PRODUCES GET /realm/finance.json; PRODUCES GET /game/party.json; PRODUCES GET /mobile; PRODUCES GET /health/integrations
// DAG Node:    finance.http.routes
// Intent:      Expose fail-soft public realm, party, health, and mobile surfaces with no private fields.
// ───────────────────────────────────────────────────────────────

import { readFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { CHAMPION, GUILD } from '../config.js';
import { quietFinanceRealm, type FinanceRealm, type PartyFeed } from '../finance-floor.js';
import { logWarn } from '../logging.js';
import { renderMobileConfig, renderMobilePage } from '../mobile/page.js';
import type { MobileAnalyticsConfig } from '../mobile/product-analytics.js';
import { healthCheck } from './health.js';
import type { IntegrationHealth } from '../integrations/contracts.js';

export interface RealmSource {
  party(): PartyFeed;
  realm(): FinanceRealm;
}

const PUBLIC_HEADERS = Object.freeze({
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
  'content-security-policy': "default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'unsafe-inline'; script-src 'self'",
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
});

export function createRealmRouter(
  source: RealmSource,
  integrationHealth: () => readonly IntegrationHealth[] = () => [],
  mobileAnalyticsConfig?: MobileAnalyticsConfig,
): (request: IncomingMessage, response: ServerResponse) => Promise<void> {
  return async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    if (request.method !== 'GET') {
      writeJson(response, 405, { error: 'method_not_allowed' }, { allow: 'GET' });
      return;
    }

    const path = new URL(request.url ?? '/', 'http://localhost').pathname;
    if (path === '/realm/finance.json') {
      writeJson(response, 200, safeRealm(source));
      return;
    }
    if (path === '/game/party.json') {
      writeJson(response, 200, safeParty(source));
      return;
    }
    if (path === '/health') {
      writeJson(response, 200, healthCheck());
      return;
    }
    if (path === '/health/integrations') {
      writeJson(response, 200, { integrations: integrationHealth() });
      return;
    }
    if (path === '/' || path === '/mobile') {
      writeHtml(response, renderMobilePage(), mobileAnalyticsConfig?.api_host);
      return;
    }
    if (path === '/mobile/config.js') {
      writeJavascript(response, renderMobileConfig(mobileAnalyticsConfig));
      return;
    }
    if (path === '/assets/finance-mobile.js') {
      await writeMobileBundle(response);
      return;
    }
    writeJson(response, 404, { error: 'not_found' });
  };
}

function safeRealm(source: RealmSource): FinanceRealm {
  try {
    return source.realm();
  } catch (error) {
    logWarn('realm_feed_degraded', {
      error_type: error instanceof Error ? error.name : 'UnknownError',
    });
    return quietFinanceRealm();
  }
}

function safeParty(source: RealmSource): PartyFeed {
  try {
    return source.party();
  } catch (error) {
    logWarn('party_feed_degraded', {
      error_type: error instanceof Error ? error.name : 'UnknownError',
    });
    return {
      party: [{ guild: GUILD, champion: CHAMPION, role: 'guildmaster', state: 'idle' }],
    };
  }
}

function writeJson(
  response: ServerResponse,
  status: number,
  body: unknown,
  headers: Readonly<Record<string, string>> = {},
): void {
  response.writeHead(status, {
    ...PUBLIC_HEADERS,
    ...headers,
    'content-type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(body));
}

function writeHtml(response: ServerResponse, body: string, analyticsHost: string | undefined): void {
  const connectSource = safeConnectSource(analyticsHost);
  response.writeHead(200, {
    ...PUBLIC_HEADERS,
    'content-security-policy': `default-src 'self'; connect-src 'self'${connectSource === null ? '' : ` ${connectSource}`}; img-src 'self' data:; style-src 'unsafe-inline'; script-src 'self'`,
    'content-type': 'text/html; charset=utf-8',
  });
  response.end(body);
}

function writeJavascript(response: ServerResponse, body: string): void {
  response.writeHead(200, {
    ...PUBLIC_HEADERS,
    'content-type': 'text/javascript; charset=utf-8',
  });
  response.end(body);
}

function safeConnectSource(value: string | undefined): string | null {
  if (value === undefined) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.origin : null;
  } catch {
    return null;
  }
}

async function writeMobileBundle(response: ServerResponse): Promise<void> {
  try {
    const bundle = await readFile(new URL('../public/finance-mobile.js', import.meta.url));
    response.writeHead(200, {
      ...PUBLIC_HEADERS,
      'content-type': 'text/javascript; charset=utf-8',
    });
    response.end(bundle);
  } catch (error) {
    logWarn('mobile_bundle_unavailable', {
      error_type: error instanceof Error ? error.name : 'UnknownError',
    });
    writeJson(response, 404, { error: 'asset_unavailable' });
  }
}
