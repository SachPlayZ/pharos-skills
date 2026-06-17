# Deterministic Deploy Reference (CREATE2 / CREATE3)

> Read `shared/assets/canonical-contracts.json` for factory addresses.
> Read `shared/assets/networks.json` for RPC and chain IDs.

## predict-address

### Command Template

```bash
# Predict CREATE2 address using Foundry's cast create2
# INIT_CODE_HASH: keccak256(creationBytecode ++ abi.encode(constructorArgs))

# Method 1: forge script simulation (recommended)
forge script script/PredictDeploy.s.sol --rpc-url $RPC_URL -vvvv
# Script calls: computeCreate2Address(salt, initCodeHash, deployer)

# Method 2: cast
INIT_CODE=$(forge inspect src/StandardERC20.sol:StandardERC20 bytecode)
# Append ABI-encoded constructor args manually
SALT="0x$(echo -n 'my-salt-v1' | xxd -p | tr -d '\n' | head -c 64)"
FACTORY="0x4e59b44847b379578588920ca78fbf26c0b4956c"  # Foundry DeterministicDeploymentProxy

cast create2 \
  --starts-with 0x \
  --deployer $FACTORY \
  --init-code $INIT_CODE
```

### Parameters

| Parameter | Value | Source |
|-----------|-------|--------|
| `FACTORY` | `0x4e59b44847b379578588920ca78fbf26c0b4956c` (testnet) | `canonical-contracts.json → FoundryDeterministicDeploymentProxy` |
| `SALT` | Deterministic bytes32 salt | See salt-management |
| `INIT_CODE_HASH` | `keccak256(bytecode ++ encodedArgs)` | From forge inspect |

### Output Parsing

```
Predicted address: 0x<PREDICTED_ADDR>
```

Confirm predicted address matches after deploy.

> **Agent Guidelines:**
> 1. ALWAYS predict address before deploy — output it to user for confirmation.
> 2. Same factory + same salt + same initcode → same address on any network.
> 3. If initcode differs (e.g., different constructor args), address will differ.

---

## create2-deploy

### Command Template (testnet — Foundry DeterministicDeploymentProxy)

```bash
# Write Operation Pre-Checks (mandatory — see _guardrails.md)
DEPLOYER_ADDR=$(cast wallet address --private-key $PRIVATE_KEY)
FACTORY="0x4e59b44847b379578588920ca78fbf26c0b4956c"
# Salt: use your own convention — e.g. "<project>-<version>-<ContractName>-testnet"
SALT=$(cast keccak "$SALT_LABEL")   # SALT_LABEL e.g. "myproject-v1-Token-testnet"

# Encode constructor args (replace types/values with your contract's constructor)
INIT_ARGS=$(cast abi-encode "constructor(<ARG_TYPES>)" <ARG_VALUES>)
# ERC20 example:
# INIT_ARGS=$(cast abi-encode "constructor(string,string,uint8,uint256,uint256,address)" \
#   "$TOKEN_NAME" "$TOKEN_SYMBOL" 18 $TOKEN_SUPPLY 0 $DEPLOYER_ADDR)

# Get creation bytecode
BYTECODE=$(forge inspect src/StandardERC20.sol:StandardERC20 bytecode)

# Build calldata: salt ++ initcode
CALLDATA="${SALT}${BYTECODE#0x}${INIT_ARGS#0x}"

# Dry-run
cast call $FACTORY "0x$CALLDATA" --rpc-url $RPC_URL

# Broadcast
cast send $FACTORY "0x$CALLDATA" \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY
```

### Parameters

| Parameter | Value | Notes |
|-----------|-------|-------|
| `FACTORY` (testnet) | `0x4e59b44847b379578588920ca78fbf26c0b4956c` | canonical-contracts.json |
| `FACTORY` (mainnet) | Use CreateX `0xba5Ed099633D3B313e4D5F7bdc1305d3c28ba5Ed` | mainnet only |
| `SALT` | 32-byte hex value | Deterministic — same salt = same addr |

### Output Parsing

```
blockHash: 0x...
transactionHash: 0xTXHASH
```

Parse deployed address from `cast receipt <TXHASH> "logs[0].topics[1]"` or use predicted address.

> **Agent Guidelines:**
> 1. Complete Write Operation Pre-checks (see _guardrails.md).
> 2. Predict address first (see predict-address).
> 3. Use testnet factory on testnet, CreateX on mainnet.
> 4. Salt must be same across networks for same address guarantee.
> 5. Verify deployed address matches prediction.
> 6. Hand off to `pharos-contract-verify`.

---

## create3-deploy

> **Mainnet only** — uses CreateX `0xba5Ed099633D3B313e4D5F7bdc1305d3c28ba5Ed`.
> CREATE3 address depends ONLY on deployer + salt (not bytecode) — upgrade-friendly.

### Command Template

```bash
# Mainnet gate — confirm first
echo "MAINNET TRANSACTION — real value on Pacific Mainnet (chainId 1672)"
# Await user confirmation

CREATEX="0xba5Ed099633D3B313e4D5F7bdc1305d3c28ba5Ed"
SALT=$(cast keccak "$SALT_LABEL")   # e.g. "myproject-v1-Token-mainnet"

# Encode initcode + constructor args (replace with your contract)
BYTECODE=$(forge inspect src/<YOUR_CONTRACT_PATH>:<ContractName> bytecode)
INIT_ARGS=$(cast abi-encode "constructor(<ARG_TYPES>)" <ARG_VALUES>)
INITCODE="${BYTECODE}${INIT_ARGS#0x}"

# Compute CREATE3 address
cast call $CREATEX "computeCreate3Address(bytes32,address)" $SALT $DEPLOYER_ADDR --rpc-url $RPC_URL

# Deploy via CREATE3
cast send $CREATEX "deployCreate3(bytes32,bytes)" $SALT $INITCODE \
  --rpc-url https://rpc.pharos.xyz \
  --private-key $PRIVATE_KEY
```

> **Agent Guidelines:**
> 1. MAINNET gate must be stated and confirmed before any mainnet broadcast.
> 2. Compute address before deploy. Confirm with user.
> 3. CreateX available mainnet only — use Foundry proxy on testnet.

---

## salt-management

### Overview

Salt controls deterministic address. Once used, cannot be reused with different bytecode.

### Conventions

```bash
# Human-readable salt pattern — choose a convention and stick to it:
# "<project>-<version>-<ContractName>-<network>"
# Examples: "acme-v1-Token-testnet", "defi-v2-Vault-mainnet"

# Encode to bytes32
SALT_LABEL="<project>-<version>-<ContractName>-<network>"
SALT=$(cast keccak "$SALT_LABEL")
echo $SALT

# Track salts in: .pharos/salts.json
# Format:
# {
#   "<your-salt-label>": {
#     "salt": "0x...",
#     "chainId": 688689,
#     "deployedAt": "0xADDR",
#     "txHash": "0x..."
#   }
# }
```

### Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| `deployment collision` | Salt + factory already deployed at this addr | Choose new salt (increment version suffix) |
| `salt already used` | Same salt, same factory, same deployer | New salt required — old address still valid |
| `address mismatch` | Initcode differs from prediction | Args or bytecode changed — recalculate prediction |
| `CREATE3 only on mainnet` | CreateX not on testnet | Use Foundry DeterministicDeploymentProxy on testnet |
