import { Command, Option } from "commander";
import * as p from "@clack/prompts";
import { quote } from "shell-quote";
import { addProfile, loadConfig, type Profile } from "../core/config.js";
import {
  profileNames,
  resolveConfigHome,
  ProfileError,
  validateProfileName,
} from "../core/profile.js";
import { openConfigEditor } from "./edit.js";

/** Non-interactive: `hats add <name> <command...> [--isolated]`. */
function addPositional(name: string, command: string[], opts: { isolated?: boolean; home?: boolean }): void {
  const nameError = validateProfileName(name);
  if (nameError) {
    p.log.error(`invalid hat name: ${nameError}`);
    process.exit(1);
  }
  if (!command.length) command = [name];
  // Serialize argv back to a single launch string, re-quoting tokens that need it
  // (e.g. `--model "gpt 5"`) so parseLaunch() round-trips it to the same argv later.
  const launch = quote(command);
  const profile: Profile = { name, launch };
  const isolated = opts.isolated || opts.home;
  if (isolated) {
    const { varName, path } = resolveConfigHome(name, launch);
    profile.env = { [varName]: path };
  }
  const cfg = loadConfig(name);
  if (cfg.profiles[name]) {
    p.log.error(`hat "${name}" already exists`);
    process.exit(1);
  }
  addProfile(profile);
  p.log.success(`created hat "${name}"${isolated ? ` · config: ${profile.env && Object.values(profile.env)[0]}` : ""}`);
  p.log.info(`next: hats ${name}`);
}

/** Thin interactive wizard: 3 questions + optional "open editor to add env". */
async function addInteractive(): Promise<void> {
  const cfg = loadConfig(false);
  const existing = new Set(profileNames(cfg));

  const name = await p.text({
    message: "Hat name",
    validate: (v) => {
      const t = v.trim();
      if (!t) return "required";
      if (existing.has(t)) return "already exists";
      return validateProfileName(t);
    },
  });
  if (p.isCancel(name)) return p.cancel("cancelled");

  const launch = await p.text({
    message: "Launch command (e.g. codex / claude / ollama launch claude)",
    validate: (v) => (v.trim() ? undefined : "required"),
  });
  if (p.isCancel(launch)) return p.cancel("cancelled");

  let useHome = false;
  try {
    // Probe inference first so we can warn early if isolation won't work for this launch.
    resolveConfigHome(name as string, launch as string);
    const ans = await p.confirm({ message: "Use an isolated CLI config home?", initialValue: false });
    if (p.isCancel(ans)) return p.cancel("cancelled");
    useHome = ans;
  } catch (e) {
    if (e instanceof ProfileError) {
      p.log.warn(`skipping isolated home: ${e.message}`);
    } else {
      throw e;
    }
  }

  const profile: Profile = { name: name as string, launch: launch as string };
  if (useHome) {
    const { varName, path } = resolveConfigHome(name as string, launch as string);
    profile.env = { [varName]: path };
  }
  addProfile(profile);
  p.log.success(`created hat "${profile.name}"`);

  const editNow = await p.confirm({ message: "Open config to add env vars now?", initialValue: false });
  if (p.isCancel(editNow)) return;
  if (editNow) openConfigEditor();
}

export const addCommand = new Command("add")
  .description("create a hat: `hats add <name> [command...] [--isolated]` (or bare `hats add` for a thin wizard)")
  .argument("[name]", "hat name")
  .argument("[command...]", "launch command (variadic)")
  .option("--isolated", "give this hat its own supported CLI config home")
  .addOption(new Option("--home", "alias for --isolated").hideHelp())
  .allowUnknownOption() // let launch flags (e.g. --model) pass through into the variadic command
  .action(async (name: string | undefined, command: string[], opts: { isolated?: boolean; home?: boolean }) => {
    if (name === undefined) await addInteractive();
    else addPositional(name, command, opts);
  });
