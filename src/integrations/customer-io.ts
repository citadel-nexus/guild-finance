// ─── CGRF Header ───────────────────────────────────────────────
// File:        src/integrations/customer-io.ts
// Stage:       07_BUILD
// SRS:         SRS-CN-FINANCE-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-finance
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     src/integrations/contracts.ts
// EnumType:    Adapter
// EnumEdges:   DEPENDS_ON src/integrations/contracts.ts; PRODUCES Customer.io sanitized notification events
// DAG Node:    finance.integrations.customer-io
// Intent:      Trigger role-segmented guild notifications without exposing recipient or financial payloads.
// ───────────────────────────────────────────────────────────────

import { logWarn } from '../logging.js';
import type { FeatureGate, IntegrationHealthRegistry } from './contracts.js';

export type FinancialRole = 'analyst' | 'member' | 'treasurer';

export interface GuildRecipient {
  readonly financial_role: FinancialRole;
  readonly member_id: string;
}

export interface CustomerIoConfig {
  readonly api_key: string;
  readonly site_id: string;
  readonly track_url: string;
}

export class CustomerIoIntegration {
  public constructor(
    private readonly config: CustomerIoConfig,
    private readonly gate: FeatureGate,
    private readonly health: IntegrationHealthRegistry,
    private readonly request: typeof fetch = fetch,
  ) {
    health.set('customer_io', 'healthy');
  }

  public async segment(recipient: GuildRecipient): Promise<boolean> {
    validateRecipient(recipient);
    return this.send(`/customers/${encodeURIComponent(recipient.member_id)}`, 'PUT', {
      guild: 'finance',
      financial_role: recipient.financial_role,
    });
  }

  public async revenueMilestone(recipient: GuildRecipient, milestoneLevel: number): Promise<boolean> {
    return this.event(recipient, 'revenue_milestone', { milestone_level: positiveInteger(milestoneLevel) });
  }

  public async forecastSummary(recipient: GuildRecipient, completedRuns: number): Promise<boolean> {
    return this.event(recipient, 'forecast_summary', { completed_runs: nonNegativeInteger(completedRuns) });
  }

  public async commissionPayout(recipient: GuildRecipient, payoutCount: number): Promise<boolean> {
    return this.event(recipient, 'commission_payout', { payout_count: positiveInteger(payoutCount) });
  }

  public async meetingReminder(recipient: GuildRecipient, minutesUntil: number): Promise<boolean> {
    return this.event(recipient, 'meeting_reminder', { minutes_until: nonNegativeInteger(minutesUntil) });
  }

  private async event(
    recipient: GuildRecipient,
    name: string,
    data: Readonly<Record<string, number>>,
  ): Promise<boolean> {
    validateRecipient(recipient);
    return this.send(`/customers/${encodeURIComponent(recipient.member_id)}/events`, 'POST', {
      name,
      data: { ...data, guild: 'finance', financial_role: recipient.financial_role },
    });
  }

  private async send(path: string, method: 'POST' | 'PUT', body: object): Promise<boolean> {
    if (!(await this.gate.enabled('finance-customer-io'))) {
      this.health.set('customer_io', 'disabled');
      return false;
    }
    try {
      const base = this.config.track_url.endsWith('/') ? this.config.track_url : `${this.config.track_url}/`;
      const response = await this.request(new URL(path.replace(/^\//, ''), base), {
        method,
        headers: {
          authorization: `Basic ${Buffer.from(`${this.config.site_id}:${this.config.api_key}`).toString('base64')}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5_000),
      });
      this.health.set('customer_io', response.ok ? 'healthy' : 'degraded');
      return response.ok;
    } catch (error) {
      this.health.set('customer_io', 'degraded');
      logWarn('customer_io_degraded', { error_type: error instanceof Error ? error.name : 'UnknownError' });
      return false;
    }
  }
}

export function createCustomerIoIntegration(
  gate: FeatureGate,
  health: IntegrationHealthRegistry,
  env: NodeJS.ProcessEnv = process.env,
): CustomerIoIntegration | null {
  const siteId = env.CUSTOMERIO_SITE_ID;
  const apiKey = env.CUSTOMERIO_API_KEY;
  const trackUrl = env.CUSTOMERIO_TRACK_URL;
  if (siteId === undefined || apiKey === undefined || trackUrl === undefined) {
    health.set('customer_io', 'disabled');
    return null;
  }
  return new CustomerIoIntegration({ site_id: siteId, api_key: apiKey, track_url: trackUrl }, gate, health);
}

function validateRecipient(recipient: GuildRecipient): void {
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(recipient.member_id)) throw new TypeError('member id must be opaque');
}

function positiveInteger(value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) throw new RangeError('value must be a positive safe integer');
  return value;
}

function nonNegativeInteger(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError('value must be a non-negative safe integer');
  return value;
}
