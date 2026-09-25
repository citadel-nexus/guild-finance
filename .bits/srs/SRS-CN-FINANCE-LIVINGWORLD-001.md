# ─── CGRF Header ───────────────────────────────────────────────
# File:        .bits/srs/SRS-CN-FINANCE-LIVINGWORLD-001.md
# Stage:       04_HYPOTHESIZE
# SRS:         SRS-CN-FINANCE-LIVINGWORLD-001
# CAPS:        pending
# CK:          pending
# Dispatch:    DISP-LIVINGWORLD-finance
# Seat:        BITS-CODEGEN
# Owner:       Citadel Nexus Inc.
# Created:     2026-09-25
# Depends:     .bits/srs_registry.yml, .bits/queue/DISP-LIVINGWORLD-finance.md
# EnumType:    Doc
# EnumEdges:   DEPENDS_ON .bits/srs_registry.yml; GATES src/integrations/contracts.ts
# DAG Node:    finance.srs.living-world
# Intent:      Extend the registered floor contract to sanitized real-provider activity without exposing financial payloads.
# ───────────────────────────────────────────────────────────────

# SRS-CN-FINANCE-LIVINGWORLD-001 — Finance Guild · Living-World Floor

**Guild:** finance · **Champion:** Sterling · **Branch:** `bits/livingworld`

## Objective
The finance guild is the revenue + treasury core (billing, ledger, objectives). In the Citadel living world (the Aincrad Tower of Babel) this guild owns
**one floor**, and that floor visualises the guild's REAL activity. This system is the PUBLIC contract the floor
reads — the events this guild emits and the feed the game consumes. The in-game floor IS this guild's system.

## Public contract to build (this repo)
1. **Emit floor events** on the guild NATS namespace `citadel.finance.*` (already this repo's declared prefix):
   - `citadel.finance.activity` — a heartbeat with an `activity_level` 0..1 (drives the floor's size + glow).
   - `citadel.finance.quest` — a quest opened/closed (a real unit of guild work → an in-game quest marker).
   - `citadel.finance.champion` — the champion's (Sterling) state (idle/working/blocked).
2. **Expose a public realm feed** `GET /realm/finance.json` — non-secret, non-PII shape the game reads:
   ```json
   {
     "guild": "finance",
     "champion": "Sterling",
     "activity_level": 0.0,
     "quests": [{ "id": "q1", "title": "...", "state": "open" }],
     "structures": [{ "kind": "hall", "level": 1 }]
   }
   ```
3. **Bind the champion** — `Sterling` is this floor's guildmaster avatar in `/game/party.json`.

## Acceptance
- The feed returns the shape above; `activity_level` moves with real guild activity (no fabricated numbers).
- The three `citadel.finance.*` events publish on real state changes; a subscriber can render the floor from them.
- Nothing private is exposed — counts/status/method only, cleansed. Fail-soft: a missing source degrades to a
  quiet floor, never a crash.

## Operator-authorized integration extension

Real floor activity may be sourced from PostHog, Customer.io, GitLab,
Supabase, n8n, and cross-guild NATS when all of the following hold:

- provider credentials are supplied only through environment variables;
- private payloads are reduced to opaque IDs, counts, coarse status, and
  timestamps before reaching floor state;
- external reads are read-only, webhook writes are HMAC-authenticated, and
  feature flags fail closed;
- unavailable integrations produce disabled/degraded health and never
  synthetic activity;
- cross-guild messages contain status/count data only.

## Runbook
Build in THIS repo's TypeScript surface. Self-gate `npm run lint` + `npm test` (CI enforces). PUBLIC-SAFE only — this repo is the community funnel: NO private paths, NO IPs, NO secrets, NO tenant material (that stays on GitLab per .bits/context.md). Real data only. Conventional commit + the CGRF header. Branch `bits/livingworld`; open a PR titled after this SRS with objective, files, gate evidence.

---
© 2026 Citadel Nexus Inc.
