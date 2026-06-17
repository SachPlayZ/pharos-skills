export interface SkillMeta {
  name: string;
  description: string;
  dependsOn: string[];
  keywords: string[];
}

export const SKILLS: Record<string, SkillMeta> = {
  "pharos-contract-verify": {
    name: "pharos-contract-verify",
    description: "Verify deployed contracts on Pharos via Blockscout. Handles constructor args, compiler flags, retry on indexer delay.",
    dependsOn: [],
    keywords: ["verify", "blockscout", "sourcecode"],
  },
  "pharos-deploy-kit": {
    name: "pharos-deploy-kit",
    description: "Deploy contracts using forge script or deterministic CREATE2/CREATE3 for same-address-across-networks.",
    dependsOn: ["pharos-contract-verify"],
    keywords: ["deploy", "forge", "create2", "create3", "deterministic"],
  },
  "pharos-token-factory": {
    name: "pharos-token-factory",
    description: "Deploy ERC20/ERC721/ERC1155 tokens with OZ contracts. Mint, burn, pause, transfer ownership.",
    dependsOn: ["pharos-deploy-kit", "pharos-contract-verify"],
    keywords: ["token", "erc20", "erc721", "erc1155", "nft", "mint"],
  },
  "pharos-safe-multisig": {
    name: "pharos-safe-multisig",
    description: "Deploy and manage Gnosis Safe multisig wallets. Treasury management, ownership transfer.",
    dependsOn: [],
    keywords: ["safe", "multisig", "gnosis", "treasury", "owners"],
  },
  "pharos-agent-wallet": {
    name: "pharos-agent-wallet",
    description: "Autonomous agent wallet safety layer. Balance preflight, gas estimation, nonce management, spend caps, allowlists.",
    dependsOn: [],
    keywords: ["wallet", "balance", "gas", "nonce", "spend-cap", "allowlist"],
  },
  "pharos-x402-payments": {
    name: "pharos-x402-payments",
    description: "Full x402 HTTP micropayment stack. Monetize endpoints (server) and pay autonomously (client) on Pharos.",
    dependsOn: ["pharos-agent-wallet"],
    keywords: ["x402", "payments", "micropayments", "monetize", "http-402"],
  },
};

/**
 * Topological sort: resolve dependency graph for a skill.
 * Returns install order: dependencies first, then the skill itself.
 * Throws on missing dependency or cycle.
 */
export function resolveDependencies(skillName: string): string[] {
  if (!SKILLS[skillName]) {
    throw new Error(`Unknown skill: "${skillName}". Run "pharos-skills list" to see available skills.`);
  }

  const order: string[] = [];
  const visited = new Set<string>();
  const inStack = new Set<string>(); // cycle detection

  function visit(name: string): void {
    if (inStack.has(name)) {
      throw new Error(`Circular dependency detected: ${name}`);
    }
    if (visited.has(name)) return;

    inStack.add(name);

    const skill = SKILLS[name];
    if (!skill) {
      throw new Error(`Dependency "${name}" not found in registry`);
    }

    for (const dep of skill.dependsOn) {
      visit(dep);
    }

    inStack.delete(name);
    visited.add(name);
    order.push(name);
  }

  visit(skillName);
  return order;
}
