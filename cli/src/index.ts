#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { checkbox, select } from "@inquirer/prompts";
import { homedir } from "os";
import { SKILLS, resolveDependencies, resolveAll } from "./registry.js";
import { installSkills } from "./install.js";
import { resolve } from "path";

const program = new Command();

program
  .name("pharos-skills")
  .description("Install Pharos Skills into your project")
  .version("1.0.0");

// ── list ──────────────────────────────────────────────────────────────────────

program
  .command("list")
  .description("List all available skills")
  .action(() => {
    console.log(chalk.bold("\nAvailable Pharos Skills\n"));
    console.log(chalk.dim("─".repeat(60)));

    for (const [name, meta] of Object.entries(SKILLS)) {
      const deps = meta.dependsOn.length
        ? chalk.dim(` (deps: ${meta.dependsOn.join(", ")})`)
        : "";
      console.log(`  ${chalk.cyan(name)}${deps}`);
      console.log(`    ${meta.description}`);
      console.log();
    }

    console.log(chalk.dim("Add a skill: pharos-skills add <skill>"));
  });

// ── info ──────────────────────────────────────────────────────────────────────

program
  .command("info <skill>")
  .description("Show skill details and dependencies")
  .action((skillName: string) => {
    const meta = SKILLS[skillName];
    if (!meta) {
      console.error(chalk.red(`Unknown skill: "${skillName}"`));
      console.error(chalk.dim('Run "pharos-skills list" to see available skills.'));
      process.exit(1);
    }

    console.log(chalk.bold(`\n${meta.name}`));
    console.log(chalk.dim("─".repeat(60)));
    console.log(`Description: ${meta.description}`);
    console.log(`Keywords:    ${meta.keywords.join(", ")}`);

    if (meta.dependsOn.length) {
      console.log(`\nDirect dependencies:`);
      meta.dependsOn.forEach((d) => console.log(`  - ${d}`));
    } else {
      console.log(`\nDependencies: none`);
    }

    try {
      const resolved = resolveDependencies(skillName);
      console.log(`\nFull install order (with transitive deps):`);
      resolved.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
    } catch (e) {
      console.error(chalk.red(`Dependency error: ${(e as Error).message}`));
    }

    console.log(chalk.dim(`\nInstall: pharos-skills add ${skillName}`));
  });

// ── add ───────────────────────────────────────────────────────────────────────

program
  .command("add <skill>")
  .description("Install a skill (and its dependencies) into your project")
  .option("--dir <path>", "Target directory (skips scope prompt)")
  .option("-y, --yes", "Skip prompts, use defaults (local, all editors)")
  .action(async (skillName: string, opts: { dir?: string; yes?: boolean }) => {
    if (!SKILLS[skillName]) {
      console.error(chalk.red(`Unknown skill: "${skillName}"`));
      console.error(chalk.dim('Run "pharos-skills list" to see available skills.'));
      process.exit(1);
    }

    const isInteractive = process.stdin.isTTY && !opts.yes;

    if (isInteractive) {
      console.log(chalk.dim("  ↑↓ move   space select/deselect   enter confirm\n"));
    }

    // ── Prompt: editors ───────────────────────────────────────────────────────
    let editors: string[] = ["all"];
    if (isInteractive) {
      editors = await checkbox({
        message: "Which AI code editors are you targeting?",
        choices: [
          { name: "Claude Code", value: "claude-code", checked: true },
          { name: "Cursor", value: "cursor" },
          { name: "opencode", value: "opencode" },
          { name: "Windsurf", value: "windsurf" },
          { name: "Other / all", value: "other" },
        ],
        validate: (ans) => ans.length > 0 || "Select at least one.",
      });
    }

    // ── Prompt: scope (skip if --dir was explicitly provided) ─────────────────
    let scope: "local" | "global" = "local";
    if (isInteractive && !opts.dir) {
      scope = await select({
        message: "Install scope?",
        choices: [
          {
            name: "Local  — this project only",
            value: "local",
            description: "Installs into .pharos/ in the current directory",
          },
          {
            name: "Global — all projects",
            value: "global",
            description: `Installs into ~/.pharos/ (${homedir()}/.pharos/)`,
          },
        ],
      });
    }

    const targetDir =
      opts.dir
        ? resolve(opts.dir)
        : scope === "global"
          ? homedir()
          : resolve(".");

    // ── Resolve deps ──────────────────────────────────────────────────────────
    let resolved: string[];
    try {
      resolved = resolveDependencies(skillName);
    } catch (e) {
      console.error(chalk.red((e as Error).message));
      process.exit(1);
    }

    console.log(chalk.bold(`\nInstalling ${skillName}\n`));
    console.log(`Install order:`);
    resolved.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
    console.log();

    try {
      await installSkills(resolved, targetDir, { global: scope === "global", editors });
      console.log(chalk.green(`\n✓ Done!`));
      console.log(
        chalk.dim(
          `  Skills: ${resolved.join(", ")}\n` +
          `  Location: ${targetDir}${scope === "global" ? "/.pharos/" : "/.pharos/"}`
        )
      );
    } catch (e) {
      console.error(chalk.red(`Installation failed: ${(e as Error).message}`));
      process.exit(1);
    }
  });

// ── add-all ───────────────────────────────────────────────────────────────────

program
  .command("add-all")
  .description("Install all available skills (and their dependencies)")
  .option("--dir <path>", "Target directory (skips scope prompt)")
  .option("-y, --yes", "Skip prompts, use defaults (local, all editors)")
  .action(async (opts: { dir?: string; yes?: boolean }) => {
    const isInteractive = process.stdin.isTTY && !opts.yes;

    if (isInteractive) {
      console.log(chalk.dim("  ↑↓ move   space select/deselect   enter confirm\n"));
    }

    // ── Prompt: editors ───────────────────────────────────────────────────────
    let editors: string[] = ["all"];
    if (isInteractive) {
      editors = await checkbox({
        message: "Which AI code editors are you targeting?",
        choices: [
          { name: "Claude Code", value: "claude-code", checked: true },
          { name: "Cursor", value: "cursor" },
          { name: "opencode", value: "opencode" },
          { name: "Windsurf", value: "windsurf" },
          { name: "Other / all", value: "other" },
        ],
        validate: (ans) => ans.length > 0 || "Select at least one.",
      });
    }

    // ── Prompt: scope ─────────────────────────────────────────────────────────
    let scope: "local" | "global" = "local";
    if (isInteractive && !opts.dir) {
      scope = await select({
        message: "Install scope?",
        choices: [
          {
            name: "Local  — this project only",
            value: "local",
            description: "Installs into .pharos/ in the current directory",
          },
          {
            name: "Global — all projects",
            value: "global",
            description: `Installs into ~/.pharos/ (${homedir()}/.pharos/)`,
          },
        ],
      });
    }

    const targetDir = opts.dir
      ? resolve(opts.dir)
      : scope === "global"
        ? homedir()
        : resolve(".");

    const resolved = resolveAll();

    console.log(chalk.bold(`\nInstalling all ${resolved.length} skills\n`));
    resolved.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
    console.log();

    try {
      await installSkills(resolved, targetDir, { global: scope === "global", editors });
      console.log(chalk.green(`\n✓ Done!`));
      console.log(
        chalk.dim(
          `  Skills: ${resolved.join(", ")}\n` +
          `  Location: ${targetDir}/.pharos/`
        )
      );
    } catch (e) {
      console.error(chalk.red(`Installation failed: ${(e as Error).message}`));
      process.exit(1);
    }
  });

program.parse();
