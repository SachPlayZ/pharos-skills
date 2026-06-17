# x402 Client Reference

> Template: `assets/client.ts`
> SDK: `@x402/fetch ^2.15.0`, `@x402/evm/exact/client`

## setup

### Command Template

```bash
# Configure
cp .env.example .env
# Required: CLIENT_PRIVATE_KEY
# Set: CLIENT_SPEND_CAP (max payments per session), SERVER_URL

# Initialize spend ledger
mkdir -p .pharos
echo '{"sessionCap":100,"sessionSpent":0,"transactions":[]}' > .pharos/spend-ledger.json

# Run
npm run client
```

### Key imports (actual API)

```typescript
import { wrapFetchWithPaymentFromConfig } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const account = privateKeyToAccount(process.env.CLIENT_PRIVATE_KEY as `0x${string}`);

const fetchWithPayment = wrapFetchWithPaymentFromConfig(fetch, {
  schemes: [
    {
      network: "eip155:688689",      // Pharos testnet CAIP-2
      client: new ExactEvmScheme(account),
    },
  ],
});

// Use exactly like fetch — 402 handled automatically
const res = await fetchWithPayment("http://localhost:3000/api/<your-endpoint>");
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CLIENT_PRIVATE_KEY` | Yes | Paying wallet. NEVER log or share. |
| `CLIENT_SPEND_CAP` | No | Max payments per session. Default: 100. |
| `SERVER_URL` | No | Default: `http://localhost:3000` |
| `NETWORK_ID` | No | Default: `eip155:688689` |

---

## wrap-fetch

### wrapFetchWithPaymentFromConfig config

```typescript
const fetchWithPayment = wrapFetchWithPaymentFromConfig(fetch, {
  schemes: [
    {
      network: "eip155:688689",      // or "eip155:*" to match all EVM
      client: new ExactEvmScheme(account),
    },
  ],
  // Optional: custom selector when multiple payment options offered
  // paymentRequirementsSelector: (options) => options[0],
});
```

### Payment flow

1. Client calls `fetchWithPayment(url)`
2. Server returns `402 Payment Required` with payment requirements
3. SDK creates ERC20 payment on Pharos testnet
4. Retries request with `x-payment` header containing payment proof
5. Server verifies via facilitator → returns `200 OK`

---

## retry-idempotency

### Retry wrapper

```typescript
async function fetchPaid(url: string, options?: RequestInit, maxRetries = 3) {
  guardSpendCap(); // throws if session cap reached
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetchWithPayment(url, options);
      checkAndRecordPayment(res.headers.get("x-payment-tx-hash") ?? `${Date.now()}`);
      return res;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 500));
    }
  }
}
```

### Idempotency

```typescript
// Before recording: check if tx already seen
if (ledger.transactions.some(t => t.txHash === txHash)) {
  console.warn(`Idempotency: ${txHash} already recorded`);
  return; // don't double-count
}
```

### Spend cap guard

```typescript
function guardSpendCap(): void {
  const ledger = loadLedger();
  if (ledger.sessionSpent >= ledger.sessionCap) {
    throw new Error(`SPEND CAP REACHED: ${ledger.sessionSpent}/${ledger.sessionCap}`);
  }
}
```

### Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| `SPEND CAP REACHED` | Session budget exhausted | Increase `CLIENT_SPEND_CAP` or reset ledger |
| `CLIENT_PRIVATE_KEY not set` | Missing env | Set in `.env` |
| `Failed to parse payment requirements` | Server 402 format mismatch | Check client/server SDK versions match |
| `ERC20InsufficientBalance` | Wallet out of tokens | Top up client wallet with payment token |
| Network timeout | RPC unreachable | Check `RPC_URL` in `.env` |

> **Agent Guidelines:**
> 1. Call `guardSpendCap()` before every `fetchWithPayment` call.
> 2. Record payment tx hash after each successful call.
> 3. Private key from env only — NEVER paste raw key in code or share with LLM.
> 4. If `SPEND CAP REACHED` — halt and report to user. Do not bypass.
