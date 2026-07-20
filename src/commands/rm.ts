import { Command } from "commander";
import * as p from "@clack/prompts";
import { loadConfig, removeProfile } from "../core/config.js";

export function isRemovalConfirmed(value: unknown): value is true {
  return !p.isCancel(value) && value === true;
}

export const rmCommand = new Command("rm")
  .description("delete a hat (referenced .env / files are left untouched)")
  .argument("<hat>", "hat name")
  .action(async (name: string) => {
    const cfg = loadConfig(name);
    if (!cfg.profiles[name]) {
      // eslint-disable-next-line no-console
      console.error(`hat "${name}" not found`);
      process.exit(1);
    }
    const confirmed = await p.confirm({ message: `Delete hat "${name}"? (referenced files are kept)`, initialValue: false });
    if (!isRemovalConfirmed(confirmed)) return p.cancel("cancelled");
    removeProfile(name);
    p.log.success(`deleted hat "${name}"`);
  });
