---
name: pharos-x402-payments
description: Scaffold and operate the full x402 HTTP micropayment stack on Pharos Network. Agent can monetize API endpoints (server) and autonomously pay for access to paid endpoints (client). Use whenever user mentions x402, HTTP 402, API payments, micropayments, pay-per-call, monetize endpoint, or payment middleware. Also use when building agent-to-agent payment flows on Pharos.
---

# Pharos x402 Payments

## Prerequisites

```bash
which node && node --version || { echo "Install Node.js >= 20"; exit 1; }
which cast || (echo "Install Foundry: curl -L https://foundry.paradigm.xyz | bash && foundryup" && exit 1)
```

Requires: `pharos-agent-wallet` (auto-installed as dependency — handles spend caps and key management).

## Network Configuration

- Network ID: `eip155:688689` (CAIP-2 format for x402 protocol)
- Read RPC from `shared/assets/networks.json → testnet.rpc`
- Token config: explicit — never default silently to a token address

**IMPORTANT**: The x402 test USDC (`0xE0BE08c77f415F577A1B3A9aD7a1Df1479564ec8`) is **UNOFFICIAL** — for testing only. See `shared/assets/tokens.json → testnet.USDC_X402_TEST`. Configure your token address explicitly in `.env`.

## include _guardrails.md

See `shared/references/_guardrails.md`. Agent-wallet spend caps + allowlist enforced on every payment.

## Capability Index

| User Need | Capability | Detailed Instructions |
|-----------|-----------|----------------------|
| Monetize an Express endpoint | Server setup | [→ server.md#setup](#setup) |
| Add a priced route | Priced route config | [→ server.md#priced-routes](#priced-routes) |
| Pay for an x402-gated endpoint | Client setup | [→ client.md#setup](#setup) |
| Wrap fetch with payment | wrapFetchWithPayment | [→ client.md#wrap-fetch](#wrap-fetch) |
| Run x402 facilitator | Facilitator setup | [→ facilitator.md#setup](#setup) |
| Configure Pharos network in x402 | Network config | [→ facilitator.md#network-config](#network-config) |
| Configure spend cap for client | Spend cap | Use `pharos-agent-wallet` → spend-cap |
| Retry / idempotency | Retry logic | [→ client.md#retry-idempotency](#retry-idempotency) |

## Security Reminders

- NEVER send private key to any LLM, API, or external service
- Spend cap enforced via agent-wallet — REFUSE payment if it would exceed session cap
- Token address must be explicitly configured — do not silently use unofficial test addresses in production
- Idempotency keyed on tx hash — same payment cannot be double-charged
- Short-lived access token (JWT or session key) for repeated access instead of re-paying each call
