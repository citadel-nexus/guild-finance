// ─── CGRF Header ───────────────────────────────────────────────
// File:        src/server.ts
// Stage:       07_BUILD
// SRS:         SRS-CN-FINANCE-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-finance
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     src/routes/realm.ts, src/automation/livingworld-emitter.ts, src/telemetry.ts, src/integrations/contracts.ts
// EnumType:    Service
// EnumEdges:   DEPENDS_ON src/routes/realm.ts; DEPENDS_ON src/automation/livingworld-emitter.ts; DEPENDS_ON src/integrations/contracts.ts
// DAG Node:    finance.http.server
// Intent:      Compose the public service so HTTP remains available when NATS or telemetry is absent.
// ───────────────────────────────────────────────────────────────

import { createServer, type Server } from 'node:http';

import {
  createNatsFloorPublisher,
  FinanceLivingWorld,
  type FloorPublisher,
} from './automation/livingworld-emitter.js';
import { FinanceFloorState } from './finance-floor.js';
import { createRealmRouter } from './routes/realm.js';
import { DatadogFloorTelemetry, type FloorTelemetry } from './telemetry.js';
import { createPostHogIntegration } from './integrations/posthog.js';
import {
  FinanceActivitySink,
  IntegrationHealthRegistry,
  RollingActivityProjector,
  type ActivityAnalytics,
  type FeatureGate,
} from './integrations/contracts.js';
import { createCustomerIoIntegration, type CustomerIoIntegration } from './integrations/customer-io.js';
import { createGitLabBridge, type GitLabReadOnlyBridge } from './integrations/gitlab.js';
import { N8nWebhookIntegration } from './integrations/n8n-webhook.js';
import { createSupabaseBridge, type SupabaseActivityBridge } from './integrations/supabase.js';
import { createGuildCommsBridge, type GuildCommsBridge } from './automation/guild-comms.js';
import type { MobileAnalyticsConfig } from './mobile/product-analytics.js';

export interface FinanceApplication {
  readonly floor: FinanceLivingWorld;
  readonly customerIo: CustomerIoIntegration | null;
  readonly gitlab: GitLabReadOnlyBridge | null;
  readonly guildComms: GuildCommsBridge | null;
  readonly server: Server;
  readonly supabase: SupabaseActivityBridge | null;
  close(): Promise<void>;
}

export interface FinanceApplicationOptions {
  readonly natsUrl?: string;
  readonly publisher?: FloorPublisher;
  readonly telemetry?: FloorTelemetry;
  readonly analytics?: ActivityAnalytics;
  readonly featureGate?: FeatureGate;
  readonly env?: NodeJS.ProcessEnv;
}

export async function createFinanceApplication(
  options: FinanceApplicationOptions = {},
): Promise<FinanceApplication> {
  const publisher =
    options.publisher ?? (await createNatsFloorPublisher(options.natsUrl ?? process.env.NATS_URL));
  const telemetry = options.telemetry ?? new DatadogFloorTelemetry();
  const floor = new FinanceLivingWorld(new FinanceFloorState(), publisher, telemetry);
  const env = options.env ?? process.env;
  const health = new IntegrationHealthRegistry();
  const posthog = createPostHogIntegration(health, env);
  const gate = options.featureGate ?? posthog;
  const analytics = options.analytics ?? posthog;
  const sink = new FinanceActivitySink(floor, new RollingActivityProjector(), analytics);
  const customerIo = createCustomerIoIntegration(gate, health, env);
  const gitlab = createGitLabBridge(gate, sink, health, env);
  const supabase = createSupabaseBridge(gate, sink, health, env);
  const guildComms = await createGuildCommsBridge(options.natsUrl ?? env.NATS_URL, gate, sink, health);
  const n8n = new N8nWebhookIntegration(env.N8N_WEBHOOK_SECRET, gate, sink, health);
  await supabase?.start();
  void gitlab?.sync();
  const router = createRealmRouter(floor, () => health.snapshot(), publicMobileAnalyticsConfig(env));
  const server = createServer((request, response) => {
    void n8n.handle(request, response).then(async (handled) => {
      if (!handled) await router(request, response);
    }).catch(() => {
      if (!response.headersSent) {
        response.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
      }
      response.end(JSON.stringify({ error: 'request_failed' }));
    });
  });

  return {
    floor,
    customerIo,
    gitlab,
    guildComms,
    server,
    supabase,
    async close(): Promise<void> {
      await new Promise<void>((resolve, reject) => {
        if (!server.listening) {
          resolve();
          return;
        }
        server.close((error) => (error === undefined ? resolve() : reject(error)));
      });
      await publisher.close?.();
      await supabase?.close();
      await guildComms?.close();
      await posthog.close();
    },
  };
}

function publicMobileAnalyticsConfig(env: NodeJS.ProcessEnv): MobileAnalyticsConfig | undefined {
  const apiKey = env.POSTHOG_PUBLIC_KEY;
  const apiHost = env.POSTHOG_PUBLIC_HOST;
  if (apiKey === undefined || apiHost === undefined) return undefined;
  try {
    const url = new URL(apiHost);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined;
    return { api_key: apiKey, api_host: url.origin };
  } catch {
    return undefined;
  }
}
