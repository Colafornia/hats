import { Command } from "commander";
import * as p from "@clack/prompts";
import { readFileSync } from "node:fs";
import { parse as parseDotenv } from "dotenv";
import { loadConfig, saveConfig, type Profile } from "../core/config.js";
import { resolveConfigHome } from "../core/profile.js";
import { describeForDisplay } from "../core/resolve.js";

export const setenvCommand = new Command("setenv")
  .description("batch-merge env keys for a profile from KEY=value lines (stdin or --file)")
  .argument("<profile>", "profile name (created if missing)")
  .option("-f, --file <path>", "read KEY=value lines from this file instead of stdin")
  .option("--launch <cmd>", "also set the profile's launch command")
  .option("--home", "also inject the inferred config-home var (CODEX_HOME/CLAUDE_CONFIG_DIR/GEMINI_CLI_HOME)")
  .action((name: string, opts: { file?: string; launch?: string; home?: boolean }) => {
    let content: string;
    if (opts.file) {
      content = readFileSync(opts.file, "utf8");
    } else if (process.stdin.isTTY) {
      p.log.error(
        "No env input. Use:\n" + "  hats setenv <profile> --file .env\n" + "or:\n" + "  hats edit",
      );
      process.exit(1);
    } else {
      // fd 0 = stdin. readFileSync works for pipes/heredocs; non-pipe fds may
      // throw EAGAIN, which we treat as "no input".
      try {
        content = readFileSync(0, "utf8");
      } catch {
        content = "";
      }
    }

    const parsed = parseDotenv(content) as Record<string, string>;
    // `--home` alone (no KEY=value lines) is allowed; otherwise need at least one key.
    const hasInput = Object.keys(parsed).length > 0;
    if (!hasInput && !opts.home && !opts.launch) {
      p.log.warn("no KEY=value lines found");
      return;
    }

    const cfg = loadConfig();
    let profile: Profile = cfg.profiles[name];
    if (!profile) {
      profile = { name };
      cfg.profiles[name] = profile;
    }
    if (opts.launch) profile.launch = opts.launch;

    const merged: string[] = [];
    if (hasInput) {
      profile.env = { ...(profile.env ?? {}), ...parsed };
      merged.push(...Object.keys(parsed).map((k) => `  ${k} = ${describeForDisplay(parsed[k], k).display}`));
    }
    if (opts.home) {
      const { varName, path } = resolveConfigHome(name, profile.launch);
      profile.env = { ...(profile.env ?? {}), [varName]: path };
      merged.push(`  ${varName} = ${path}`);
    }
    saveConfig(cfg);

    p.log.success(`updated "${name}"${opts.launch ? ` (launch=${opts.launch})` : ""}:\n${merged.join("\n")}`);
  });