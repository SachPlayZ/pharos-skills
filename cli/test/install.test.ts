import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { installSkills, listInstalled } from "../src/install.js";
import { resolveDependencies } from "../src/registry.js";

function makeTempDir(): string {
  const dir = join(tmpdir(), `pharos-test-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe("installSkills", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("installs pharos-contract-verify into .claude/skills and .agents/skills", async () => {
    const skills = resolveDependencies("pharos-contract-verify");
    await installSkills(skills, tmpDir);

    expect(existsSync(join(tmpDir, ".claude",  "skills", "pharos-contract-verify"))).toBe(true);
    expect(existsSync(join(tmpDir, ".agents", "skills", "pharos-contract-verify"))).toBe(true);
    expect(existsSync(join(tmpDir, ".pharos", "shared"))).toBe(true);
    expect(existsSync(join(tmpDir, "SKILL.md"))).toBe(true);
  });

  it("installs SKILL.md with Capability Index", async () => {
    const skills = resolveDependencies("pharos-contract-verify");
    await installSkills(skills, tmpDir);

    const content = readFileSync(join(tmpDir, "SKILL.md"), "utf-8");
    expect(content).toContain("## Capability Index");
  });

  it("idempotent: re-add does not duplicate Capability Index rows", async () => {
    const skills = resolveDependencies("pharos-contract-verify");

    await installSkills(skills, tmpDir);
    const content1 = readFileSync(join(tmpDir, "SKILL.md"), "utf-8");

    await installSkills(skills, tmpDir);
    const content2 = readFileSync(join(tmpDir, "SKILL.md"), "utf-8");

    expect(content1).toBe(content2);

    const rows = content2.split("\n").filter((l) => l.startsWith("| ") && !l.startsWith("| User Need") && !l.startsWith("|---"));
    const rowCount1 = content1.split("\n").filter((l) => l.startsWith("| ") && !l.startsWith("| User Need") && !l.startsWith("|---")).length;
    expect(rows.length).toBe(rowCount1);
  });

  it("installs token-factory with all transitive deps in both skill dirs", async () => {
    const skills = resolveDependencies("pharos-token-factory");
    await installSkills(skills, tmpDir);

    for (const s of skills) {
      expect(existsSync(join(tmpDir, ".claude",  "skills", s))).toBe(true);
      expect(existsSync(join(tmpDir, ".agents", "skills", s))).toBe(true);
    }
  });

  it("listInstalled returns installed skills", async () => {
    const skills = resolveDependencies("pharos-deploy-kit");
    await installSkills(skills, tmpDir);

    const installed = listInstalled(tmpDir);
    for (const s of skills) {
      expect(installed).toContain(s);
    }
  });

  it("listInstalled returns empty for fresh dir", () => {
    const installed = listInstalled(tmpDir);
    expect(installed).toHaveLength(0);
  });
});
