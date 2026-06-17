---
name: pharos-deploy-kit
description: Deploy Solidity contracts to Pharos Network. Supports standard forge script deploy and deterministic CREATE2/CREATE3 for same-address-across-networks. Use whenever user mentions deploy, publish contract, forge script, create2, salt, or cross-network address. Always dry-runs on testnet before any mainnet deploy.
---

# Pharos Deploy Kit

## Prerequisites

```bash
which forge || (echo "Install Foundry: curl -L https://foundry.paradigm.xyz | bash && foundryup" && exit 1)
which cast  || (echo "Install Foundry: curl -L https://foundry.paradigm.xyz | bash && foundryup" && exit 1)
```

Also requires: `pharos-contract-verify` skill (auto-installed as dependency).

## Network Configuration

Read all values from `shared/assets/networks.json`. Default: Atlantic Testnet (`chainId: 688689`).

**Mainnet gate**: Any broadcast to `chainId 1672` requires explicit "This is a MAINNET transaction with real value" statement + user confirmation.

## include _guardrails.md

See `shared/references/_guardrails.md` — complete Write Operation Pre-Check Sequence required before any broadcast.

## Capability Index

| User Need | Capability | Detailed Instructions |
|-----------|-----------|----------------------|
| Deploy contract with forge script | Standard deploy | [→ deploy.md#standard-deploy](#standard-deploy) |
| Dry-run / simulate deploy | Dry-run mode | [→ deploy.md#dry-run](#dry-run) |
| Deploy to same address on testnet and mainnet | Deterministic CREATE2 | [→ deterministic.md#create2-deploy](#create2-deploy) |
| Predict address before deploy | Address prediction | [→ deterministic.md#predict-address](#predict-address) |
| Deploy with CREATE3 (mainnet) | CreateX / CREATE3 | [→ deterministic.md#create3-deploy](#create3-deploy) |
| Manage deploy salt | Salt management | [→ deterministic.md#salt-management](#salt-management) |
| Encode constructor args for deploy | Arg encoding | [→ deploy.md#constructor-args](#constructor-args) |
| Verify after deploy | Post-deploy verify | Use `pharos-contract-verify` skill |

## Security Reminders

- Complete 4-step Write Operation Pre-Check (guardrails) before every broadcast
- Dry-run FIRST: `forge script` without `--broadcast` is mandatory
- Record deployed addresses in `.pharos/deployed.json` for audit trail
- Transfer ownership of new contracts to a Safe — see `pharos-safe-multisig`
- Salt reuse on CREATE2 with different bytecode will silently fail (address collision)
