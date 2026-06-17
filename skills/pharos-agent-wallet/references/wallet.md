# Agent Wallet Reference

> Read `shared/assets/networks.json` for RPC/chainId/explorer.
> Ledger: `.pharos/spend-ledger.json` | Allowlist: `.pharos/allowlist.json`

## write-pre-checks

Canonical 4-step sequence. Run ALL steps before ANY transaction.

### Step 1 — Derive sender address
```bash
SENDER=$(cast wallet address --private-key $PRIVATE_KEY)
echo "Sender: $SENDER"
# Confirm this is the intended address. If wrong, stop here.
```

### Step 2 — Confirm network
```bash
RPC_URL=$(cat shared/assets/networks.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['testnet']['rpc'])")
EXPECTED_CHAIN=$(cat shared/assets/networks.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['testnet']['chainId'])")
ACTUAL_CHAIN=$(cast chain-id --rpc-url $RPC_URL)
[ "$ACTUAL_CHAIN" = "$EXPECTED_CHAIN" ] || { echo "CHAIN MISMATCH: expected $EXPECTED_CHAIN, got $ACTUAL_CHAIN. STOP."; exit 1; }
```

### Step 3 — Check balance covers value + gas
```bash
BALANCE=$(cast balance $SENDER --rpc-url $RPC_URL --ether)
GAS_PRICE=$(cast gas-price --rpc-url $RPC_URL)
GAS_EST=$(cast estimate --rpc-url $RPC_URL $TO $CALLDATA)
GAS_COST=$(python3 -c "print(int('$GAS_EST') * int('$GAS_PRICE') / 1e18)")
echo "Balance: $BALANCE ETH | Gas cost: ~$GAS_COST ETH"
# Manually verify balance > value + gas cost
```

### Step 4 — Simulate
```bash
cast call $TO "$CALLDATA" --from $SENDER --rpc-url $RPC_URL
# or for forge: forge script --rpc-url $RPC_URL (no --broadcast)
```

All 4 steps must pass before proceeding.

---

## balance-preflight

### Command Template

```bash
SENDER=$(cast wallet address --private-key $PRIVATE_KEY)
echo "Address: $SENDER"

# Native balance
cast balance $SENDER --rpc-url $RPC_URL --ether

# ERC20 balance
cast call $TOKEN_ADDR "balanceOf(address)" $SENDER --rpc-url $RPC_URL | cast to-dec
```

### Output Parsing

```
0.5 ETH
```
Compare against required value + estimated gas cost.

> **Agent Guidelines:**
> 1. Always run balance check before any tx.
> 2. Estimate gas first, add 20% buffer for safety.
> 3. If insufficient: halt and report exact shortfall.

---

## gas-estimation

### Command Template

```bash
# Estimate gas for a call
cast estimate \
  --rpc-url $RPC_URL \
  --from $SENDER \
  $CONTRACT_ADDR \
  "functionName(type1,type2)" \
  $ARG1 $ARG2

# Get current gas price
GAS_PRICE=$(cast gas-price --rpc-url $RPC_URL)
echo "Gas price: $GAS_PRICE wei"

# Compute total cost in ETH
python3 -c "print(f'Estimated cost: {int(\"$GAS_EST\") * int(\"$GAS_PRICE\") / 1e18:.8f} ETH')"
```

### Parameters

| Param | Description |
|-------|-------------|
| `CONTRACT_ADDR` | Target contract or EOA |
| Function sig | Exact signature string (e.g., `"transfer(address,uint256)"`) |
| Args | Space-separated values matching sig |

### Output Parsing

```
84123  # gas units
```

---

## nonce-management

### Command Template

```bash
# Get current nonce
NONCE=$(cast nonce $SENDER --rpc-url $RPC_URL)
echo "Current nonce: $NONCE"

# Send with explicit nonce (prevents conflicts)
cast send $TO "$CALLDATA" \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --nonce $NONCE

# Cancel stuck tx: send 0 ETH to self with same nonce + higher gas
cast send $SENDER "" \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --nonce $STUCK_NONCE \
  --gas-price $(python3 -c "print(int($(cast gas-price --rpc-url $RPC_URL)) * 2)")
```

### Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| `nonce too low` | Stale nonce | Re-read nonce with `cast nonce` |
| `replacement transaction underpriced` | Resubmit same nonce, gas too low | Double gas price of stuck tx |
| `already known` | Identical tx in mempool | Wait or cancel with higher gas |
| `nonce too high` | Pending txs in queue | Wait for pending txs to confirm |

---

## spend-cap

Enforces per-session cumulative spend limit. Agent REFUSES sends exceeding the cap.

### Setup

```bash
# Initialize ledger for session
mkdir -p .pharos
cat > .pharos/spend-ledger.json <<'EOF'
{
  "sessionCap": "1000000000000000000",
  "sessionSpent": "0",
  "currency": "native",
  "network": "testnet",
  "transactions": []
}
EOF
```

### Check + Update Ledger

```bash
# Before every send: check remaining budget
python3 - <<'PYEOF'
import json
with open(".pharos/spend-ledger.json") as f:
    ledger = json.load(f)
cap = int(ledger["sessionCap"])
spent = int(ledger["sessionSpent"])
remaining = cap - spent
tx_value = int("$TX_VALUE_WEI")
if tx_value > remaining:
    print(f"SPEND CAP EXCEEDED: want {tx_value} wei, remaining {remaining} wei. STOP.")
    exit(1)
print(f"Budget OK: spending {tx_value} wei, remaining after: {remaining - tx_value} wei")
PYEOF

# After successful send: update ledger
python3 - <<'PYEOF'
import json
with open(".pharos/spend-ledger.json") as f:
    ledger = json.load(f)
ledger["sessionSpent"] = str(int(ledger["sessionSpent"]) + int("$TX_VALUE_WEI"))
ledger["transactions"].append({"txHash": "$TX_HASH", "value": "$TX_VALUE_WEI", "to": "$TO"})
with open(".pharos/spend-ledger.json", "w") as f:
    json.dump(ledger, f, indent=2)
PYEOF
```

### Parameters

| Field | Description |
|-------|-------------|
| `sessionCap` | Max cumulative spend in wei for this session |
| `sessionSpent` | Running total spent this session |
| `currency` | `"native"` or ERC20 token address |

> **Agent Guidelines:**
> 1. Check ledger BEFORE every send.
> 2. REFUSE and halt if tx would exceed cap.
> 3. Update ledger AFTER confirmed tx.
> 4. Never modify sessionCap without user instruction.

---

## allowlist

Controls which recipient addresses the agent is permitted to send to.

### Setup

```bash
cat > .pharos/allowlist.json <<'EOF'
{
  "mode": "off",
  "allowedAddresses": [],
  "deniedAddresses": []
}
EOF
```

### Enable Allowlist Mode

```bash
python3 - <<'PYEOF'
import json
with open(".pharos/allowlist.json") as f:
    al = json.load(f)
al["mode"] = "allowlist"
al["allowedAddresses"].append("0xRECIPIENT_ADDR")
with open(".pharos/allowlist.json", "w") as f:
    json.dump(al, f, indent=2)
PYEOF
```

### Check Before Every Send

```bash
python3 - <<'PYEOF'
import json
with open(".pharos/allowlist.json") as f:
    al = json.load(f)
to = "$RECIPIENT_ADDR".lower()
mode = al["mode"]
if mode == "allowlist":
    allowed = [a.lower() for a in al["allowedAddresses"]]
    if to not in allowed:
        print(f"ALLOWLIST BLOCK: {to} not in allowlist. STOP.")
        exit(1)
elif mode == "denylist":
    denied = [a.lower() for a in al["deniedAddresses"]]
    if to in denied:
        print(f"DENYLIST BLOCK: {to} is denied. STOP.")
        exit(1)
print("Allowlist check passed.")
PYEOF
```

---

## simulate-then-send

### Command Template

```bash
# Step 1: Simulate (read-only)
cast call $TO \
  "$FUNCTION_SIG" \
  $ARGS \
  --from $SENDER \
  --rpc-url $RPC_URL

# If simulation succeeds:
# Step 2: Send
cast send $TO \
  "$FUNCTION_SIG" \
  $ARGS \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY
```

> **Agent Guidelines:**
> 1. ALWAYS simulate before send.
> 2. If simulation reverts — stop, report error, do NOT broadcast.
> 3. Simulation success does not guarantee send success (state can change), but catches most errors.

---

## send-native

### Command Template

```bash
# Write Operation Pre-Checks (all 4 steps — see write-pre-checks)
# Spend cap check
# Allowlist check
# Simulate
cast call $RECIPIENT "" --from $SENDER --value $VALUE_WEI --rpc-url $RPC_URL
# Send
cast send $RECIPIENT \
  --value $VALUE_WEI \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY
```

Output: `https://atlantic.pharosscan.xyz/tx/<TXHASH>`

---

## send-erc20

### Command Template

```bash
# Write Operation Pre-Checks + spend cap + allowlist (above)

# Approve exact amount only (no infinite approval)
cast send $TOKEN_ADDR \
  "approve(address,uint256)" $SPENDER $EXACT_AMOUNT \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY

# Transfer
cast send $TOKEN_ADDR \
  "transfer(address,uint256)" $RECIPIENT $AMOUNT \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY
```

### Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| `ERC20InsufficientBalance` | Insufficient token balance | Check balance first |
| `ERC20InsufficientAllowance` | Spender allowance too low | Re-approve correct amount |
| `spend cap exceeded` | Agent-wallet ledger block | Agent halts — user must increase cap |
| `allowlist block` | Recipient not allowed | Add address to allowlist or disable mode |
