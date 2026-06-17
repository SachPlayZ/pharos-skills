/**
 * x402 Payment Server for Pharos Network
 * Monetizes Express endpoints via HTTP 402 micropayments.
 *
 * Read .env.example for required environment variables.
 * Token address MUST be configured explicitly — see .env.example.
 *
 * Uses:
 *   @x402/express: paymentMiddleware, x402ResourceServer
 *   @x402/evm/exact/server: registerExactEvmScheme
 *   @x402/core/server: HTTPFacilitatorClient
 */

import { config } from "dotenv";
config();
import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { registerExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { privateKeyToAccount } from "viem/accounts";

// ── Config ───────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.SERVER_PORT ?? "3000");
const PRIVATE_KEY = process.env.SERVER_PRIVATE_KEY;
const TOKEN_ADDRESS = process.env.PAYMENT_TOKEN_ADDRESS;
const NETWORK_ID = (process.env.NETWORK_ID ?? "eip155:688689") as `${string}:${string}`;
const FACILITATOR_URL = process.env.FACILITATOR_URL ?? "https://facilitator.x402.org";

if (!PRIVATE_KEY) throw new Error("SERVER_PRIVATE_KEY not set in .env");
if (!TOKEN_ADDRESS) throw new Error("PAYMENT_TOKEN_ADDRESS not set in .env — configure explicitly");

if (TOKEN_ADDRESS === "0xE0BE08c77f415F577A1B3A9aD7a1Df1479564ec8") {
  console.warn("[WARN] Using UNOFFICIAL x402 test USDC — for testing only, not canonical USDC");
}

const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
console.log(`[x402 Server] Wallet: ${account.address}`);
console.log(`[x402 Server] Network: ${NETWORK_ID}`);
console.log(`[x402 Server] Facilitator: ${FACILITATOR_URL}`);

// ── x402 resource server setup ────────────────────────────────────────────────

const facilitatorClient = new HTTPFacilitatorClient({ url: FACILITATOR_URL });
const resourceServer = new x402ResourceServer(facilitatorClient);

// Register ExactEvmScheme for the configured network
registerExactEvmScheme(resourceServer, { networks: [NETWORK_ID] });

// ── Route config ──────────────────────────────────────────────────────────────
// Define your priced routes here. Each key is "<METHOD> <path>".
// price: USD string ("$0.001") or raw token amount string.
// payTo: address that receives payment (defaults to server wallet below).
//
// Example:
//   "GET /api/resource":  { accepts: { scheme: "exact", price: "$0.001", ... } }
//   "POST /api/action":   { accepts: { scheme: "exact", price: "$0.01",  ... } }
//
// CONFIGURE THESE routes for your application — the examples below are
// illustrative starting points, not production defaults.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const routes: Record<string, any> = {
  // ── Add your priced routes here ──────────────────────────────────────────
  // "GET /api/<your-endpoint>": {
  //   accepts: {
  //     scheme: "exact",
  //     price: "$<price>",          // e.g. "$0.001"
  //     network: NETWORK_ID,
  //     payTo: account.address,
  //   },
  //   description: "<description>",
  // },
};

if (Object.keys(routes).length === 0) {
  console.warn("[x402 Server] No routes configured — add entries to the routes object in server.ts");
}

// ── App ───────────────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

// Apply x402 payment middleware to priced routes
app.use(paymentMiddleware(routes, resourceServer));

// Free health check — no payment required
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    wallet: account.address,
    network: NETWORK_ID,
    pricedRoutes: Object.keys(routes),
  });
});

// ── Register route handlers ───────────────────────────────────────────────────
// Add your Express route handlers below that correspond to the priced routes
// defined in the routes object above.
//
// Example:
//   app.get("/api/<your-endpoint>", (_req, res) => {
//     res.json({ data: "your response", timestamp: new Date().toISOString() });
//   });

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[x402 Server] Listening on http://0.0.0.0:${PORT}`);
  if (Object.keys(routes).length > 0) {
    console.log(`[x402 Server] Priced routes:`);
    Object.entries(routes).forEach(([path, cfg]: [string, any]) =>
      console.log(`  ${path} → ${(cfg as any).accepts.price}`)
    );
  }
});
