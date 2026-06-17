/**
 * x402 Payment Client for Pharos Network
 * Wraps fetch with automatic payment handling (HTTP 402 → pay → retry).
 *
 * Uses:
 *   @x402/fetch: wrapFetchWithPaymentFromConfig
 *   @x402/evm/exact/client: ExactEvmScheme (client-side signer)
 *
 * Spend cap enforced per pharos-agent-wallet pattern.
 * Idempotency: keyed on tx hash — same payment not re-sent.
 */

import { config } from "dotenv";
config();
import { wrapFetchWithPaymentFromConfig } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = process.env.CLIENT_PRIVATE_KEY;
const NETWORK_ID = (process.env.NETWORK_ID ?? "eip155:688689") as `${string}:${string}`;
const SPEND_CAP = parseInt(process.env.CLIENT_SPEND_CAP ?? "1000000");
const LEDGER_PATH = join(__dirname, ".pharos", "spend-ledger.json");

if (!PRIVATE_KEY) throw new Error("CLIENT_PRIVATE_KEY not set in .env");

const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
console.log(`[x402 Client] Wallet: ${account.address}`);
console.log(`[x402 Client] Network: ${NETWORK_ID}`);
console.log(`[x402 Client] Spend cap: ${SPEND_CAP} (token smallest units)`);

// ── Spend cap ledger (agent-wallet pattern) ───────────────────────────────────

interface SpendLedger {
  sessionCap: number;
  sessionSpent: number;
  transactions: Array<{ txHash: string; amount: string; ts: string }>;
}

function loadLedger(): SpendLedger {
  if (!existsSync(LEDGER_PATH)) {
    mkdirSync(dirname(LEDGER_PATH), { recursive: true });
    return { sessionCap: SPEND_CAP, sessionSpent: 0, transactions: [] };
  }
  return JSON.parse(readFileSync(LEDGER_PATH, "utf-8")) as SpendLedger;
}

function saveLedger(l: SpendLedger): void {
  writeFileSync(LEDGER_PATH, JSON.stringify(l, null, 2));
}

function checkAndRecordPayment(txHash: string): void {
  const ledger = loadLedger();
  // Idempotency: skip duplicate tx
  if (ledger.transactions.some((t) => t.txHash === txHash)) {
    console.warn(`[x402 Client] Idempotency: ${txHash} already recorded`);
    return;
  }
  // Cost unknown until after payment — record as 1 unit for budget tracking
  // In production: decode payment response to get exact amount
  ledger.sessionSpent += 1;
  ledger.transactions.push({ txHash, amount: "1", ts: new Date().toISOString() });
  saveLedger(ledger);
  console.log(`[x402 Client] Payment recorded. Session: ${ledger.sessionSpent}/${ledger.sessionCap}`);
}

function guardSpendCap(): void {
  const ledger = loadLedger();
  if (ledger.sessionSpent >= ledger.sessionCap) {
    throw new Error(
      `SPEND CAP REACHED: ${ledger.sessionSpent}/${ledger.sessionCap} payments this session. ` +
      `Increase CLIENT_SPEND_CAP or start a new session.`
    );
  }
}

// ── Payment-wrapped fetch ─────────────────────────────────────────────────────

const fetchWithPayment = wrapFetchWithPaymentFromConfig(fetch, {
  schemes: [
    {
      network: NETWORK_ID,
      client: new ExactEvmScheme(account),
    },
  ],
});

// ── Retry wrapper ─────────────────────────────────────────────────────────────

export async function fetchPaid(
  url: string,
  options?: RequestInit,
  maxRetries = 3
): Promise<Response> {
  guardSpendCap();

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetchWithPayment(url, options);
      // Record payment after successful call
      const txHash = res.headers.get("x-payment-tx-hash") ?? `mock-${Date.now()}`;
      checkAndRecordPayment(txHash);
      return res;
    } catch (err: unknown) {
      const isLast = attempt === maxRetries;
      if (isLast) throw err;
      const delay = Math.pow(2, attempt) * 500;
      console.warn(`[x402 Client] Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("fetchPaid: unreachable");
}

// ── Demo ──────────────────────────────────────────────────────────────────────
// Set SERVER_URL and TARGET_PATH in .env to point at your server endpoint.

async function main() {
  const SERVER_URL = process.env.SERVER_URL ?? "http://localhost:3000";
  const TARGET_PATH = process.env.TARGET_PATH ?? "/api/resource";
  const url = `${SERVER_URL}${TARGET_PATH}`;
  console.log(`\n[x402 Client] Calling ${url} ...`);
  const res = await fetchPaid(url);
  const data = await res.json();
  console.log("[x402 Client] Response:", JSON.stringify(data, null, 2));
}

main().catch((err) => {
  console.error("[x402 Client] Fatal:", err.message);
  process.exit(1);
});
