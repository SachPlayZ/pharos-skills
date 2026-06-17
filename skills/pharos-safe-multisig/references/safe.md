# Gnosis Safe Reference

> Read `shared/assets/canonical-contracts.json` for factory addresses.
> Read `shared/assets/networks.json` for RPC/chainId/explorer.

Canonical addresses (both networks):
- GnosisSafe singleton: `0x69f4D1788e39c87893C980c06EdF4b7f686e2938`
- ProxyFactory: deploy Safe proxy via `GnosisSafeProxyFactory.createProxyWithNonce(singleton, initializer, saltNonce)`
- MultiSend: `0x998739BFdAAdde7C933B942a68053933098f9EDa`
- MultiSendCallOnly: `0xA1dabEF33b3B82c7814B6D82A79e50F4AC44102B`

## deploy-safe

### Command Template

```bash
# Write Operation Pre-Checks (mandatory — see _guardrails.md)
DEPLOYER=$(cast wallet address --private-key $PRIVATE_KEY)

# Safe parameters
OWNERS="[0xOWNER1,0xOWNER2,0xOWNER3]"
THRESHOLD=2
SAFE_SINGLETON="0x69f4D1788e39c87893C980c06EdF4b7f686e2938"

# Encode Safe initializer (setup call)
INITIALIZER=$(cast abi-encode \
  "setup(address[],uint256,address,bytes,address,address,uint256,address)" \
  "$OWNERS" $THRESHOLD \
  "0x0000000000000000000000000000000000000000" "0x" \
  "0x0000000000000000000000000000000000000000" \
  "0x0000000000000000000000000000000000000000" \
  0 \
  "0x0000000000000000000000000000000000000000")

# Deploy via Safe Proxy Factory
# The canonical factory is GnosisSafeProxyFactory — deploy via forge script or cast
# Recommended: use forge script for proper event parsing to extract proxy address

forge script contracts/script/DeploySafe.s.sol \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  -vvvv
```

### Inline via cast (simplified)

```bash
# GnosisSafeProxyFactory ABI: createProxyWithNonce(address _singleton, bytes initializer, uint256 saltNonce)
SALT_NONCE=$(date +%s)
FACTORY="0xC22834581EbC8527d974F8a1c97E1bEA4EF910BC"  # standard Safe factory

cast send $FACTORY \
  "createProxyWithNonce(address,bytes,uint256)" \
  $SAFE_SINGLETON \
  $INITIALIZER \
  $SALT_NONCE \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY
```

Parse deployed Safe address from `ProxyCreation` event in tx receipt.

### Parameters

| Param | Description | Constraint |
|-------|-------------|------------|
| `OWNERS` | Array of owner addresses | ≥ 1 owner, no zero address |
| `THRESHOLD` | Required signatures | 1 ≤ threshold ≤ len(owners) |
| `SALT_NONCE` | Unique nonce for deterministic address | Any uint256 |

### Output Parsing

```
transactionHash: 0xTXHASH
```
Parse `ProxyCreation(address proxy, address singleton)` from logs:
```bash
cast receipt $TX_HASH --rpc-url $RPC_URL --json | jq '.logs[] | select(.topics[0] == "0x4f51faf6c4561ff95f067657e43439f0f856d97c04d9ec9070a6199ad418e235") | .topics[1]'
```

Output explorer link: `https://atlantic.pharosscan.xyz/address/<SAFE_ADDR>`

> **Agent Guidelines:**
> 1. Complete Write Operation Pre-checks (see _guardrails.md).
> 2. WARN if threshold = 1: "1-of-N provides no multisig protection."
> 3. Confirm owner list and threshold before broadcasting.
> 4. Parse Safe address from ProxyCreation event after deploy.

---

## propose-tx

Safe transactions must be signed off-chain and submitted on-chain.

### Command Template

```bash
# Encode the inner transaction data
TX_DATA=$(cast calldata "transfer(address,uint256)" $RECIPIENT $AMOUNT)

# Build Safe transaction hash (EIP-712)
SAFE_TX_HASH=$(cast call $SAFE_ADDR \
  "getTransactionHash(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,uint256)" \
  $TO $VALUE "$TX_DATA" 0 0 0 0 \
  "0x0000000000000000000000000000000000000000" \
  "0x0000000000000000000000000000000000000000" \
  $(cast call $SAFE_ADDR "nonce()" --rpc-url $RPC_URL) \
  --rpc-url $RPC_URL)

# Sign with owner key
SIG=$(cast sign --private-key $OWNER1_PRIVATE_KEY $SAFE_TX_HASH)

echo "Transaction hash: $SAFE_TX_HASH"
echo "Signature: $SIG"
# Collect signatures from other owners off-chain, then execute
```

> **Agent Guidelines:**
> 1. Never collect all private keys in one place — owners sign independently.
> 2. Use Safe Transaction Service API or Safe UI for multi-owner coordination in production.

---

## execute-tx

### Command Template

```bash
# Combine signatures (sorted by owner address ascending)
# SIGNATURES = sig1 ++ sig2 ++ ... (concatenated hex)

# Confirm before execution
echo "About to execute Safe tx moving $VALUE wei to $TO — confirm? (type CONFIRM)"

cast send $SAFE_ADDR \
  "execTransaction(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,bytes)" \
  $TO $VALUE "$TX_DATA" 0 0 0 0 \
  "0x0000000000000000000000000000000000000000" \
  "0x0000000000000000000000000000000000000000" \
  "$SIGNATURES" \
  --rpc-url $RPC_URL \
  --private-key $EXECUTOR_PRIVATE_KEY
```

### Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| `GS020` | Signature validation failed | Check signature order (must be sorted by signer addr ascending) |
| `GS013` | Only owner can reject | Executor must be owner |
| `GS025` | nonce too high | Read current nonce: `cast call $SAFE "nonce()" --rpc-url $RPC_URL` |
| `GS026` | Internal tx failed | Check inner tx calldata; simulate inner call first |

> **Agent Guidelines:**
> 1. Complete Write Operation Pre-checks (see _guardrails.md).
> 2. State "About to execute Safe transaction moving real value" and wait for CONFIRM.
> 3. Simulate inner call before executing.

---

## add-owner

### Command Template

```bash
# addOwnerWithThreshold(address owner, uint256 _threshold)
TX_DATA=$(cast calldata "addOwnerWithThreshold(address,uint256)" $NEW_OWNER $NEW_THRESHOLD)

# Execute as Safe internal tx (requires threshold signatures)
# ... see execute-tx for full flow with signatures
```

---

## remove-owner

### Command Template

```bash
# Must pass prevOwner (linked list predecessor in Safe owner array)
# Get owner list first:
cast call $SAFE_ADDR "getOwners()" --rpc-url $RPC_URL

# removeOwner(address prevOwner, address owner, uint256 _threshold)
TX_DATA=$(cast calldata "removeOwner(address,address,uint256)" $PREV_OWNER $OWNER_TO_REMOVE $NEW_THRESHOLD)
```

### Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| `GS201` | Wrong prevOwner (linked list) | Use `getOwners()` to find correct predecessor |
| `GS202` | Can't reduce owners below threshold | Lower threshold first |

---

## change-threshold

### Command Template

```bash
TX_DATA=$(cast calldata "changeThreshold(uint256)" $NEW_THRESHOLD)
# Execute as Safe internal tx — see execute-tx
```

---

## transfer-ownership

Transfer an Ownable contract's ownership to a Safe. The Safe then controls the contract.

### Command Template

```bash
# Step 1: Verify the Safe exists and has correct owners
cast call $SAFE_ADDR "getOwners()" --rpc-url $RPC_URL
cast call $SAFE_ADDR "getThreshold()" --rpc-url $RPC_URL | cast to-dec

# Step 2: Confirm with user
echo "Transferring ownership of $CONTRACT_ADDR to Safe $SAFE_ADDR"
echo "After this, only $THRESHOLD_COUNT of $(getOwners count) owners can control the contract."
echo "Type CONFIRM to proceed."

# Step 3: Dry-run
cast call $CONTRACT_ADDR \
  "transferOwnership(address)" $SAFE_ADDR \
  --from $(cast wallet address --private-key $PRIVATE_KEY) \
  --rpc-url $RPC_URL

# Step 4: Send
cast send $CONTRACT_ADDR \
  "transferOwnership(address)" $SAFE_ADDR \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY

# Step 5: Confirm
cast call $CONTRACT_ADDR "owner()" --rpc-url $RPC_URL
```

### Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| `OwnableUnauthorizedAccount` | Caller not current owner | Use current owner's private key |
| `OwnableInvalidOwner(0x0)` | Safe address is zero | Verify Safe deployed correctly first |

> **Agent Guidelines:**
> 1. ALWAYS verify Safe address is real (getOwners returns non-empty) before transferring.
> 2. State the impact: "After transfer, you need $THRESHOLD of $OWNER_COUNT owners to control this contract."
> 3. Require CONFIRM from user before sending.
> 4. Confirm new owner after tx.

---

## read-ops

```bash
# Get all owners
cast call $SAFE_ADDR "getOwners()" --rpc-url $RPC_URL

# Threshold
cast call $SAFE_ADDR "getThreshold()" --rpc-url $RPC_URL | cast to-dec

# Nonce
cast call $SAFE_ADDR "nonce()" --rpc-url $RPC_URL | cast to-dec

# ETH balance
cast balance $SAFE_ADDR --rpc-url $RPC_URL --ether

# ERC20 balance in Safe
cast call $TOKEN_ADDR "balanceOf(address)" $SAFE_ADDR --rpc-url $RPC_URL | cast to-dec

# Is owner?
cast call $SAFE_ADDR "isOwner(address)" $CHECK_ADDR --rpc-url $RPC_URL
```
