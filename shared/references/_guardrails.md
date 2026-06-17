# Pharos Skill Guardrails (shared)

> This file is included by every Pharos Skill. Do not skip any step.

## Foundry Pre-Check

Before ANY cast or forge command:

```bash
which cast || (echo "Foundry not found. Install: curl -L https://foundry.paradigm.xyz | bash && foundryup" && exit 1)
which forge || (echo "Foundry not found. Install: curl -L https://foundry.paradigm.xyz | bash && foundryup" && exit 1)
```

## Network Configuration

All network values come from `shared/assets/networks.json`. Never hardcode RPC URLs, chain IDs, or verifier URLs.

- **Default**: Atlantic Testnet, chainId `688689`
- **Mainnet gate**: Any write to chainId `1672` requires the agent to first state: *"This is a MAINNET transaction with real value on Pacific Mainnet (chainId 1672)."* Then explicitly ask user to confirm before proceeding.

## Private Key Rules

- ALWAYS pass key as `--private-key $PRIVATE_KEY`
- Foundry does NOT auto-read env vars — explicit flag required every time
- NEVER hardcode, echo, log, or commit a key
- NEVER paste a raw key into any shared command or message
- Key source: env var or a gitignored file only

## Write Operation Pre-Check Sequence

Run ALL 4 steps before any transaction. Non-negotiable.

### Step 1 — Derive sender address
```bash
cast wallet address --private-key $PRIVATE_KEY
```
Confirm this is the intended sender. If wrong key, stop.

### Step 2 — Confirm network
```bash
# Read from shared/assets/networks.json
CHAIN_ID=$(cat shared/assets/networks.json | jq -r '.testnet.chainId')
cast chain-id --rpc-url $RPC_URL
```
Both must match. If mismatch, stop.

### Step 3 — Check balance covers value + gas
```bash
ADDR=$(cast wallet address --private-key $PRIVATE_KEY)
cast balance $ADDR --rpc-url $RPC_URL --ether
cast gas-price --rpc-url $RPC_URL
cast estimate --rpc-url $RPC_URL <tx_params>
```
Balance must cover (value + estimated_gas * gas_price). If not, stop and report shortfall.

### Step 4 — Simulate before send
```bash
# Dry-run / simulate
cast call --rpc-url $RPC_URL <to> <calldata>
# or for forge scripts:
forge script <Script> --rpc-url $RPC_URL  # no --broadcast
```
Only proceed to broadcast if simulation succeeds.

## Explorer Links

On EVERY transaction and deployed address, output:
- `<explorer>/tx/<hash>`
- `<explorer>/address/<addr>`

Where `<explorer>` = value from `networks.json` for the active network.

## No Infinite Approvals

Default token approvals to exact spend amounts. Never approve `type(uint256).max` unless user explicitly requests and understands the risk.

## Security Reminders

- Spend caps are enforced per-session via `pharos-agent-wallet` skill
- Recipient allowlist mode available in `pharos-agent-wallet`
- Ownership of deployed contracts should be transferred to a Safe — see `pharos-safe-multisig`
- Never send private keys to any external service, LLM, or API endpoint
