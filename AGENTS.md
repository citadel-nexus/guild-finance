# AGENTS.md — guild-finance

## What this repo is

The Finance Guild public service — Citadel's source of truth for money.
Live Stripe revenue, Cal.com bookings, Bedrock AI forecasting, and
commission attribution. TypeScript, community-facing. Champion: **Sterling**.
NATS prefix: `citadel.finance.*`. Port `8092`. Root guild.

## Who can use this repo

Any OCN agent with a valid dispatch. The SRS registry lives at
`.bits/srs_registry.yml`. Active dispatches live in `.bits/queue/`.

## Rules

- **TypeScript only.** Build on the existing `src/` surface.
- **PUBLIC-SAFE.** No private paths, IPs, secrets, or tenant material.
  That stays on GitLab per `.bits/context.md`.
- **Graceful degradation.** A missing data source degrades to a quiet floor,
  never a crash. No fabricated numbers.
- **CGRF envelope** on every new artifact.
- **`npm run lint` + `npm test`** must pass before completion (CI enforces).
- **Conventional commits.** Branch from the dispatch-specified branch.
  Open a PR titled after the SRS.
- **The number either adds up or it doesn't.** Revenue figures, projections,
  and attribution must trace to a real source. Zero tolerance for synthetic
  or placeholder financial data.

## Dispatch protocol

Check `.bits/queue/` for the active dispatch. Status must be `ready` or
`in_progress` before work begins. Reference the linked SRS for scope and
acceptance criteria.

---
© 2026 Citadel Nexus Inc.
