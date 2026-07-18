import { Command } from "commander";
import * as p from "@clack/prompts";
import { loadConfig, saveConfig } from "../core/config.js";

export const rmCommand = new Command("rm")
  .description("delete a profile (referenced .env / files are left untouched)")
  .argument("<profile>", "profile name")
  .action(async (name: string) => {
    const cfg = loadConfig();
    if (!cfg.profiles[name]) {
      // eslint-disable-next-line no-console
      console.error(`profile "${name}" not found`);
      process.exit(1);
    }
    const confirmed = await p.confirm({ message: `Delete profile "${name}"? (referenced files are kept)`, initialValue: false });
    if (p.isCancel(confirmed) || !confirmed) return p.cancel("cancelled");
    delete cfg.profiles[name];
    saveConfig(cfg);
    p.log.success(`deleted profile "${name}"`);
  });
