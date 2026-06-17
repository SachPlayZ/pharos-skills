---
name: pharos-contract-verify
description: Verify any deployed Solidity contract on Pharos Network (Atlantic Testnet or Pacific Mainnet) using Blockscout. Use this skill whenever the user wants to verify a contract, publish source code, check verification status, or needs constructor argument encoding. Triggers on: "verify contract", "publish source", "check verified", "blockscout verification", "constructor args encode".
---

# Pharos Contract Verify

## Prerequisites

```bash
which forge || (echo "Install Foundry: curl -L https://foundry.paradigm.xyz | bash && foundryup" && exit 1)
which cast  || (echo "Install Foundry: curl -L https://foundry.paradigm.xyz | bash && foundryup" && exit 1)
```

## Network Configuration

Read all network values from `shared/assets/networks.json`. Never hardcode RPC, chain ID, or verifier URL.

- **Default**: Atlantic Testnet (`chainId: 688689`)
- **Mainnet gate**: If user targets `chainId 1672`, state "This is MAINNET verification" and confirm.

## include _guardrails.md

See `shared/references/_guardrails.md` for full guardrail protocol. Key points:
- Foundry pre-check required
- Network confirmation required
- No private key needed for read-only verification

## Capability Index

| User Need | Capability | Detailed Instructions |
|-----------|-----------|----------------------|
| Verify contract, no constructor args | Basic verify | [→ verify.md#no-constructor-args](#no-constructor-args) |
| Verify contract with constructor arguments | Verify with args | [→ verify.md#with-constructor-args](#with-constructor-args) |
| Encode constructor arguments | ABI-encode args | [→ verify.md#encode-constructor-args](#encode-constructor-args) |
| Already verified / re-verify | Handle already-verified | [→ verify.md#already-verified](#already-verified) |
| Verification fails, source mismatch | Debug mismatch | [→ verify.md#error-handling](#error-handling) |
| Retry after indexer delay | Retry logic | [→ verify.md#retry-logic](#retry-logic) |
| Check if contract is verified | Status check | [→ verify.md#status-check](#status-check) |

## Security Reminders

- Verification is read-only — no private key needed
- Never share private keys during verification workflows
- Compiler version and optimizer settings MUST match exactly what was used during deployment
