import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { cpSync, mkdirSync, existsSync, readFileSync, writeFileSync, readdirSync } from "fs";
import { mergeSkillMd, parseCapabilityRows } from "./merge-skill-md.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Repo root = 2 levels up from cli/src/
const REPO_ROOT = join(__dirname, "..", "..");

/**
 * Install a skill (and its resolved dependency list) into a target directory.
 * Idempotent: re-running won't duplicate anything.
 */
export async function installSkills(
  skills: string[],   // topologically ordered: deps first
  targetDir: string,
  network: "testnet" | "mainnet" = "testnet"
): Promise<void> {
  const pharosDir = join(targetDir, ".pharos");
  const skillsDir = join(pharosDir, "skills");
  const sharedDir = join(pharosDir, "shared");

  mkdirSync(skillsDir, { recursive: true });

  // 1. Copy shared/ once
  const srcShared = join(REPO_ROOT, "shared");
  if (existsSync(srcShared)) {
    cpSync(srcShared, sharedDir, { recursive: true });
    console.log(`  ✓ shared assets → .pharos/shared/`);
  }

  // 2. Copy each skill
  for (const skillName of skills) {
    const srcSkill = join(REPO_ROOT, "skills", skillName);
    const dstSkill = join(skillsDir, skillName);

    if (!existsSync(srcSkill)) {
      throw new Error(`Skill source not found: ${srcSkill}`);
    }

    cpSync(srcSkill, dstSkill, { recursive: true });
    console.log(`  ✓ ${skillName} → .pharos/skills/${skillName}/`);
  }

  // 3. Merge SKILL.md — read installed skill SKILL.md files
  const installedSkills: Array<{ name: string; content: string }> = [];

  for (const skillName of skills) {
    const skillMdPath = join(skillsDir, skillName, "SKILL.md");
    if (existsSync(skillMdPath)) {
      installedSkills.push({
        name: skillName,
        content: readFileSync(skillMdPath, "utf-8"),
      });
    }
  }

  const mergedContent = mergeSkillMd(installedSkills);
  const topLevelSkillMd = join(targetDir, "SKILL.md");
  writeFileSync(topLevelSkillMd, mergedContent);
  console.log(`  ✓ SKILL.md (merged Capability Index) → SKILL.md`);

  // 4. Print next steps
  console.log(`
Next steps:
  1. Install Foundry (if needed):
       curl -L https://foundry.paradigm.xyz | bash && foundryup
  2. Export private key (from env, never hardcode):
       export PRIVATE_KEY=0x<your-key>
  3. Set RPC URL:
       export RPC_URL=https://atlantic.dplabs-internal.com
  4. Network: ${network === "mainnet" ? "⚠️  MAINNET — real value. Confirm all txs carefully." : "Atlantic Testnet (chainId 688689) — safe to experiment."}
  5. Read .pharos/shared/references/_guardrails.md before any write operation.
`);
}

/** List installed skills in a directory. */
export function listInstalled(targetDir: string): string[] {
  const skillsDir = join(targetDir, ".pharos", "skills");
  if (!existsSync(skillsDir)) return [];
  return readdirSync(skillsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}
