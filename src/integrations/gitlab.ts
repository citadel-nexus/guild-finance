// ─── CGRF Header ───────────────────────────────────────────────
// File:        src/integrations/gitlab.ts
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
// EnumEdges:   DEPENDS_ON src/integrations/contracts.ts; PRODUCES sanitized GitLab quest state
// DAG Node:    finance.integrations.gitlab
// Intent:      Read private GitLab state through an allowlisted projection without returning raw payloads.
// ───────────────────────────────────────────────────────────────

import { createHash } from 'node:crypto';

import { logWarn } from '../logging.js';
import type {
  FeatureGate,
  GuildActivitySink,
  IntegrationHealthRegistry,
  SanitizedGuildActivity,
} from './contracts.js';

export interface GitLabConfig {
  readonly base_url: string;
  readonly config_path: string;
  readonly project_id: string;
  readonly read_token: string;
  readonly ref: string;
}

export interface GitLabProjection {
  readonly financial_config: { readonly enabled_integration_count: number; readonly revision: string } | null;
  readonly open_merge_requests: number;
  readonly pipeline_status: 'canceled' | 'failed' | 'pending' | 'running' | 'success' | 'unknown';
}

export class GitLabReadOnlyBridge {
  public constructor(
    private readonly config: GitLabConfig,
    private readonly gate: FeatureGate,
    private readonly sink: GuildActivitySink,
    private readonly health: IntegrationHealthRegistry,
    private readonly request: typeof fetch = fetch,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  public async sync(): Promise<GitLabProjection | null> {
    if (!(await this.gate.enabled('finance-gitlab-read-bridge'))) {
      this.health.set('gitlab', 'disabled');
      return null;
    }
    try {
      const [config, pipelines, mergeRequests] = await Promise.all([
        this.fetchJson(`/repository/files/${encodeURIComponent(this.config.config_path)}/raw?ref=${encodeURIComponent(this.config.ref)}`),
        this.fetchJson('/pipelines?per_page=1'),
        this.fetchJson('/merge_requests?state=opened&per_page=20'),
      ]);
      const projection = sanitizeProjection(config, pipelines, mergeRequests);
      await this.recordMergeRequests(mergeRequests);
      this.health.set('gitlab', 'healthy');
      return projection;
    } catch (error) {
      this.health.set('gitlab', 'degraded');
      logWarn('gitlab_bridge_degraded', { error_type: error instanceof Error ? error.name : 'UnknownError' });
      return null;
    }
  }

  private async fetchJson(path: string): Promise<unknown> {
    const base = this.config.base_url.endsWith('/') ? this.config.base_url : `${this.config.base_url}/`;
    const url = new URL(`api/v4/projects/${encodeURIComponent(this.config.project_id)}${path}`, base);
    const response = await this.request(url, {
      headers: { 'private-token': this.config.read_token },
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw new Error(`GitLab read returned ${response.status}`);
    return response.json() as Promise<unknown>;
  }

  private async recordMergeRequests(payload: unknown): Promise<void> {
    if (!Array.isArray(payload)) return;
    for (const item of payload) {
      if (!isRecord(item) || typeof item.iid !== 'number') continue;
      const activity: SanitizedGuildActivity = {
        source: 'gitlab',
        type: 'merge_request',
        status: 'opened',
        units: 1,
        opaque_id: opaqueId(`${this.config.project_id}:${item.iid}`),
        occurred_at: this.clock().toISOString(),
        quest_state: 'open',
      };
      await this.sink.record(activity);
    }
  }
}

export function createGitLabBridge(
  gate: FeatureGate,
  sink: GuildActivitySink,
  health: IntegrationHealthRegistry,
  env: NodeJS.ProcessEnv = process.env,
): GitLabReadOnlyBridge | null {
  const baseUrl = env.GITLAB_BASE_URL;
  const token = env.GITLAB_READ_TOKEN;
  const projectId = env.GITLAB_PROJECT_ID;
  const configPath = env.GITLAB_FINANCE_CONFIG_PATH;
  if (baseUrl === undefined || token === undefined || projectId === undefined || configPath === undefined) {
    health.set('gitlab', 'disabled');
    return null;
  }
  return new GitLabReadOnlyBridge(
    { base_url: baseUrl, read_token: token, project_id: projectId, config_path: configPath, ref: env.GITLAB_REF ?? 'main' },
    gate,
    sink,
    health,
  );
}

export function sanitizeProjection(
  rawConfig: unknown,
  rawPipelines: unknown,
  rawMergeRequests: unknown,
): GitLabProjection {
  const pipeline = Array.isArray(rawPipelines) && isRecord(rawPipelines[0]) ? rawPipelines[0] : null;
  const allowed = ['canceled', 'failed', 'pending', 'running', 'success'] as const;
  const candidateStatus = pipeline?.status;
  const pipelineStatus = allowed.find((status) => status === candidateStatus) ?? 'unknown';
  const config = isRecord(rawConfig) ? rawConfig : null;
  const integrations = config?.integrations;
  const revision = config?.revision;
  return {
    financial_config:
      isRecord(integrations) && typeof revision === 'string'
        ? { enabled_integration_count: Object.values(integrations).filter(Boolean).length, revision: sanitizeRevision(revision) }
        : null,
    open_merge_requests: Array.isArray(rawMergeRequests) ? rawMergeRequests.length : 0,
    pipeline_status: pipelineStatus,
  };
}

function opaqueId(value: string): string {
  return `gitlab-${createHash('sha256').update(value).digest('hex').slice(0, 16)}`;
}

function sanitizeRevision(value: string): string {
  return /^[A-Za-z0-9._-]{1,40}$/.test(value) ? value : 'unavailable';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
