# x402 Server Reference

> Template: `assets/server.ts`
> SDK versions: `@x402/express ^2.15.0`, `@x402/evm ^2.15.0`, `@x402/core ^2.15.0`
> Network ID (CAIP-2): `eip155:688689` (Pharos Atlantic Testnet)

## setup

### Command Template

```bash
# Copy assets
cp -r .pharos/skills/pharos-x402-payments/assets/* ./x402/
cd x402

# Install
npm install

# Configure
cp .env.example .env
# Required: SERVER_PRIVATE_KEY, PAYMENT_TOKEN_ADDRESS
# Optional: FACILITATOR_URL (default: https://facilitator.x402.org)

# Run
npm run server
```

### Key imports (actual API)

```typescript
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { registerExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { privateKeyToAccount } from "viem/accounts";

// Build resource server
const facilitatorClient = new HTTPFacilitatorClient({ url: FACILITATOR_URL });
const resourceServer = new x402ResourceServer(facilitatorClient);
registerExactEvmScheme(resourceServer, { networks: ["eip155:688689"] });

// Apply middleware
app.use(paymentMiddleware(routes, resourceServer));
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SERVER_PRIVATE_KEY` | Yes | Wallet receiving payments. Never share with LLM. |
| `PAYMENT_TOKEN_ADDRESS` | Yes | ERC20 token to accept. Configure explicitly. |
| `FACILITATOR_URL` | No | Default: `https://facilitator.x402.org` |
| `NETWORK_ID` | No | Default: `eip155:688689` |
| `SERVER_PORT` | No | Default: `3000` |

### Output Parsing

```
[x402 Server] Listening on http://0.0.0.0:3000
[x402 Server] Network: eip155:688689
[x402 Server] Priced routes:
  GET /api/<your-endpoint> → $<price>
```

Test health (free): `curl http://localhost:3000/health`
Test paid (will 402 without client): `curl http://localhost:3000/api/<your-endpoint>`

---

## priced-routes

Route config shape:

```typescript
// Replace the key and values with your actual route and price
const routes = {
  "GET /api/<your-endpoint>": {
    accepts: {
      scheme: "exact",          // ExactEvmScheme — pays exact ERC20 amount
      price: "$<price>",        // e.g. "$0.001" — converted to token units via oracle
      network: NETWORK_ID,      // CAIP-2 format from env: "eip155:688689"
      payTo: account.address,   // server wallet receives payment before request is served
    },
    description: "<describe your endpoint>",
  },
  // Add more routes as needed
};
```

### Parameters

| Field | Type | Notes |
|-------|------|-------|
| `scheme` | `"exact"` | Use ExactEvmScheme for precise ERC20 payments |
| `price` | `"$X.XX"` | Dollar string; x402 converts to token units via price oracle |
| `network` | string | CAIP-2 format: `eip155:688689` |
| `payTo` | address | Server wallet — receives payment before request is served |

### Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| `SERVER_PRIVATE_KEY not set` | Missing env | Set in `.env` |
| `PAYMENT_TOKEN_ADDRESS not set` | Missing env | Set in `.env` explicitly |
| `402 Payment Required` (client gets this) | Gated route hit without payment | Expected — x402 client handles automatically |
| Facilitator connection error | `FACILITATOR_URL` unreachable | Check URL; default `https://facilitator.x402.org` works for testnet |

> **Agent Guidelines:**
> 1. Set `SERVER_PRIVATE_KEY` from env only — NEVER hardcode.
> 2. `PAYMENT_TOKEN_ADDRESS` must match what client sends.
> 3. Warn if using unofficial x402 test USDC `0xE0BE08c77f415F577A1B3A9aD7a1Df1479564ec8`.
> 4. Default facilitator (`https://facilitator.x402.org`) handles most EVM chains including Pharos testnet.
