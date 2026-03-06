# Guild: Finance

> *"Revenue is a fact. Everything else is a story."*

The Finance Guild is Citadel's source of truth for money. Real subscription data
from Stripe, meeting room management via Cal.com, AI-powered forecasting via
AWS Bedrock, and cross-guild commission attribution. No fake percentages.
No hardcoded projections. Only live data.

---

## Identity

| | |
|---|---|
| **Sigil** | The Scales |
| **Vibe** | Sharp. Unforgiving. The number either adds up or it doesn't. |
| **Color** | Emerald `#00703C` |
| **NATS Prefix** | `citadel.finance.*` |
| **Port** | `8092` |
| **Parent Guild** | Finance (root) |

---

## Purpose

- Surface **live Stripe revenue** — MRR, ARR, churn, LTV by guild
- Manage **Cal.com meeting rooms** and booking analytics
- Run **Bedrock AI forecasting** — revenue projection, churn prediction, contract scoring
- Track **commission attribution** across ZES + TradeBuilder tiers
- Power **NL queries** — ask the Finance engine a question, get a data-backed answer
- Feed the **19 Metabase dashboards** with clean, deduplicated revenue data

---

## Domains of Operation

### Revenue Tracking
| Source | Subjects tracked |
|--------|-----------------|
| Stripe live keys | Subscriptions, payments, refunds, disputes |
| ZES tiers | Scout $15 / Operator $20 / Autopilot $30 |
| TradeBuilder | Starter $129 / Growth $199 / Premium $299 |

### Bedrock AI Functions
| Function | Model | Description |
|----------|-------|-------------|
| Revenue forecast | Claude Opus 4.5 | 90-day MRR projection |
| Churn analysis | Claude Opus 4.5 | At-risk subscription detection |
| Contract scoring | Claude Haiku 4.5 | Deal quality 0–100 |
| NL query | Claude Sonnet 4.6 | Natural language → SQL + answer |
| Meeting brief | Claude Haiku 4.5 | Pre-meeting account summary |

### Key Rotation
2 AWS IAM keys with automatic rotation — never a stale Bedrock credential.

---

## Services & Integrations

| Service | Role |
|---------|------|
| **Stripe** | Live subscription + payment webhook data |
| **AWS Bedrock** | Claude Opus/Haiku/Sonnet — AI analysis |
| **Cal.com** | Meeting rooms + booking management |
| **Supabase** | Finance tables + RLS by guild role |
| **Metabase** | 19 dashboards — revenue, churn, LTV |
| **NATS** | `citadel.finance.*`, `crewpay.payment.*` |

---

## NATS Event Subjects

```
citadel.finance.subscription.new    — New Stripe subscription
citadel.finance.subscription.churn  — Cancellation event
citadel.finance.payment.failed      — Payment failure (triggers dunning)
citadel.finance.forecast.ready      — Bedrock forecast completed
citadel.finance.commission.awarded  — Cross-guild commission attributed
crewpay.payment.failed              — Triggers governance hold
```

---

## Getting Started

```bash
npm install
cp .env.example .env
# Fill STRIPE_SECRET_KEY, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, CALCOM_API_KEY
npm run dev
```

## Environment Variables

```
NATS_URL=nats://<your-nats-host>:4222
STRIPE_SECRET_KEY=<sk_live_...>
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>
AWS_REGION=us-west-2
CALCOM_API_KEY=<key>
SUPABASE_SERVICE_ROLE_KEY=<key>
GUILD_PORT=8092
```
