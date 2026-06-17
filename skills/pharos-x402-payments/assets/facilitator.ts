/**
 * x402 Self-hosted Facilitator for Pharos Network
 * Exposes /verify, /settle, /supported via ExactEvmScheme.
 *
 * Uses:
 *   @x402/evm/exact/facilitator: ExactEvmScheme
 *   @x402/evm: toFacilitatorEvmSigner
 *   viem: walletClient.extend(publicActions) for combined client
 *
 * NOTE: For most use cases, the public facilitator at https://facilitator.x402.org
 * already supports common EVM chains. Run this only for private/custom facilitator needs.
 */

import { config } from "dotenv";
config();
import express from "express";
import { ExactEvmScheme } from "@x402/evm/exact/facilitator";
import { toFacilitatorEvmSigner } from "@x402/evm";
import { privateKeyToAccount } from "viem/accounts";
import { createWalletClient, http, publicActions } from "viem";
import { defineChain } from "viem";

// ── Pharos Atlantic Testnet chain definition ───────────────────────────────────

const pharosTestnet = defineChain({
  id: 688689,
  name: "Pharos Atlantic Testnet",
  nativeCurrency: { name: "PHRS", symbol: "PHRS", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.RPC_URL ?? "https://atlantic.dplabs-internal.com"] },
  },
  blockExplorers: {
    default: { name: "PharosScan", url: "https://atlantic.pharosscan.xyz" },
  },
});

// ── Config ────────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.FACILITATOR_PORT ?? "3001");
const PRIVATE_KEY = process.env.SERVER_PRIVATE_KEY;
const NETWORK_ID = (process.env.NETWORK_ID ?? "eip155:688689") as `${string}:${string}`;

if (!PRIVATE_KEY) throw new Error("SERVER_PRIVATE_KEY not set in .env");

const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);

// Combine walletClient + publicActions — toFacilitatorEvmSigner needs both
const client = createWalletClient({
  account,
  chain: pharosTestnet,
  transport: http(),
}).extend(publicActions);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const signer = toFacilitatorEvmSigner(client as any);

console.log(`[x402 Facilitator] Wallet: ${account.address}`);
console.log(`[x402 Facilitator] Network: ${NETWORK_ID}`);

// ── Facilitator scheme ────────────────────────────────────────────────────────

const scheme = new ExactEvmScheme(signer);

// In-memory idempotency registry
const settled = new Set<string>();

// ── App ────────────────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

app.get("/supported", (_req, res) => {
  res.json({ kinds: [{ scheme: "exact", network: NETWORK_ID }] });
});

app.post("/verify", async (req, res) => {
  const { payload, paymentRequirements } = req.body ?? {};
  if (!payload || !paymentRequirements) {
    return res.status(400).json({ error: "payload and paymentRequirements required" });
  }
  try {
    const result = await scheme.verify(payload, paymentRequirements);
    return res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return res.status(400).json({ error: `Verification failed: ${msg}` });
  }
});

app.post("/settle", async (req, res) => {
  const { payload, paymentRequirements } = req.body ?? {};
  if (!payload || !paymentRequirements) {
    return res.status(400).json({ error: "payload and paymentRequirements required" });
  }
  const idempotencyKey = JSON.stringify(payload).slice(0, 128);
  if (settled.has(idempotencyKey)) {
    console.log(`[Facilitator] Idempotent settle`);
    return res.json({ success: true, idempotent: true });
  }
  try {
    const result = await scheme.settle(payload, paymentRequirements);
    settled.add(idempotencyKey);
    console.log(`[Facilitator] Settled`);
    return res.json({ ...result, idempotent: false });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return res.status(400).json({ error: `Settlement failed: ${msg}` });
  }
});

app.listen(PORT, () => {
  console.log(`[x402 Facilitator] Listening on http://0.0.0.0:${PORT}`);
  console.log(`[x402 Facilitator] Routes: GET /supported, POST /verify, POST /settle`);
});
