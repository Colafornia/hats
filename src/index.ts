#!/usr/bin/env node
import { loadConfig } from "./core/config.js";
import { BUILTIN_COMMANDS, BUILTIN_NAMES, COMPLETE_COMMAND } from "./core/builtins.js";

if (process.argv[2] === COMPLETE_COMMAND) {
  try {
    const position = Number(process.argv[3]);
    const profiles = Object.keys(loadConfig(false).profiles);
    const command = BUILTIN_COMMANDS[process.argv[4]];
    let candidates =
      position === 0
        ? [...BUILTIN_NAMES, ...profiles]
        : position === 1 && command?.completesHat
          ? profiles
          : [];
    if (position > 0 && command?.flags) candidates = [...candidates, ...command.flags];
    if (candidates.length) process.stdout.write(candidates.join("\n") + "\n");
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
  }
  process.exit(0);
}

await import("./cli.js");
