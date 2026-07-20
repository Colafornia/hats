import { Command } from "commander";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { COMMANDS } from "./commands/index.js";
import { friendlyHint } from "./commands/hint.js";
import { loadConfig } from "./core/config.js";
import { BUILTIN_NAMES } from "./core/builtins.js";

const program = new Command();

// Version: read from the adjacent package.json when available (works under
// tsx and the dist/ bundle). Under a Bun `--compile` binary there is no
// package.json next to the executable, so fall back to HATS_VERSION, which
// the release workflow bakes in at compile time via `--define`.
function readVersion(): string {
  try {
    return JSON.parse(
      readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "package.json"), "utf8"),
    ).version as string;
  } catch {
    return process.env.HATS_VERSION ?? "0.0.0-dev";
  }
}
const pkgVersion = readVersion();

program
  .name("hats")
  .description("per-terminal / per-process config isolator for Claude Code, Codex, and any CLI")
  .version(pkgVersion)
  .version(pkgVersion, "-v");

for (const command of COMMANDS) program.addCommand(command);

const argv = process.argv.slice();
const first = argv[2];
if (first && !first.startsWith("-") && !BUILTIN_NAMES.includes(first) && loadConfig(false).profiles[first]) {
  argv.splice(2, 0, "run");
}

const parse = argv.length === 2 ? (friendlyHint(), Promise.resolve()) : program.parseAsync(argv);
parse.catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`hats: ${msg}`);
  process.exit(1);
});
