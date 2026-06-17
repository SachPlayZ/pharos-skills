#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { SKILLS, resolveDependencies } from "./registry.js";
import { installSkills, listInstalled } from "./install.js";
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

    console.log(
      chalk.dim(
        'Add a skill: pharos-skills add <skill> [--dir .] [--network testnet|mainnet]'
      )
    );
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

    console.log(
      chalk.dim(`\nInstall: pharos-skills add ${skillName}`)
    );
  });

// ── add ───────────────────────────────────────────────────────────────────────

program
  .command("add <skill>")
  .description("Install a skill (and its dependencies) into your project")
  .option("--dir <path>", "Target directory", ".")
  .option("--network <net>", "testnet or mainnet", "testnet")
  .action(async (skillName: string, opts: { dir: string; network: string }) => {
    if (!SKILLS[skillName]) {
      console.error(chalk.red(`Unknown skill: "${skillName}"`));
      console.error(chalk.dim('Run "pharos-skills list" to see available skills.'));
      process.exit(1);
    }

    if (opts.network !== "testnet" && opts.network !== "mainnet") {
      console.error(chalk.red(`--network must be "testnet" or "mainnet"`));
      process.exit(1);
    }

    if (opts.network === "mainnet") {
      console.warn(
        chalk.yellow(
          "\n⚠️  MAINNET selected. All operations use real value on Pacific Mainnet (chainId 1672).\n" +
          "   Every write transaction will require explicit confirmation.\n"
        )
      );
    }

    const targetDir = resolve(opts.dir);

    let resolved: string[];
    try {
      resolved = resolveDependencies(skillName);
    } catch (e) {
      console.error(chalk.red((e as Error).message));
      process.exit(1);
    }

    console.log(chalk.bold(`\nInstalling ${skillName} into ${targetDir}\n`));
    console.log(`Install order:`);
    resolved.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
    console.log();

    try {
      await installSkills(resolved, targetDir, opts.network as "testnet" | "mainnet");
      console.log(chalk.green(`\n✓ Installation complete!`));
      console.log(
        chalk.dim(
          `  Skills installed: ${resolved.join(", ")}\n` +
          `  Location: ${targetDir}/.pharos/`
        )
      );
    } catch (e) {
      console.error(chalk.red(`Installation failed: ${(e as Error).message}`));
      process.exit(1);
    }
  });

program.parse();
