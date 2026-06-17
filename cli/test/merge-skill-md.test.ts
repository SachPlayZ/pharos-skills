import { describe, it, expect } from "vitest";
import {
  parseCapabilityRows,
  deduplicateRows,
  renderCapabilityTable,
  mergeSkillMd,
} from "../src/merge-skill-md.js";

const FAKE_SKILL_MD = `---
name: test-skill
---

# Test Skill

## Capability Index

| User Need | Capability | Detailed Instructions |
|-----------|-----------|----------------------|
| Deploy a thing | Standard deploy | [→ deploy.md#deploy] |
| Verify source | Verify contract | [→ verify.md#verify] |
`;

const FAKE_SKILL_MD_2 = `---
name: test-skill-2
---

# Test Skill 2

## Capability Index

| User Need | Capability | Detailed Instructions |
|-----------|-----------|----------------------|
| Mint tokens | Mint ERC20 | [→ erc20.md#mint] |
| Verify source | Verify contract | [→ verify.md#verify] |
`;

describe("parseCapabilityRows", () => {
  it("extracts rows from Capability Index table", () => {
    const rows = parseCapabilityRows(FAKE_SKILL_MD, "test-skill");
    expect(rows).toHaveLength(2);
    expect(rows[0].userNeed).toBe("Deploy a thing");
    expect(rows[0].capability).toBe("Standard deploy");
    expect(rows[0].sourceSkill).toBe("test-skill");
  });

  it("returns empty array for SKILL.md with no Capability Index", () => {
    const rows = parseCapabilityRows("# No table here", "x");
    expect(rows).toHaveLength(0);
  });
});

describe("deduplicateRows", () => {
  it("removes duplicate capability entries (case-insensitive)", () => {
    const rows1 = parseCapabilityRows(FAKE_SKILL_MD, "skill-1");
    const rows2 = parseCapabilityRows(FAKE_SKILL_MD_2, "skill-2");
    const deduped = deduplicateRows([...rows1, ...rows2]);
    // "Verify contract" appears in both — should be deduped
    const verifyRows = deduped.filter((r) => r.capability.toLowerCase() === "verify contract");
    expect(verifyRows).toHaveLength(1);
    // Total: 3 unique capabilities
    expect(deduped).toHaveLength(3);
  });

  it("first occurrence wins on duplicate", () => {
    const rows1 = parseCapabilityRows(FAKE_SKILL_MD, "first-skill");
    const rows2 = parseCapabilityRows(FAKE_SKILL_MD_2, "second-skill");
    const deduped = deduplicateRows([...rows1, ...rows2]);
    const verifyRow = deduped.find((r) => r.capability.toLowerCase() === "verify contract");
    expect(verifyRow?.sourceSkill).toBe("first-skill");
  });
});

describe("mergeSkillMd", () => {
  it("produces a non-empty merged SKILL.md", () => {
    const merged = mergeSkillMd([
      { name: "skill-1", content: FAKE_SKILL_MD },
      { name: "skill-2", content: FAKE_SKILL_MD_2 },
    ]);
    expect(merged.length).toBeGreaterThan(100);
    expect(merged).toContain("## Capability Index");
  });

  it("no duplicate capability rows in merged output", () => {
    const merged = mergeSkillMd([
      { name: "skill-1", content: FAKE_SKILL_MD },
      { name: "skill-2", content: FAKE_SKILL_MD_2 },
    ]);
    const lines = merged.split("\n").filter((l) => l.startsWith("| ") && !l.startsWith("| User Need") && !l.startsWith("|---"));
    const capabilities = lines.map((l) => {
      const cols = l.split("|").slice(1, -1).map((c) => c.trim());
      return cols[1]?.toLowerCase();
    });
    const unique = new Set(capabilities);
    expect(unique.size).toBe(capabilities.length);
  });

  it("idempotent: running merge twice produces same result", () => {
    const installed = [
      { name: "skill-1", content: FAKE_SKILL_MD },
      { name: "skill-2", content: FAKE_SKILL_MD_2 },
    ];
    const merged1 = mergeSkillMd(installed);
    const merged2 = mergeSkillMd(installed);
    expect(merged1).toBe(merged2);
  });

  it("lists all source skills in generated output", () => {
    const merged = mergeSkillMd([
      { name: "skill-1", content: FAKE_SKILL_MD },
      { name: "skill-2", content: FAKE_SKILL_MD_2 },
    ]);
    expect(merged).toContain("skill-1");
    expect(merged).toContain("skill-2");
  });
});
