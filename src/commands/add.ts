import { Command } from "commander";
import * as p from "@clack/prompts";
import { loadConfig, saveConfig, type Profile } from "../core/config.js";
import { profileNames } from "../core/profile.js";

export const addCommand = new Command("add")
  .description("interactively create a profile")
  .action(async () => {
    const cfg = loadConfig();
    const existing = new Set(profileNames(cfg));

    const group = await p.group({
      name: () =>
        p.text({
          message: "Profile name (e.g. company / kimi / ollama / personal)",
          validate: (v) => {
            if (!v.trim()) return "required";
            if (existing.has(v.trim())) return "already exists";
            if (!/^[A-Za-z0-9_-]+$/.test(v.trim())) return "letters, digits, _ or - only";
          },
        }),
      desc: () => p.text({ message: "Description (optional)", defaultValue: "" }),
      launch: () => p.text({ message: "Launch command (e.g. claude / ollama launch claude)", defaultValue: "" }),
      kind: () => p.select({
        message: "Kind",
        options: [
          { value: "cli", label: "cli" },
          { value: "gui", label: "gui" },
        ],
      }) as Promise<"cli" | "gui">,
      inheritEnv: () => p.confirm({ message: "Inherit current shell env?", initialValue: true }),
    });

    if (p.isCancel(group)) {
      p.cancel("cancelled");
      process.exit(1);
    }

    const envEntries: Record<string, string> = {};
    let addEnv = true;
    while (addEnv) {
      const key = await p.text({ message: "Env key (blank to stop adding)", defaultValue: "" });
      if (p.isCancel(key) || !key) { addEnv = false; break; }
      const val = await p.text({
        message: `Value for ${key} (plain text, or file:/cmd:/env: reference)`,
        validate: (v) => (v ? undefined : "required"),
      });
      if (p.isCancel(val)) break;
      envEntries[key] = val;
    }

    const envFile = await p.text({
      message: "env_file path (optional, blank to skip)",
      defaultValue: "",
    });

    const profile: Profile = {
      name: group.name as string,
      desc: (group.desc as string) || undefined,
      launch: (group.launch as string) || undefined,
      kind: group.kind,
      inherit_env: group.inheritEnv as boolean,
      env: Object.keys(envEntries).length ? envEntries : undefined,
      env_file: (envFile as string) || undefined,
    };

    cfg.profiles[profile.name] = profile;
    saveConfig(cfg);
    p.log.success(`created profile "${profile.name}"`);
  });