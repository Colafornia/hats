import { Command } from "commander";
import { loadConfig, type Profile, type Settings } from "../core/config.js";
import { getProfile } from "../core/profile.js";
import { assembleEnv } from "../core/env.js";
import { parseLaunch, runChild } from "../core/spawn.js";
import { expandTilde } from "../core/resolve.js";
import { pickProfileInteractive } from "./interactive.js";

function banner(profile: Profile, env: { clean: boolean; configDir?: string }): void {
  const parts: string[] = [`🎩 ${profile.name}`];
  if (profile.desc) parts.push(profile.desc);
  parts.push(env.clean ? "clean env" : "inheriting env");
  if (env.configDir) parts.push(`config: ${env.configDir}`);
  // eslint-disable-next-line no-console
  console.error(`\x1b[36m${parts.join(" · ")}\x1b[0m`);
}

async function launch(
  profile: Profile,
  settings: Settings,
  extraArgs: string[],
  override?: string[],
): Promise<number> {
  const { env, ...summary } = await assembleEnv(profile, settings);
  banner(profile, { clean: summary.clean, configDir: summary.configDir });

  let argv: string[];
  if (override && override.length) {
    argv = override;
  } else if (profile.launch) {
    argv = parseLaunch(profile.launch);
  } else {
    throw new Error(`profile "${profile.name}" has no launch command`);
  }
  argv = [...argv, ...extraArgs];

  const cwd = profile.cwd ? expandTilde(profile.cwd) : undefined;
  return runChild(argv, { env, cwd });
}

export const runCommand = new Command("run")
  .description("isolate-launch a profile's command")
  .argument("<profile>", "profile name")
  .argument("[args...]", "extra args appended to the launch command")
  .allowUnknownOption()
  .action(async (name: string, args: string[]) => {
    const cfg = loadConfig();
    const profile = getProfile(cfg, name);
    const code = await launch(profile, cfg.settings, args);
    process.exit(code);
  });

export const execCommand = new Command("exec")
  .description("run an arbitrary command with a profile's env (ignores launch)")
  .argument("<profile>", "profile name")
  .argument("[args...]", "command and its args (after --)")
  .allowUnknownOption()
  .action(async (name: string, args: string[]) => {
    const cfg = loadConfig();
    const profile = getProfile(cfg, name);
    if (!args.length) {
      // eslint-disable-next-line no-console
      console.error("exec requires a command. Usage: hats exec <profile> -- <cmd> [args...]");
      process.exit(2);
    }
    const code = await launch(profile, cfg.settings, [], args);
    process.exit(code);
  });

/** Bare `hats` (no subcommand) → interactive picker → run. */
export async function runInteractive(): Promise<void> {
  const cfg = loadConfig();
  const name = await pickProfileInteractive(cfg);
  if (!name) return;
  const profile = getProfile(cfg, name);
  const code = await launch(profile, cfg.settings, []);
  process.exit(code);
}