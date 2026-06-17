---
name: pharos-token-factory
description: Deploy ERC20, ERC721, and ERC1155 tokens on Pharos Network using audited OpenZeppelin contracts. Use this skill whenever the user wants to create a token, deploy an NFT collection, mint tokens, burn tokens, pause transfers, or transfer token ownership. Triggers on "deploy token", "create ERC20", "mint NFT", "launch collection", "token with cap", "pausable token", "burnable".
---

# Pharos Token Factory

## Prerequisites

```bash
which forge || (echo "Install Foundry: curl -L https://foundry.paradigm.xyz | bash && foundryup" && exit 1)
which cast  || (echo "Install Foundry: curl -L https://foundry.paradigm.xyz | bash && foundryup" && exit 1)
```

Requires: `pharos-deploy-kit` + `pharos-contract-verify` (auto-installed as dependencies).

Contracts in: `shared/assets/token-factory/` (or `contracts/src/` at repo root).

## Network Configuration

Read from `shared/assets/networks.json`. Default: Atlantic Testnet (`chainId: 688689`).

## include _guardrails.md

See `shared/references/_guardrails.md` — complete Write Operation Pre-Check Sequence before any tx.

## Capability Index

| User Need | Capability | Detailed Instructions |
|-----------|-----------|----------------------|
| Deploy ERC20 token | Deploy ERC20 | [→ erc20.md#deploy](#deploy) |
| Deploy NFT collection (ERC721) | Deploy ERC721 | [→ erc721.md#deploy](#deploy) |
| Deploy multi-token (ERC1155) | Deploy ERC1155 | [→ erc1155.md#deploy](#deploy) |
| Mint ERC20 tokens | Mint fungible | [→ erc20.md#mint](#mint) |
| Mint NFT / ERC721 | Mint NFT | [→ erc721.md#mint](#mint) |
| Mint ERC1155 tokens | Mint multi-token | [→ erc1155.md#mint](#mint) |
| Burn tokens | Burn | [→ erc20.md#burn](#burn) |
| Pause token transfers | Pause | [→ erc20.md#pause](#pause) |
| Transfer token ownership | Transfer ownership | [→ erc20.md#transfer-ownership](#transfer-ownership) |
| Read token balance | Balance check | [→ erc20.md#read-ops](#read-ops) |
| Check total supply | Supply check | [→ erc20.md#read-ops](#read-ops) |

## Guardrails for Token Deployment

**REFUSE** (or require explicit confirmation) the following combinations:
- Unlimited mint capability + renounced/zero-address owner: "This leaves the token with uncapped supply and no access control — are you certain? Type CONFIRM to proceed."
- No access control whatsoever: Warn "No owner or role — minting and pausing will be impossible post-deploy."
- `decimals > 18`: Hard error — `StandardERC20` rejects this in constructor.
- `initialSupply > cap` (when cap > 0): Hard error — constructor reverts.

**ALWAYS recommend** transferring ownership to a Gnosis Safe — see `pharos-safe-multisig` skill.

## Security Reminders

- Complete 4-step Write Operation Pre-Check before every deploy/write
- Never deploy with `owner = address(0)` unless intentional and explicitly confirmed
- Infinite approvals (`type(uint256).max`) disabled by default — use exact amounts
- Verify contract source after deploy via `pharos-contract-verify`
