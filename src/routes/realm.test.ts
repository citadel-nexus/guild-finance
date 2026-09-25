// ─── CGRF Header ───────────────────────────────────────────────
// File:        src/routes/realm.test.ts
// Stage:       08_TEST
// SRS:         SRS-CN-FINANCE-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-finance
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     src/routes/realm.ts
// EnumType:    Test
// EnumEdges:   VALIDATES src/routes/realm.ts
// DAG Node:    finance.http.routes.test
// Intent:      Prove the public contracts, champion binding, mobile shell, and quiet fallback over HTTP.
// ───────────────────────────────────────────────────────────────

import type { IncomingMessage, ServerResponse } from 'node:http';
import { describe, expect, it } from 'vitest';

import { FinanceFloorState, type FinanceRealm, type PartyFeed } from '../finance-floor.js';
import { createRealmRouter, type RealmSource } from './realm.js';

describe('realm routes', () => {
  it('returns the Finance realm shape and Sterling party binding', async () => {
    const state = new FinanceFloorState();
    state.recordActivity(0.6);
    state.recordQuest({ id: 'q-1', title: 'Verify revenue source', state: 'open' });
    const router = createRealmRouter({ realm: () => state.snapshot(), party: () => state.party() });

    const realmResponse = await request(router, '/realm/finance.json');
    expect(realmResponse.status).toBe(200);
    expect(realmResponse.headers['access-control-allow-origin']).toBe('*');
    expect(realmResponse.json()).toEqual({
      guild: 'finance',
      champion: 'Sterling',
      activity_level: 0.6,
      quests: [{ id: 'q-1', title: 'Verify revenue source', state: 'open' }],
      structures: [{ kind: 'hall', level: 1 }],
    });

    const partyResponse = await request(router, '/game/party.json');
    expect(partyResponse.json()).toEqual({
      party: [{ guild: 'finance', champion: 'Sterling', role: 'guildmaster', state: 'idle' }],
    });
  });

  it('degrades unavailable sources to quiet public feeds', async () => {
    const source: RealmSource = {
      realm(): FinanceRealm {
        throw new Error('source unavailable');
      },
      party(): PartyFeed {
        throw new Error('source unavailable');
      },
    };
    const router = createRealmRouter(source);

    const realm = (await request(router, '/realm/finance.json')).json() as FinanceRealm;
    expect(realm.activity_level).toBe(0);
    expect(realm.quests).toEqual([]);
    expect((await request(router, '/game/party.json')).json()).toEqual({
      party: [{ guild: 'finance', champion: 'Sterling', role: 'guildmaster', state: 'idle' }],
    });
  });

  it('serves health and the mobile-first floor shell', async () => {
    const state = new FinanceFloorState();
    const router = createRealmRouter(
      { realm: () => state.snapshot(), party: () => state.party() },
      () => [{ name: 'posthog', status: 'healthy', checked_at: '2026-09-25T12:00:00.000Z' }],
      { api_key: '<public-key', api_host: 'https://eu.posthog.com/path' },
    );

    const health = (await request(router, '/health')).json();
    expect(health).toMatchObject({
      guild: 'finance',
      service: 'guild-mcp-finance',
      status: 'healthy',
      nats_prefix: 'citadel.finance.*',
    });
    expect((await request(router, '/health/integrations')).json()).toEqual({
      integrations: [{ name: 'posthog', status: 'healthy', checked_at: '2026-09-25T12:00:00.000Z' }],
    });
    const mobileResponse = await request(router, '/mobile');
    const html = mobileResponse.body;
    expect(html).toContain('Guildmaster: Sterling');
    expect(html).toContain('Powered by Citadel Nexus Inc.');
    expect(html).toContain('/mobile/config.js');
    expect(html).toContain('/assets/finance-mobile.js');
    expect(mobileResponse.headers['content-security-policy']).toContain('https://eu.posthog.com');
    const browserConfig = (await request(router, '/mobile/config.js')).body;
    expect(browserConfig).toContain('window.__FINANCE_POSTHOG_CONFIG__');
    expect(browserConfig).toContain('\\u003cpublic-key');
    expect(browserConfig).not.toContain('<public-key');
  });

  it('returns deterministic errors for unsupported methods and paths', async () => {
    const state = new FinanceFloorState();
    const router = createRealmRouter({ realm: () => state.snapshot(), party: () => state.party() });

    const methodResponse = await request(router, '/realm/finance.json', 'POST');
    expect(methodResponse.status).toBe(405);
    expect(methodResponse.headers.allow).toBe('GET');
    expect(methodResponse.json()).toEqual({ error: 'method_not_allowed' });

    const missingResponse = await request(router, '/missing');
    expect(missingResponse.status).toBe(404);
    expect(missingResponse.json()).toEqual({ error: 'not_found' });
  });

  it('fails softly when the development mobile bundle is absent', async () => {
    const state = new FinanceFloorState();
    const router = createRealmRouter({ realm: () => state.snapshot(), party: () => state.party() });

    const response = await request(router, '/assets/finance-mobile.js');
    expect(response.status).toBe(404);
    expect(response.json()).toEqual({ error: 'asset_unavailable' });
  });
});

interface TestResponse {
  readonly body: string;
  readonly headers: Record<string, string>;
  readonly status: number;
  json(): unknown;
}

async function request(
  router: (request: IncomingMessage, response: ServerResponse) => Promise<void>,
  path: string,
  method = 'GET',
): Promise<TestResponse> {
  let body = '';
  let status = 0;
  let headers: Record<string, string> = {};
  const response = {
    headersSent: false,
    writeHead(code: number, nextHeaders: Record<string, string>): typeof response {
      status = code;
      headers = nextHeaders;
      response.headersSent = true;
      return response;
    },
    end(chunk?: string | Uint8Array): typeof response {
      if (typeof chunk === 'string') body += chunk;
      else if (chunk !== undefined) body += Buffer.from(chunk).toString('utf8');
      return response;
    },
  };
  await router({ method, url: path } as IncomingMessage, response as unknown as ServerResponse);
  return {
    body,
    headers,
    status,
    json(): unknown {
      return JSON.parse(body) as unknown;
    },
  };
}
