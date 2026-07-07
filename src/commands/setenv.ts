import { Command } from "commander";
import * as p from "@clack/prompts";
import { readFileSync } from "node:fs";
import { parse as parseDotenv } from "dotenv";
import { loadConfig, saveConfig, type Profile } from "../core/config.js";
import { describeForDisplay } from "../core/resolve.js";

export const setenvCommand = new Command("setenv")
  .description("batch-set env keys for a profile from KEY=value lines (stdin or --file)")
  .argument("<profile>", "profile name (created if missing)")
  .option("-f, --file <path>", "read KEY=value lines from this file instead of stdin")
  .option("--launch <cmd>", "also set the profile's launch command")
  .action((name: string, opts: { file?: string; launch?: string }) => {
    let content: string;
    if (opts.file) {
      content = readFileSync(opts.file, "utf8");
    } else if (process.stdin.isTTY) {
      p.log.error(
        "no --file given and stdin is a terminal. Pipe a block, e.g.:\n" +
          '  hats setenv <profile> <<\'EOF\'\n' +
          "  ANTHROPIC_BASE_URL=https://...\n" +
          "  ANTHROPIC_AUTH_TOKEN=file:~/.config/hats/x.token\n" +
          "  EOF",
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
    const keys = Object.keys(parsed);
    if (!keys.length) {
      p.log.warn("no KEY=value lines found");
      return;
    }

    const cfg = loadConfig();
    let profile: Profile = cfg.profiles[name];
    if (!profile) {
      profile = { name };
      cfg.profiles[name] = profile;
    }
    profile.env = { ...(profile.env ?? {}), ...parsed };
    if (opts.launch) profile.launch = opts.launch;
    saveConfig(cfg);

    const summary = keys.map((k) => `  ${k} = ${describeForDisplay(parsed[k]).display}`).join("\n");
    p.log.success(`set ${keys.length} key(s) on "${name}"${opts.launch ? ` (launch=${opts.launch})` : ""}:\n${summary}`);
  });