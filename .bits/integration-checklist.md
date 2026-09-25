# ─── CGRF Header ───────────────────────────────────────────────
# File:        .bits/integration-checklist.md
# Stage:       11_COMMIT
# SRS:         SRS-CN-FINANCE-LIVINGWORLD-001
# CAPS:        pending
# CK:          pending
# Dispatch:    DISP-LIVINGWORLD-finance
# Seat:        BITS-CODEGEN
# Owner:       Citadel Nexus Inc.
# Created:     2026-09-25
# Depends:     src/integrations/, src/automation/guild-comms.ts
# EnumType:    Doc
# EnumEdges:   CONSUMES src/integrations/contracts.ts; CONSUMES src/automation/guild-comms.ts
# DAG Node:    finance.integrations.checklist
# Intent:      Document configuration, health evidence, and quiet fallback for every Finance dependency.
# ───────────────────────────────────────────────────────────────

# Finance Guild integration checklist

All credentials are runtime-only. A configured provider remains off until
its PostHog circuit-breaker flag evaluates to true. Health output is
count/status-only at `GET /health/integrations`.

| System | Status | Required environment | Health check | Fail-soft behavior |
|---|---|---|---|---|
| Stripe | Upstream via Supabase | Supplied to private Stripe→Supabase workflow, never this repo | Observe sanitized `transaction_observed` events | No events; floor decays to quiet |
| Cal.com | Upstream event source | Supplied to private Cal.com→n8n workflow | Signed `meeting_managed` event accepted | No meeting progression |
| Bedrock | Upstream forecast source | Supplied to private Bedrock→n8n workflow | Signed `forecast_generated` event accepted | No forecast progression or summary |
| Supabase | Integrated, optional | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_FINANCE_ACTIVITY_TABLE` | Realtime reports `healthy` after `SUBSCRIBED` | Disabled/degraded; quiet floor |
| PostHog | Integrated, optional | `POSTHOG_API_KEY`, `POSTHOG_HOST`; browser `POSTHOG_PUBLIC_KEY`, `POSTHOG_PUBLIC_HOST` | Flag evaluation and capture update health | Flags fail closed; analytics become no-op |
| Customer.io | Integrated, optional | `CUSTOMERIO_SITE_ID`, `CUSTOMERIO_API_KEY`, `CUSTOMERIO_TRACK_URL` | Successful Track API response | Notification returns false; floor continues |
| GitLab | Integrated, read-only | `GITLAB_BASE_URL`, `GITLAB_READ_TOKEN`, `GITLAB_PROJECT_ID`, `GITLAB_FINANCE_CONFIG_PATH`, optional `GITLAB_REF` | Sanitized config/pipeline/MR sync | No projection and no quests |
| n8n | Integrated, signed ingress | `N8N_WEBHOOK_SECRET` | HMAC-valid event returns HTTP 202 | Missing flag/secret: 503; invalid signature: 401 |
| NATS | Integrated, optional | `NATS_URL` plus runtime mTLS configuration | Connection/flush and subscription health | Local realm remains available; events no-op |

## Circuit-breaker flags

- `finance-customer-io`
- `finance-gitlab-read-bridge`
- `finance-supabase-realtime`
- `finance-n8n-webhooks`
- `finance-guild-comms`
- `finance-mobile-realm-feed`

## Data boundary

Adapters may inspect provider payloads in memory, but the shared contract
accepts only opaque IDs, operation counts, coarse status, timestamps, and an
optional open/closed quest state. Amounts, account identifiers, titles,
tenant IDs, email addresses, and raw provider objects are never logged,
published, or exposed by HTTP.

## Cross-guild notation

The requested logical arrows map to valid NATS subjects:

- Finance→all: `citadel.guild.comms.finance.broadcast`
- Any guild→Finance: `citadel.guild.comms.*.finance`

NATS wildcards must occupy a full dot-delimited token, so an arrow and
wildcard cannot be embedded in one token.
