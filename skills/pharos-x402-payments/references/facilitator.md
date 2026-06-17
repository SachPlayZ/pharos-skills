# x402 Facilitator Reference

> Template: `assets/facilitator.ts`
> SDK: `@x402/evm/exact/facilitator`, `@x402/evm (toFacilitatorEvmSigner)`
>
> **NOTE**: For most use cases, use the public facilitator at `https://facilitator.x402.org`.
> Only run this if you need a private/custom facilitator.

## network-config

Pharos chain definition for viem (required by facilitator signer):

```typescript
import { defineChain } from "viem/chains";

const pharosTestnet = defineChain({
  id: 688689,
  name: "Pharos Atlantic Testnet",
  nativeCurrency: { name: "PHRS", symbol: "PHRS", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://atlantic.dplabs-internal.com"] },
  },
  blockExplorers: {
    default: { name: "PharosScan", url: "https://atlantic.pharosscan.xyz" },
  },
});
```

---

## setup

### Key imports (actual API)

```typescript
import { ExactEvmScheme, registerExactEvmScheme } from "@x402/evm/exact/facilitator";
import { toFacilitatorEvmSigner } from "@x402/evm";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const account = privateKeyToAccount(process.env.SERVER_PRIVATE_KEY as `0x${string}`);
const walletClient = createWalletClient({ account, chain: pharosTestnet, transport: http() });
const signer = toFacilitatorEvmSigner(walletClient);

const scheme = new ExactEvmScheme(signer);
// scheme.verify(payload, requirements)
// scheme.settle(payload, requirements)
```

### Command Template

```bash
# Only if running self-hosted facilitator
cp .env.example .env
# Set: SERVER_PRIVATE_KEY, FACILITATOR_PORT (default 3001)
npm run facilitator
```

### Output Parsing

```
[x402 Facilitator] Wallet: 0xADDR
[x402 Facilitator] Routes: GET /supported, POST /verify, POST /settle
[x402 Facilitator] Listening on http://0.0.0.0:3001
```

---

## supported

```bash
curl http://localhost:3001/supported
```

Response:
```json
{
  "kinds": [{ "scheme": "exact", "network": "eip155:688689" }]
}
```

---

## verify

```bash
curl -X POST http://localhost:3001/verify \
  -H "Content-Type: application/json" \
  -d '{"payload": {...}, "paymentRequirements": {...}}'
```

`payload` and `paymentRequirements` come from the x402 protocol — the SDK passes these automatically.

---

## settle

```bash
curl -X POST http://localhost:3001/settle \
  -H "Content-Type: application/json" \
  -d '{"payload": {...}, "paymentRequirements": {...}}'
```

Idempotent: same txHash settled twice returns `{ "idempotent": true }`.

---

## Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| `payload and paymentRequirements required` | Missing body | SDK sends automatically; check client SDK version |
| `Verification failed` | Invalid payment proof | Client may have sent wrong token or amount |
| `Settlement failed` | On-chain tx failed | Check RPC URL; verify token balance |
| `SERVER_PRIVATE_KEY not set` | Missing env | Set in `.env` |
| RPC timeout | Pharos testnet unreachable | Check `RPC_URL`: `https://atlantic.dplabs-internal.com` |

> **Agent Guidelines:**
> 1. For most cases: use public facilitator `https://facilitator.x402.org` — no setup needed.
> 2. Self-host only when: private network, custom settlement, or local testing without internet.
> 3. `SERVER_PRIVATE_KEY` of facilitator must match the server's `payTo` address expectations.
> 4. Idempotency is in-memory only — restart clears it. For production: persist settled set.
