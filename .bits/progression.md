# ─── CGRF Header ───────────────────────────────────────────────
# File:        .bits/progression.md
# Stage:       11_COMMIT
# SRS:         SRS-CN-FINANCE-LIVINGWORLD-001
# CAPS:        pending
# CK:          pending
# Dispatch:    DISP-LIVINGWORLD-finance
# Seat:        BITS-CODEGEN
# Owner:       Citadel Nexus Inc.
# Created:     2026-09-25
# Depends:     src/progression.ts, src/integrations/contracts.ts
# EnumType:    Doc
# EnumEdges:   CONSUMES src/progression.ts; DEPENDS_ON src/integrations/contracts.ts
# DAG Node:    finance.floor.progression.spec
# Intent:      Define auditable structure levels driven only by cumulative verified operation counts.
# ───────────────────────────────────────────────────────────────

# Finance Guild floor progression

Thresholds are configuration targets, not claims about current performance.
Only verified provider events increment counters. All four requirements must
be met before the hall advances; missing sources never receive estimated
credit.

| Transition | Revenue operations processed | Forecasts generated | Commissions attributed | Meetings managed |
|---|---:|---:|---:|---:|
| Level 1 → 2 | 100 | 5 | 10 | 10 |
| Level 2 → 3 | 1,000 | 25 | 100 | 50 |
| Level 3 → 4 | 10,000 | 100 | 500 | 250 |
| Level 4 → 5 | 100,000 | 500 | 2,500 | 1,000 |

## Metric provenance

- Revenue processed: completed reconciliations and sanitized transaction
  outbox events; never currency amounts.
- Forecasts generated: completed Bedrock/n8n forecast operations.
- Commissions attributed: completed commission calculations and closed
  cross-guild claims.
- Meetings managed: completed Cal.com/n8n meeting operations.

Counters are non-negative integers. Duplicate suppression belongs to the
upstream outbox/workflow, which supplies a stable opaque event ID. The realm
exposes only the resulting hall level, not private counters.
