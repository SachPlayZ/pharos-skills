---
name: pharos-agent-wallet
description: Autonomous agent wallet management for Pharos Network — the safety layer every transacting agent uses. Provides: balance preflight, gas estimation, nonce conflict resolution, per-session spend caps (tracked in .pharos/spend-ledger.json), recipient allowlist/denylist (.pharos/allowlist.json), and simulate-before-send pattern. Use whenever an agent needs to send a transaction, check balance, estimate gas, manage nonce, or enforce spending limits. Triggers on "check balance", "estimate gas", "send tx", "nonce error", "spend limit", "allowlist", or any tx-sending context.
---

# Pharos Agent Wallet

## Prerequisites

```bash
which cast || (echo "Install Foundry: curl -L https://foundry.paradigm.xyz | bash && foundryup" && exit 1)
```

## Network Configuration

Read from `shared/assets/networks.json`. Default: Atlantic Testnet (`chainId: 688689`).

## include _guardrails.md

This skill IS the canonical implementation of Write Operation Pre-Checks. See also `shared/references/_guardrails.md`.

## Capability Index

| User Need | Capability | Detailed Instructions |
|-----------|-----------|----------------------|
| Check ETH/PHRS balance | Balance preflight | [→ wallet.md#balance-preflight](#balance-preflight) |
| Estimate gas for a transaction | Gas estimation | [→ wallet.md#gas-estimation](#gas-estimation) |
| Manage stuck/conflicting nonce | Nonce management | [→ wallet.md#nonce-management](#nonce-management) |
| Set per-session spend cap | Spend cap | [→ wallet.md#spend-cap](#spend-cap) |
| Enable recipient allowlist | Allowlist | [→ wallet.md#allowlist](#allowlist) |
| Simulate transaction before sending | Simulate-then-send | [→ wallet.md#simulate-then-send](#simulate-then-send) |
| Send native token | Send PHRS | [→ wallet.md#send-native](#send-native) |
| Send ERC20 token | Send ERC20 | [→ wallet.md#send-erc20](#send-erc20) |
| Full pre-check sequence | Write pre-checks | [→ wallet.md#write-pre-checks](#write-pre-checks) |

## Security Reminders

- NEVER log, echo, or commit `$PRIVATE_KEY`
- Keys from env or gitignored file only
- Spend cap enforced per session via `.pharos/spend-ledger.json`
- Allowlist mode: refuse any send to non-allowlisted address when enabled
- No infinite approvals — exact amounts only
