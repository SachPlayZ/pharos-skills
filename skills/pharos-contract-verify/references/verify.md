# Verification Reference

> Read `shared/assets/networks.json` for RPC, chainId, verifierUrl before any command.

## no-constructor-args

### Command Template

```bash
# Step 1: Wait for indexer
sleep 10

# Step 2: Verify
forge verify-contract <CONTRACT_ADDR> src/<PATH>:<CONTRACT_NAME> \
  --chain-id 688689 \
  --verifier-url https://api.socialscan.io/pharos-atlantic-testnet/v1/explorer/command_api/contract \
  --verifier blockscout \
  --compiler-version 0.8.35 \
  --optimizer-runs 200 \
  --watch
```

### Parameters

| Parameter | Value | Source |
|-----------|-------|--------|
| `CONTRACT_ADDR` | Deployed address | Deployment output |
| `src/<PATH>:<CONTRACT_NAME>` | e.g., `src/StandardERC20.sol:StandardERC20` | Your source file |
| `--chain-id` | `688689` (testnet) / `1672` (mainnet) | `networks.json` |
| `--verifier-url` | From `networks.json → verifierUrl` | networks.json |
| `--compiler-version` | Must match deploy compiler exactly | `foundry.toml` |
| `--optimizer-runs` | Must match deploy config exactly | `foundry.toml` |
| `--watch` | Poll until result | — |

### Output Parsing

Success:
```
Contract successfully verified
```
Check explorer: `https://atlantic.pharosscan.xyz/address/<CONTRACT_ADDR>?tab=contract`

### Error Handling

See [#error-handling](#error-handling).

> **Agent Guidelines:**
> 1. Read `networks.json` for correct chain ID and verifier URL.
> 2. Check `foundry.toml` for exact compiler version and optimizer settings.
> 3. `sleep 10` before attempting — indexer needs time after deploy.
> 4. Use `--watch` to poll until confirmed.
> 5. Output explorer link after success.

---

## with-constructor-args

### Command Template

```bash
# Step 1: Encode constructor args
ENCODED=$(cast abi-encode "constructor(<ARG_TYPES>)" <ARG_VALUES>)

# Step 2: Wait for indexer
sleep 10

# Step 3: Verify with encoded args
forge verify-contract <CONTRACT_ADDR> src/<PATH>:<CONTRACT_NAME> \
  --chain-id 688689 \
  --verifier-url https://api.socialscan.io/pharos-atlantic-testnet/v1/explorer/command_api/contract \
  --verifier blockscout \
  --compiler-version 0.8.35 \
  --optimizer-runs 200 \
  --constructor-args $ENCODED \
  --watch
```

### Parameters

| Parameter | Example | Notes |
|-----------|---------|-------|
| `ARG_TYPES` | `string,string,uint8,uint256,uint256,address` | Match constructor signature exactly |
| `ARG_VALUES` | `"<name>" "<symbol>" 18 <supply> 0 <ownerAddr>` | Space-separated, strings quoted; match your deploy values exactly |
| `ENCODED` | `0x000000...` | Output of `cast abi-encode` |

### encode-constructor-args

```bash
# ERC20 (StandardERC20): name, symbol, decimals, initialSupply, cap, owner
# Replace values with what you passed at deploy time
cast abi-encode \
  "constructor(string,string,uint8,uint256,uint256,address)" \
  "$TOKEN_NAME" "$TOKEN_SYMBOL" $TOKEN_DECIMALS $TOKEN_SUPPLY $TOKEN_CAP $DEPLOYER_ADDR

# ERC721 (StandardERC721): name, symbol, baseURI, owner
cast abi-encode \
  "constructor(string,string,string,address)" \
  "$NFT_NAME" "$NFT_SYMBOL" "$NFT_BASE_URI" $DEPLOYER_ADDR

# ERC1155 (StandardERC1155): name, symbol, uri, owner
cast abi-encode \
  "constructor(string,string,string,address)" \
  "$MULTI_NAME" "$MULTI_SYMBOL" "$MULTI_URI" $DEPLOYER_ADDR
```

### Output Parsing

```
0x0000000000000000000000000000000000000000000000000000000000000080...
```
Paste this hex as `--constructor-args` value.

### Error Handling

See [#error-handling](#error-handling).

> **Agent Guidelines:**
> 1. Complete Write Operation Pre-checks (see SKILL.md / _guardrails.md).
> 2. Get exact constructor arg types from contract source — must match signature byte for byte.
> 3. Encode args FIRST, verify encode output is non-empty before proceeding.
> 4. `sleep 10` before verify call.
> 5. On "constructor arguments mismatch" → re-check types and values.

---

## already-verified

### Status Check

```bash
# Check via cast
cast etherscan-source <CONTRACT_ADDR> --chain 688689 2>&1 | head -5
```

Or open: `https://atlantic.pharosscan.xyz/address/<CONTRACT_ADDR>?tab=contract`

Look for "Contract Source Code Verified" badge.

### Command Template

If already verified and you need to re-verify (e.g., new version or different compiler):
```bash
forge verify-contract <CONTRACT_ADDR> src/<PATH>:<CONTRACT_NAME> \
  --chain-id 688689 \
  --verifier-url https://api.socialscan.io/pharos-atlantic-testnet/v1/explorer/command_api/contract \
  --verifier blockscout \
  --compiler-version 0.8.35 \
  --optimizer-runs 200 \
  --watch
# Blockscout will accept re-verification if source matches
```

### Output Parsing

```
Contract source code already verified
```
This is not an error — skip and output the explorer link.

> **Agent Guidelines:**
> 1. If status shows "already verified", report success and output explorer link. Do not re-verify unless user requests.

---

## retry-logic

### Command Template

```bash
# Retry loop: up to 5 attempts with 15s delay
for i in 1 2 3 4 5; do
  echo "Attempt $i..."
  forge verify-contract <CONTRACT_ADDR> src/<PATH>:<CONTRACT_NAME> \
    --chain-id 688689 \
    --verifier-url https://api.socialscan.io/pharos-atlantic-testnet/v1/explorer/command_api/contract \
    --verifier blockscout \
    --compiler-version 0.8.35 \
    --optimizer-runs 200 \
    --watch && break
  echo "Not indexed yet. Waiting 15s..."
  sleep 15
done
```

> **Agent Guidelines:**
> 1. Use retry loop when first attempt fails with "contract not found".
> 2. Indexer can take up to 60s after deploy — 5 retries × 15s covers this.
> 3. Stop retrying after "verification failed (source mismatch)" — that's a config issue, not a timing issue.

---

## status-check

### Command Template

```bash
# Check verification status
curl -s "https://api.socialscan.io/pharos-atlantic-testnet/v1/explorer/command_api/contract?module=contract&action=getsourcecode&address=<CONTRACT_ADDR>" \
  | jq '.result[0].SourceCode | length > 0'
```

Returns `true` if verified, `false` if not.

---

## error-handling

| Error | Cause | Fix |
|-------|-------|-----|
| `contract not found` | Indexer not yet synced | `sleep 10` then retry (see retry-logic) |
| `verification failed (source mismatch)` | Compiler version, optimizer, or source differs from on-chain bytecode | Match `--compiler-version` and `--optimizer-runs` exactly to `foundry.toml`; check for missing `via-ir` flag |
| `constructor arguments mismatch` | Encoded args don't match on-chain init code | Re-encode with `cast abi-encode`; check type order matches constructor signature exactly |
| `already verified` | Contract source already on explorer | Not an error — output explorer link and stop |
| `rate limit exceeded` | >500 requests / 5min | Wait 5 minutes, retry |
| `invalid chain id` | Wrong `--chain-id` flag | Read from `networks.json`, use `688689` (testnet) or `1672` (mainnet) |
| `Compiler version not found` | Specified version not available on verifier | Check available versions; try `solc` minor version (e.g., `0.8.35`) |
