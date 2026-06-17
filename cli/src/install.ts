import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { cpSync, mkdirSync, existsSync, readFileSync, writeFileSync, readdirSync } from "fs";
import { mergeSkillMd } from "./merge-skill-md.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");

export interface InstallOptions {
  global?: boolean;
  editors?: string[];
}

export async function installSkills(
  skills: string[],
  targetDir: string,
  options: InstallOptions = {}
): Promise<void> {
  const { global: isGlobal = false, editors = ["all"] } = options;

  // Skills are installed to two locations so every major AI editor picks them up:
  //   .claude/skills/<name>/  → Claude Code slash commands (local or ~/.claude/ global)
  //   .agents/skills/<name>/  → cross-editor convention (Cursor, opencode, Windsurf, etc.)
  // Shared guardrail assets live in .pharos/shared/ (consistent path SKILL.md references).

  const claudeSkillsDir = join(targetDir, ".claude",  "skills");
  const agentsSkillsDir = join(targetDir, ".agents", "skills");
  const sharedDir       = join(targetDir, ".pharos",  "shared");

  mkdirSync(claudeSkillsDir, { recursive: true });
  mkdirSync(agentsSkillsDir, { recursive: true });

  // 1. Shared guardrail assets
  const srcShared = join(REPO_ROOT, "shared");
  if (existsSync(srcShared)) {
    cpSync(srcShared, sharedDir, { recursive: true });
    console.log(`  ✓ shared assets → .pharos/shared/`);
  }

  // 2. Install each skill into both discovery directories
  for (const skillName of skills) {
    const srcSkill = join(REPO_ROOT, "skills", skillName);
    if (!existsSync(srcSkill)) throw new Error(`Skill source not found: ${srcSkill}`);

    cpSync(srcSkill, join(claudeSkillsDir, skillName), { recursive: true });
    cpSync(srcSkill, join(agentsSkillsDir, skillName), { recursive: true });
    console.log(`  ✓ ${skillName} → .claude/skills/ + .agents/skills/`);
  }

  // 3. Merged SKILL.md for editors that don't auto-discover skill folders
  const installedSkills: Array<{ name: string; content: string }> = [];
  for (const skillName of skills) {
    const p = join(claudeSkillsDir, skillName, "SKILL.md");
    if (existsSync(p)) installedSkills.push({ name: skillName, content: readFileSync(p, "utf-8") });
  }
  const mergedContent = mergeSkillMd(installedSkills);
  const mergedPath = isGlobal
    ? join(targetDir, ".claude", "pharos", "SKILL.md")
    : join(targetDir, "SKILL.md");
  mkdirSync(dirname(mergedPath), { recursive: true });
  writeFileSync(mergedPath, mergedContent);
  console.log(`  ✓ SKILL.md (merged) → ${isGlobal ? ".claude/pharos/SKILL.md" : "SKILL.md"}`);

  // 4. Next steps
  const triggers = skills.map(s => `/${s}`).join(", ");
  const includesClaudeCode = editors.includes("claude-code") || editors.includes("other");
  const includesCursor     = editors.includes("cursor")      || editors.includes("other");
  const includesOpencode   = editors.includes("opencode")    || editors.includes("other");
  const includesWindsurf   = editors.includes("windsurf")    || editors.includes("other");

  console.log(`\nNext steps:`);
  console.log(`  1. Install Foundry (if needed):`);
  console.log(`       curl -L https://foundry.paradigm.xyz | bash && foundryup`);
  console.log(`  2. Export private key (from env, never hardcode):`);
  console.log(`       export PRIVATE_KEY=0x<your-key>`);
  console.log(`  3. Set RPC URL:`);
  console.log(`       export RPC_URL=https://atlantic.dplabs-internal.com`);
  console.log(`  4. Read guardrails before any write operation:`);
  console.log(`       .pharos/shared/references/_guardrails.md`);

  if (includesClaudeCode) {
    console.log(`\n  Claude Code → type ${triggers} to invoke.`);
  }
  if (includesCursor) {
    console.log(`\n  Cursor → skills available via .agents/skills/ agent context.`);
  }
  if (includesOpencode) {
    console.log(`\n  opencode → skills available via .agents/skills/ agent context.`);
  }
  if (includesWindsurf) {
    console.log(`\n  Windsurf → skills available via .agents/skills/ agent context.`);
  }
  console.log();
}

export function listInstalled(targetDir: string): string[] {
  const dir = join(targetDir, ".claude", "skills");
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
}
