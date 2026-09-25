# ─── CGRF Header ───────────────────────────────────────────────
# File:        CLAUDE.md
# Stage:       04_HYPOTHESIZE
# SRS:         SRS-CN-FINANCE-LIVINGWORLD-001
# CAPS:        pending
# CK:          pending
# Dispatch:    DISP-LIVINGWORLD-finance
# Seat:        BITS-CODEGEN
# Owner:       Citadel Nexus Inc.
# Created:     2026-09-25
# Depends:     AGENTS.md, .bits/context.md
# EnumType:    ConfigDoc
# EnumEdges:   DEPENDS_ON AGENTS.md; GATES SRS-CN-FINANCE-LIVINGWORLD-001
# DAG Node:    finance.governance.companion
# Intent:      Define deterministic public-safe operating rules for Finance Guild agents.
# ───────────────────────────────────────────────────────────────

# CLAUDE.md — Finance Guild governance companion

## Service identity

- Guild: Finance
- Champion: Sterling
- Champion color: Emerald `#00703C`
- Runtime: TypeScript on Node.js
- Port: `8092`
- NATS namespace: `citadel.finance.*`
- Legal entity: Citadel Nexus Inc.

This repository is the public Finance Guild surface. All work must remain
PUBLIC-SAFE and must preserve traceability for every financial value.

## Bootstrap exception

Governance files cannot require themselves to pre-exist. A dispatch that
explicitly creates or repairs `AGENTS.md`, `CLAUDE.md`, `.bits/context.md`,
the SRS registry, or its own queue record may create those prerequisites
before applying their read order. The exception ends as soon as the required
files exist. It does not authorize product work without a ready or
in-progress dispatch and registered SRS.

## Pre-flight

Before product work, read in order:

1. `AGENTS.md`
2. `CLAUDE.md`
3. `.bits/context.md`
4. `.bits/srs_registry.yml`
5. the active SRS
6. the active dispatch
7. its Memory Brief

Stop closed if the dispatch is absent, unauthorized, ambiguous, or outside
the registered SRS scope.

## Deterministic agent behavior

- Agents may read PUBLIC-SAFE repository content to evaluate a dispatch.
- Agents may write only when a dispatch is `ready` or `in_progress` and the
  requested path and behavior are inside its registered SRS.
- Agents must use only the capabilities and NATS subjects declared for their
  seat in `.bits/agents/`.
- Agents must not expand their own authority, create financial facts, or
  substitute synthetic values when a source is missing.
- Missing dependencies, telemetry, or upstream data produce an explicit
  quiet/degraded state. They never produce invented revenue or attribution.
- Ambiguous scope, unavailable authority, or a failed governance gate must
  be escalated to the seat's declared escalation target before further writes.
- Cross-seat work requires a handoff; one seat must not impersonate another.
- Tests and telemetry assertions are evidence, not authorization.

## Seat authority

Sterling is the Finance champion seat. Sterling may coordinate public floor
activity, quests, and champion state within `citadel.finance.*`; expose the
public realm feed; and report health. Sterling cannot publish outside that
namespace, mutate private finance systems, or write financial records.

BITS-CODEGEN may implement a ready dispatch in this public repository, add
tests and observability, and prepare a reviewable commit. It cannot deploy,
merge, push directly to `main`, modify private systems, or broaden an SRS.

Unknown or undeclared seats are read-only and must escalate to Sterling.

## Hard NO

- No credentials, tokens, secrets, private endpoints, private paths, tenant
  material, or production financial records.
- No direct push to `main` and no autonomous write without dispatch
  authorization.
- Never identify the entity as anything other than Citadel Nexus Inc.
- No fabricated, placeholder, or synthetic financial data.
- No publishing outside `citadel.finance.*`.
- No private CNWB package imports or direct private-stack access.
- No silent fallback that changes the meaning of a financial figure.

## Engineering conventions

- TypeScript only; build on `src/`.
- Bind the HTTP server to port `8092` unless the environment supplies an
  explicit test-safe override.
- Use conventional commits and include the SRS and dispatch identifiers.
- Keep one SRS per branch and pull request.
- Run `npm run lint` and `npm test` before completion.

---
© 2026 Citadel Nexus Inc.
