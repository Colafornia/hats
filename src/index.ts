#!/usr/bin/env node
import { Command } from "commander";
import { runCommand, execCommand, runInteractive } from "./commands/run.js";
import { whichCommand } from "./commands/which.js";
import { lsCommand } from "./commands/ls.js";
import { addCommand } from "./commands/add.js";
import { rmCommand } from "./commands/rm.js";
import { editCommand } from "./commands/edit.js";
import { initCommand } from "./commands/init.js";
import { setenvCommand } from "./commands/setenv.js";

const program = new Command();

program
  .name("hats")
  .description("per-terminal / per-process config isolator for Claude Code, Codex, and any CLI")
  .version("0.1.0")
  .action(() => {
    // bare `hats` → interactive picker
    void runInteractive();
  });

program.addCommand(runCommand);
program.addCommand(execCommand);
program.addCommand(whichCommand);
program.addCommand(lsCommand);
program.addCommand(addCommand);
program.addCommand(rmCommand);
program.addCommand(editCommand);
program.addCommand(initCommand);
program.addCommand(setenvCommand);

program.parseAsync(process.argv).catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  // eslint-disable-next-line no-console
  console.error(`hats: ${msg}`);
  process.exit(1);
});