#!/usr/bin/env node
import { Command } from "commander";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { runCommand, execCommand, pickCommand } from "./commands/run.js";
import { whichCommand } from "./commands/which.js";
import { lsCommand } from "./commands/ls.js";
import { addCommand } from "./commands/add.js";
import { rmCommand } from "./commands/rm.js";
import { editCommand } from "./commands/edit.js";
import { initCommand } from "./commands/init.js";
import { setenvCommand } from "./commands/setenv.js";
import { friendlyHint } from "./commands/hint.js";
import { guideFirstRun } from "./commands/guide.js";
import { loadConfig } from "./core/config.js";

const program = new Command();

// Single source of truth for the version: package.json. Resolved relative to
// this file so it works under both tsx (src/) and the built bundle (dist/).
const pkgVersion: string = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "package.json"), "utf8"),
).version;

program
  .name("hats")
  .description("per-terminal / per-process config isolator for Claude Code, Codex, and any CLI")
  .version(pkgVersion)
  .action(() => {
    // bare `hats`: guide onboarding when there are no profiles, else a friendly summary
    const cfg = loadConfig();
    if (Object.keys(cfg.profiles).length === 0) {
      void guideFirstRun();
    } else {
      friendlyHint();
    }
  });

program.addCommand(runCommand);
program.addCommand(execCommand);
program.addCommand(pickCommand);
program.addCommand(whichCommand);
program.addCommand(lsCommand);
program.addCommand(addCommand);
program.addCommand(setenvCommand);
program.addCommand(initCommand);
program.addCommand(rmCommand);
program.addCommand(editCommand);

program.parseAsync(process.argv).catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  // eslint-disable-next-line no-console
  console.error(`hats: ${msg}`);
  process.exit(1);
});