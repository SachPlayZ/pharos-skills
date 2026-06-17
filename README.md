# pharos-skills

Six production-grade composable Skills for on-chain operations on the **Pharos Network**, plus a CLI installer modeled after the Vercel Skills CLI.

```bash
npx pharos-skills add <skill>
```

A **Pharos Skill** is a folder that a coding agent (Claude Code, opencode, etc.) reads at runtime: `SKILL.md` is the entry point, `references/*.md` contain exact command specs, and `assets/` holds contracts and templates. The agent reads the Capability Index in `SKILL.md` → matches user intent → opens the linked reference → runs the exact `cast`/`forge` command.

---

## The 6 Skills

```
pharos-contract-verify   ──────────────────────────────── no deps
pharos-deploy-kit        ──→ pharos-contract-verify
pharos-token-factory     ──→ pharos-deploy-kit + pharos-contract-verify
pharos-safe-multisig     ──────────────────────────────── no deps
pharos-agent-wallet      ──────────────────────────────── no deps
pharos-x402-payments     ──→ pharos-agent-wallet
```

| Skill | What it does |
|-------|-------------|
| `pharos-contract-verify` | Verify any deployed Solidity contract on Pharos via Blockscout. Handles constructor args, compiler flags, indexer retry. |
| `pharos-deploy-kit` | Deploy via `forge script` or deterministic CREATE2/CREATE3 for same-address-across-networks. Dry-run gate before any broadcast. |
| `pharos-token-factory` | Deploy ERC20/ERC721/ERC1155 tokens using audited OZ contracts. Mint, burn, pause, transfer ownership. Guardrails against dangerous combos. |
| `pharos-safe-multisig` | Deploy and manage Gnosis Safe v1.3.0 multisigs. Treasury management, owner changes, contract ownership transfer to Safe. |
| `pharos-agent-wallet` | Autonomous wallet safety layer. Balance preflight, gas estimation, nonce management, per-session spend caps, recipient allowlists, simulate-then-send. |
| `pharos-x402-payments` | Full x402 HTTP micropayment stack. Monetize endpoints (Express server) and pay autonomously (client). Spend caps and idempotency built in. |

---

## Install

```bash
npx pharos-skills add <skill>
```

The CLI will prompt you to pick your editor(s) and install scope (local or global). Use arrow keys to move, space to select/deselect, and enter to confirm.

```bash
# Install a specific skill (+ its dependencies)
npx pharos-skills add pharos-token-factory

# Install all 6 skills at once
npx pharos-skills add-all

# Skip prompts (CI / non-interactive)
npx pharos-skills add pharos-token-factory --yes
npx pharos-skills add-all --yes

# Install into a specific directory
npx pharos-skills add pharos-token-factory --dir ./my-project

# See all skills
npx pharos-skills list

# Skill details + install order
npx pharos-skills info pharos-token-factory
```

### What gets installed

```
<target>/
├── SKILL.md               ← merged Capability Index (all installed skills)
└── .pharos/
    ├── shared/
    │   ├── assets/
    │   │   ├── networks.json          ← Pharos testnet + mainnet config
    │   │   ├── tokens.json            ← canonical token registry
    │   │   └── canonical-contracts.json
    │   └── references/
    │       └── _guardrails.md         ← shared pre-check protocol
    └── skills/
        ├── pharos-contract-verify/
        ├── pharos-deploy-kit/
        └── pharos-token-factory/
            ├── SKILL.md
            ├── skill.json
            └── references/
                ├── erc20.md
                ├── erc721.md
                └── erc1155.md
```

---

## Networks

| Network | Chain ID | RPC | Explorer |
|---------|---------|-----|----------|
| Atlantic Testnet (default) | `688689` | `https://atlantic.dplabs-internal.com` | `https://atlantic.pharosscan.xyz` |
| Pacific Mainnet | `1672` | `https://rpc.pharos.xyz` | `https://www.pharosscan.xyz` |

Every skill defaults to **Atlantic Testnet**. Any mainnet write requires explicit "This is a MAINNET transaction with real value" confirmation.

---

## Guardrail Philosophy

Every skill bakes in five non-negotiable safeguards:

1. **Foundry pre-check** — `which cast && which forge` before any command; install hint if missing.
2. **Explicit private key** — always `--private-key $PRIVATE_KEY`; Foundry doesn't auto-read env. Never hardcode, log, or echo keys.
3. **4-step Write Pre-Check** — (a) derive sender, (b) confirm network chain ID, (c) balance covers value + gas, (d) simulate before send. Cannot be skipped.
4. **Testnet default + mainnet gate** — all skills default to testnet; mainnet requires explicit confirmation.
5. **Explorer link on every tx** — `<explorer>/tx/<hash>` and `<explorer>/address/<addr>` always output.

---

## How an Agent Uses These Skills

1. Agent reads `SKILL.md` → scans Capability Index for matching user intent
2. Opens the linked reference file (e.g., `pharos-token-factory/references/erc20.md#deploy`)
3. Follows the **Agent Guidelines** checklist at the bottom of each section
4. Runs Write Operation Pre-Checks from `_guardrails.md`
5. Executes exact `cast`/`forge` commands from the template
6. Outputs explorer links + records in local ledger

---

## Development

```bash
# Build CLI
npm install && npm run build

# Run CLI tests (vitest — 22 tests)
npm run test

# Compile Solidity contracts (forge build)
cd contracts && forge build

# Run Solidity tests (forge test — 15 tests)
cd contracts && forge test

# Run demo install
npx pharos-skills add pharos-token-factory --dir ./demo
```

---

## Contracts

All Solidity contracts are in `contracts/src/`. Compiled with `solc 0.8.24` + `via-ir` + optimizer 200 runs.

| Contract | Description |
|----------|-------------|
| `StandardERC20.sol` | ERC20 + Burnable + Pausable + Capped + Ownable |
| `StandardERC721.sol` | ERC721 + URIStorage + Pausable + Ownable |
| `StandardERC1155.sol` | ERC1155 + Pausable + Supply + Ownable |
| `SpendLimitGuard.sol` | Gnosis Safe Guard — per-period spend cap module |

---

## License

MIT
