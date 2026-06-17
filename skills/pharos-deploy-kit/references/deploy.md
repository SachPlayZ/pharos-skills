# Standard Deploy Reference

> Read `shared/assets/networks.json` before any command. Complete Write Operation Pre-Checks first.

## dry-run

### Command Template

```bash
# Dry-run: no --broadcast flag
forge script script/Deploy.s.sol:<SCRIPT_NAME> \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  -vvvv
```

### Parameters

| Parameter | Value | Source |
|-----------|-------|--------|
| `SCRIPT_NAME` | e.g., `DeployERC20` | Your script contract name |
| `RPC_URL` | From `networks.json → rpc` | networks.json |
| `--private-key` | `$PRIVATE_KEY` (env only) | Export in shell, never hardcode |

### Output Parsing

Look for:
```
== Logs ==
Deployed at: 0x...
```
And simulated trace lines. No `Sending transactions` section = dry-run confirmed.

> **Agent Guidelines:**
> 1. Complete Write Operation Pre-checks (see _guardrails.md).
> 2. Run dry-run FIRST. Inspect trace output for errors.
> 3. Only proceed to standard-deploy if dry-run succeeds.

---

## standard-deploy

### Command Template

```bash
# Write Operation Pre-Checks (mandatory — see _guardrails.md)
ADDR=$(cast wallet address --private-key $PRIVATE_KEY)
echo "Deployer: $ADDR"
cast balance $ADDR --rpc-url $RPC_URL --ether
cast gas-price --rpc-url $RPC_URL

# Dry-run first (no --broadcast)
forge script script/Deploy.s.sol:<SCRIPT_NAME> \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  -vvvv

# Broadcast
forge script script/Deploy.s.sol:<SCRIPT_NAME> \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  -vvvv
```

### Parameters

| Parameter | Value | Notes |
|-----------|-------|-------|
| `SCRIPT_NAME` | Contract name in script file | Must match `contract <SCRIPT_NAME> is Script` |
| `--broadcast` | Send txs to network | Add ONLY after dry-run succeeds |
| `--legacy` | Use legacy tx type | **Required on Pharos** — testnet rejects EIP-1559 (`TX_PRIORITY_FEE_ABOVE_MAX_FEE`) |
| `--with-gas-price 7000000000` | Set gas price (7 gwei) | Pharos testnet: lower than default 10 gwei avoids OOG on small balances |

### Output Parsing

```
== Logs ==
Deployed at: 0xADDRESS...

## Setting up 1 EVM.
[...]
✅ [Success] Hash: 0xTXHASH...

Transactions saved to: broadcast/Deploy.s.sol/688689/run-latest.json
```

Extract:
- Deployed address from logs
- Tx hash from broadcast output
- Output explorer links:
  - `https://atlantic.pharosscan.xyz/tx/<TXHASH>`
  - `https://atlantic.pharosscan.xyz/address/<DEPLOYED_ADDR>`

> **Agent Guidelines:**
> 1. Complete Write Operation Pre-checks (see _guardrails.md).
> 2. Dry-run without `--broadcast` first — inspect output.
> 3. Add `--broadcast` only after dry-run passes.
> 4. Output both explorer links after deploy.
> 5. Record deployed address in `.pharos/deployed.json`.
> 6. Hand off to `pharos-contract-verify` for source code verification.

---

## constructor-args

### Command Template

```bash
# Set env vars read by the deploy script — replace with your values
export TOKEN_NAME="<your-token-name>"           # e.g. "Acme Token"
export TOKEN_SYMBOL="<YOUR_SYMBOL>"             # e.g. "ACM"
export TOKEN_DECIMALS=18
export TOKEN_SUPPLY=<initial-supply-in-wei>     # e.g. 1000000000000000000000000 for 1M × 10^18
export TOKEN_CAP=0                               # 0 = no cap

forge script script/Deploy.s.sol:DeployERC20 \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --legacy \
  -vvvv
```

### Parameters

| Env Var | Description | Notes |
|---------|-------------|-------|
| `TOKEN_NAME` | ERC20 full name | Non-empty string |
| `TOKEN_SYMBOL` | Trading symbol | ≤ 8 chars recommended |
| `TOKEN_DECIMALS` | Decimal places | 0–18 (contract enforces ≤ 18) |
| `TOKEN_SUPPLY` | Initial mint in smallest units | ≤ TOKEN_CAP when cap > 0 |
| `TOKEN_CAP` | Max supply (0 = uncapped) | ≥ TOKEN_SUPPLY when > 0 |

---

## error-handling

| Error | Cause | Fix |
|-------|-------|-----|
| `insufficient funds` | Balance < value + gas | Top up deployer or reduce initial supply |
| `nonce too low` | Pending tx exists | `cast nonce $ADDR --rpc-url $RPC_URL` then `--nonce <n>` |
| `execution reverted` | Constructor revert | Check constructor guards (e.g., cap < supply) |
| `replacement transaction underpriced` | Stuck tx in mempool | Resend with higher gas price: `--gas-price $(cast gas-price --rpc-url $RPC_URL)` |
| `script failed` | Forge script error | Run without `--broadcast`, check -vvvv trace |
| `missing env var` | `vm.envUint("PRIVATE_KEY")` fails | `export PRIVATE_KEY=0x...` in shell before running |
