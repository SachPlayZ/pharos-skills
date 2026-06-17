# ERC20 Token Reference

> Contract: `StandardERC20.sol` — OZ ERC20 + Burnable + Pausable + Capped + Ownable.
> Read `shared/assets/networks.json` for RPC/chainId/explorer.

## deploy

### Command Template

```bash
# Write Operation Pre-Checks (mandatory — see _guardrails.md)
DEPLOYER=$(cast wallet address --private-key $PRIVATE_KEY)

# Sanity checks
[ $TOKEN_DECIMALS -le 18 ] || { echo "ERROR: decimals > 18 not allowed"; exit 1; }
[ $TOKEN_CAP -eq 0 ] || [ $TOKEN_SUPPLY -le $TOKEN_CAP ] || { echo "ERROR: supply > cap"; exit 1; }

# Set env vars — replace with your token's values
export TOKEN_NAME="<your-token-name>"           # e.g. "Acme Token"
export TOKEN_SYMBOL="<YOUR_SYMBOL>"             # e.g. "ACM"
export TOKEN_DECIMALS=18                         # 0–18; 18 is standard ERC20
export TOKEN_SUPPLY=1000000000000000000000000   # initial mint in smallest units (example: 1M × 10^18)
export TOKEN_CAP=0                               # 0 = no cap; else max supply in smallest units

# Dry-run first
forge script contracts/script/Deploy.s.sol:DeployERC20 \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  -vvvv

# Broadcast
forge script contracts/script/Deploy.s.sol:DeployERC20 \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  -vvvv
```

### Parameters

| Param | Description | Constraints |
|-------|-------------|-------------|
| `TOKEN_NAME` | Full token name | Non-empty string |
| `TOKEN_SYMBOL` | Trading symbol | Non-empty, ≤ 8 chars recommended |
| `TOKEN_DECIMALS` | Decimal places | 0–18 (contract enforces ≤ 18) |
| `TOKEN_SUPPLY` | Initial mint amount (smallest units) | ≤ TOKEN_CAP if cap > 0 |
| `TOKEN_CAP` | Max supply cap (0 = uncapped) | ≥ TOKEN_SUPPLY when > 0 |

### Output Parsing

```
Deployed at: 0xCONTRACT_ADDR
```
Output explorer links:
- `https://atlantic.pharosscan.xyz/tx/<TXHASH>`
- `https://atlantic.pharosscan.xyz/address/<DEPLOYED_ADDR>`

Then hand off to `pharos-contract-verify` with constructor args.

> **Agent Guidelines:**
> 1. Complete Write Operation Pre-checks (see _guardrails.md).
> 2. Validate decimals ≤ 18 and supply ≤ cap before running.
> 3. WARN if no cap + owner can mint: "Unlimited mint is enabled."
> 4. REFUSE renounced-owner + unlimited-mint combo without CONFIRM.
> 5. Recommend Safe ownership after deploy.
> 6. Verify contract after deploy.

---

## mint

### Command Template

```bash
# Write Operation Pre-Checks
OWNER=$(cast wallet address --private-key $PRIVATE_KEY)

# Check current supply vs cap
TOTAL=$(cast call $TOKEN_ADDR "totalSupply()" --rpc-url $RPC_URL | cast to-dec)
CAP=$(cast call $TOKEN_ADDR "cap()" --rpc-url $RPC_URL | cast to-dec)

# Dry-run
cast call $TOKEN_ADDR \
  "mint(address,uint256)" $RECIPIENT $AMOUNT \
  --from $OWNER \
  --rpc-url $RPC_URL

# Send
cast send $TOKEN_ADDR \
  "mint(address,uint256)" $RECIPIENT $AMOUNT \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY
```

### Parameters

| Param | Description |
|-------|-------------|
| `TOKEN_ADDR` | Deployed ERC20 address |
| `RECIPIENT` | Address to receive minted tokens |
| `AMOUNT` | Amount in smallest units (e.g., `1000000000000000000` = 1 token with 18 dec) |

### Output Parsing

```
blockHash: 0x...
transactionHash: 0xTXHASH
```
Confirm: `cast call $TOKEN_ADDR "balanceOf(address)" $RECIPIENT --rpc-url $RPC_URL`

### Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| `OwnableUnauthorizedAccount` | Caller not owner | Must call from owner address |
| `ERC20ExceededCap` | Mint would exceed cap | Reduce amount or increase cap first (if allowed) |
| `EnforcedPause` | Token is paused | Unpause first via `unpause()` |

> **Agent Guidelines:**
> 1. Complete Write Operation Pre-checks (see _guardrails.md).
> 2. Check total supply + cap before minting. Warn if amount brings supply near cap.
> 3. Dry-run via `cast call` before `cast send`.

---

## burn

### Command Template

```bash
# Caller burns own tokens
cast send $TOKEN_ADDR \
  "burn(uint256)" $AMOUNT \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY

# Or: burnFrom (requires allowance from holder)
cast send $TOKEN_ADDR \
  "burnFrom(address,uint256)" $HOLDER $AMOUNT \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY
```

### Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| `ERC20InsufficientBalance` | Burn > balance | Check balance first |
| `ERC20InsufficientAllowance` | burnFrom without sufficient allowance | Call `approve` first |

---

## pause

### Command Template

```bash
# Pause — only owner
cast send $TOKEN_ADDR "pause()" \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY

# Unpause
cast send $TOKEN_ADDR "unpause()" \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY
```

### Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| `OwnableUnauthorizedAccount` | Not owner | Use owner key |
| `EnforcedPause` | Already paused (for pause call) | Already paused — unpause first |
| `ExpectedPause` | Already unpaused (for unpause call) | Already unpaused |

---

## transfer-ownership

### Command Template

```bash
# Transfer to new owner (e.g., a Gnosis Safe)
# RECOMMENDED: transfer to Safe — see pharos-safe-multisig skill

SAFE_ADDR="0xYOUR_SAFE_ADDRESS"

# Dry-run
cast call $TOKEN_ADDR \
  "transferOwnership(address)" $SAFE_ADDR \
  --from $(cast wallet address --private-key $PRIVATE_KEY) \
  --rpc-url $RPC_URL

# Send
cast send $TOKEN_ADDR \
  "transferOwnership(address)" $SAFE_ADDR \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY
```

### Output Parsing

Confirm: `cast call $TOKEN_ADDR "owner()" --rpc-url $RPC_URL`

### Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| `OwnableUnauthorizedAccount` | Caller not current owner | Use current owner key |
| `OwnableInvalidOwner(0x0)` | Transferring to zero address | Use a real address — zero address = unowned forever |

> **Agent Guidelines:**
> 1. WARN if new owner is `address(0)` — this permanently renounces ownership.
> 2. RECOMMEND using a Gnosis Safe as new owner (see pharos-safe-multisig).
> 3. Confirm new owner address before sending.

---

## read-ops

### Command Template

```bash
# Balance
cast call $TOKEN_ADDR "balanceOf(address)" $HOLDER --rpc-url $RPC_URL | cast to-dec

# Total supply
cast call $TOKEN_ADDR "totalSupply()" --rpc-url $RPC_URL | cast to-dec

# Cap (type(uint256).max if uncapped)
cast call $TOKEN_ADDR "cap()" --rpc-url $RPC_URL | cast to-dec

# Owner
cast call $TOKEN_ADDR "owner()" --rpc-url $RPC_URL

# Paused state
cast call $TOKEN_ADDR "paused()" --rpc-url $RPC_URL

# Name / symbol / decimals
cast call $TOKEN_ADDR "name()" --rpc-url $RPC_URL | cast --to-ascii
cast call $TOKEN_ADDR "symbol()" --rpc-url $RPC_URL | cast --to-ascii
cast call $TOKEN_ADDR "decimals()" --rpc-url $RPC_URL | cast to-dec
```
