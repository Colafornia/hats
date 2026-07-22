import { Command } from "commander";
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { loadConfig, type Profile } from "../core/config.js";
import { getProfile } from "../core/profile.js";
import { assembleEnv } from "../core/env.js";
import { parseLaunch, runChild } from "../core/spawn.js";

function banner(profile: Profile, env: { configDir?: string; stripped: string[] }): void {
  const parts: string[] = [`🎩 ${profile.name}`];
  if (profile.desc) parts.push(profile.desc);
  parts.push(`config: ${env.configDir ?? "(default)"}`);
  if (env.stripped.length) parts.push(`stripped ${env.stripped.length}`);
  // eslint-disable-next-line no-console
  console.error(`\x1b[36m${parts.join(" · ")}\x1b[0m`);
}

function withHerdrHat(name: string, run: () => Promise<number>): Promise<number> {
  const paneId = process.env.HERDR_PANE_ID;
  if (!paneId) return run();

  const report = (event: "before" | "after") => {
    try {
      const metadata = event === "before" ? ["--token", `hat=${name}`] : ["--clear-token", "hat"];
      const child = spawn("herdr", ["pane", "report-metadata", paneId, "--source", "hats", ...metadata], {
        stdio: "ignore",
      });
      child.unref();
      const timer = setTimeout(() => child.kill(), 1_000);
      timer.unref();
      const done = () => clearTimeout(timer);
      child.once("error", done);
      child.once("exit", done);
    } catch {}
  };

  report("before");
  return run().finally(() => report("after"));
}

function reportTmuxHat(name?: string): void {
  const pane = process.env.TMUX && process.env.TMUX_PANE;
  if (!pane) return;

  const args = name
    ? ["set-option", "-p", "-t", pane, "@hats_profile", name]
    : ["set-option", "-p", "-u", "-t", pane, "@hats_profile"];
  try {
    spawnSync("tmux", args, { stdio: "ignore", timeout: 250, killSignal: "SIGKILL" });
  } catch {}
}

async function withTmuxHat(name: string, run: () => Promise<number>): Promise<number> {
  reportTmuxHat(name);
  try {
    return await run();
  } finally {
    reportTmuxHat();
  }
}

async function launch(
  profile: Profile,
  extraArgs: string[],
  override?: string[],
): Promise<number> {
  const { env, ...summary } = await assembleEnv(profile);
  if (summary.configDir) mkdirSync(summary.configDir, { recursive: true });
  banner(profile, { configDir: summary.configDir, stripped: summary.stripped });

  let argv: string[];
  if (override && override.length) {
    argv = override;
  } else if (profile.launch) {
    argv = parseLaunch(profile.launch);
  } else {
    throw new Error(`hat "${profile.name}" has no launch command`);
  }
  argv = [...argv, ...extraArgs];

  const run = () => runChild(argv, { env });
  return override ? run() : withHerdrHat(profile.name, () => withTmuxHat(profile.name, run));
}

export const runCommand = new Command("run")
  .description("isolate-launch a hat's command")
  .argument("<hat>", "hat name")
  .argument("[args...]", "extra args appended to the launch command")
  .allowUnknownOption()
  .action(async (name: string, args: string[]) => {
    const cfg = loadConfig(name);
    const profile = getProfile(cfg, name);
    const code = await launch(profile, args);
    process.exit(code);
  });

export const execCommand = new Command("exec")
  .description("run an arbitrary command with a hat's env (ignores launch)")
  .argument("<hat>", "hat name")
  .argument("[args...]", "command and its args (after --)")
  .allowUnknownOption()
  .action(async (name: string, args: string[]) => {
    const cfg = loadConfig(name);
    const profile = getProfile(cfg, name);
    if (!args.length) {
      // eslint-disable-next-line no-console
      console.error("exec requires a command. Usage: hats exec <hat> -- <cmd> [args...]");
      process.exit(2);
    }
    const code = await launch(profile, [], args);
    process.exit(code);
  });
