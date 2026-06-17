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

  const pharosDir = join(targetDir, ".pharos");
  const skillsDir = join(pharosDir, "skills");
  const sharedDir = join(pharosDir, "shared");

  // For global installs SKILL.md lives inside .pharos/; for local it sits in project root
  const skillMdPath = isGlobal
    ? join(pharosDir, "SKILL.md")
    : join(targetDir, "SKILL.md");

  mkdirSync(skillsDir, { recursive: true });

  // 1. Copy shared/
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

  // 3. Merge SKILL.md
  const installedSkills: Array<{ name: string; content: string }> = [];
  for (const skillName of skills) {
    const skillMdSrc = join(skillsDir, skillName, "SKILL.md");
    if (existsSync(skillMdSrc)) {
      installedSkills.push({ name: skillName, content: readFileSync(skillMdSrc, "utf-8") });
    }
  }

  const mergedContent = mergeSkillMd(installedSkills);
  writeFileSync(skillMdPath, mergedContent);
  console.log(`  ✓ SKILL.md (merged Capability Index) → ${isGlobal ? ".pharos/SKILL.md" : "SKILL.md"}`);

  // 4. Editor-specific next steps
  const skillMdDisplay = isGlobal ? `${targetDir}/.pharos/SKILL.md` : `${targetDir}/SKILL.md`;
  const includesClaudeCode = editors.includes("claude-code") || editors.includes("other");
  const includesCursor = editors.includes("cursor") || editors.includes("other");
  const includesOpencode = editors.includes("opencode") || editors.includes("other");
  const includesWindsurf = editors.includes("windsurf") || editors.includes("other");

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
    console.log(`\n  Claude Code — SKILL.md is auto-loaded if in your project root.`);
    if (isGlobal) {
      console.log(`    Add to your global Claude Code context:`);
      console.log(`      echo "${skillMdDisplay}" >> ~/.claude/context`);
    }
  }
  if (includesCursor) {
    console.log(`\n  Cursor — reference SKILL.md in your .cursorrules:`);
    console.log(`    @${skillMdDisplay}`);
  }
  if (includesOpencode) {
    console.log(`\n  opencode — add SKILL.md to your system prompt context:`);
    console.log(`    ${skillMdDisplay}`);
  }
  if (includesWindsurf) {
    console.log(`\n  Windsurf — add SKILL.md to your global rules or Cascade context:`);
    console.log(`    ${skillMdDisplay}`);
  }
  console.log();
}

export function listInstalled(targetDir: string): string[] {
  const skillsDir = join(targetDir, ".pharos", "skills");
  if (!existsSync(skillsDir)) return [];
  return readdirSync(skillsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}
