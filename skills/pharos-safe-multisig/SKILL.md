---
name: pharos-safe-multisig
description: Deploy and manage Gnosis Safe multisig wallets on Pharos Network for treasury management and contract ownership. Use whenever user mentions multisig, Safe wallet, treasury, multi-owner, threshold signing, or wants to transfer contract ownership to a Safe. Triggers on "create multisig", "gnosis safe", "treasury wallet", "2-of-3", "transfer ownership to safe", "propose transaction".
---

# Pharos Safe Multisig

## Prerequisites

```bash
which forge || (echo "Install Foundry: curl -L https://foundry.paradigm.xyz | bash && foundryup" && exit 1)
which cast  || (echo "Install Foundry: curl -L https://foundry.paradigm.xyz | bash && foundryup" && exit 1)
```

## Network Configuration

Read from `shared/assets/networks.json`. Default: Atlantic Testnet (`chainId: 688689`).
Canonical Safe contracts from `shared/assets/canonical-contracts.json`.

## include _guardrails.md

See `shared/references/_guardrails.md` for complete pre-check protocol.

## Capability Index

| User Need | Capability | Detailed Instructions |
|-----------|-----------|----------------------|
| Deploy new Safe | Deploy Safe | [→ safe.md#deploy-safe](#deploy-safe) |
| Propose a Safe transaction | Propose tx | [→ safe.md#propose-tx](#propose-tx) |
| Execute a queued transaction | Execute tx | [→ safe.md#execute-tx](#execute-tx) |
| Add owner to Safe | Add owner | [→ safe.md#add-owner](#add-owner) |
| Remove owner from Safe | Remove owner | [→ safe.md#remove-owner](#remove-owner) |
| Change signature threshold | Change threshold | [→ safe.md#change-threshold](#change-threshold) |
| Transfer contract ownership to Safe | Transfer ownership | [→ safe.md#transfer-ownership](#transfer-ownership) |
| List Safe owners | Read owners | [→ safe.md#read-ops](#read-ops) |
| Check Safe balance | Balance check | [→ safe.md#read-ops](#read-ops) |

## Guardrails

- Threshold must be ≥ 1 and ≤ owner count
- WARN on 1-of-N: "A 1-of-N Safe provides no real multisig protection — any single owner can drain funds. Consider at least 2-of-N."
- CONFIRM before any value-moving Safe execution
- Never add `address(0)` as owner

## Security Reminders

- Complete 4-step Write Operation Pre-Check before every tx
- Removing an owner that reduces threshold below owner count is blocked by Safe — adjust threshold first
- Always verify Safe address on explorer before sending funds
