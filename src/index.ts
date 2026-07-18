#!/usr/bin/env node
import { loadConfig } from "./core/config.js";

const BUILTINS = ["run", "exec", "which", "ls", "add", "setenv", "init", "rm", "edit"];
const FLAGS: Record<string, string[]> = {
  add: ["--isolated"],
  setenv: ["--file", "--launch", "--isolated"],
};

if (process.argv[2] === "__complete") {
  try {
    const position = Number(process.argv[3]);
    const profiles = Object.keys(loadConfig().profiles);
    let candidates =
      position === 0
        ? [...BUILTINS, ...profiles]
        : position === 1 && ["run", "exec", "which", "rm", "setenv"].includes(process.argv[4])
          ? profiles
          : [];
    const command = process.argv[4];
    if (position > 0 && FLAGS[command]) candidates = [...candidates, ...FLAGS[command]];
    if (candidates.length) process.stdout.write(candidates.join("\n") + "\n");
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
  }
  process.exit(0);
}

await import("./cli.js");
