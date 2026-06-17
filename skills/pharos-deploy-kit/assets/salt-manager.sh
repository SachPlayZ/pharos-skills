#!/usr/bin/env bash
# Salt manager helper for pharos-deploy-kit
# Usage: ./salt-manager.sh <human-name> [--record <chainId> <deployedAt> <txHash>]
#
# Recommended naming convention for <human-name>:
#   "<project>-<version>-<ContractName>-<network>"
#   e.g.: "acme-v1-Token-testnet", "defi-v2-Vault-mainnet"
#
# Same name → same salt → same deployed address (assuming same factory + bytecode).

set -euo pipefail

LEDGER=".pharos/salts.json"
mkdir -p .pharos

HUMAN_NAME="${1:-}"
[ -z "$HUMAN_NAME" ] && { echo "Usage: $0 <name> [--record <chainId> <addr> <txHash>]"; exit 1; }

SALT=$(cast keccak "$HUMAN_NAME" 2>/dev/null || python3 -c "import hashlib; print('0x' + hashlib.sha3_256('$HUMAN_NAME'.encode()).hexdigest())")

if [ "${2:-}" = "--record" ]; then
  CHAIN_ID="${3:?chainId required}"
  DEPLOYED="${4:?address required}"
  TX_HASH="${5:?txHash required}"

  # Init ledger if missing
  [ -f "$LEDGER" ] || echo "{}" > "$LEDGER"

  # Append entry
  python3 - <<PYEOF
import json, sys
with open("$LEDGER") as f:
    data = json.load(f)
data["$HUMAN_NAME"] = {
    "salt": "$SALT",
    "chainId": $CHAIN_ID,
    "deployedAt": "$DEPLOYED",
    "txHash": "$TX_HASH"
}
with open("$LEDGER", "w") as f:
    json.dump(data, f, indent=2)
print(f"Recorded: $HUMAN_NAME → $DEPLOYED")
PYEOF
else
  echo "Salt for '$HUMAN_NAME': $SALT"
  # Check if already used
  if [ -f "$LEDGER" ] && python3 -c "import json; d=json.load(open('$LEDGER')); exit(0 if '$HUMAN_NAME' in d else 1)" 2>/dev/null; then
    echo "WARNING: Salt '$HUMAN_NAME' already recorded in $LEDGER"
    python3 -c "import json; d=json.load(open('$LEDGER')); print(json.dumps(d['$HUMAN_NAME'], indent=2))"
  fi
fi
