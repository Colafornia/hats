import { Command } from "commander";
import { spawnSync } from "node:child_process";
import { configPath } from "../core/config.js";

export const editCommand = new Command("edit")
  .description("open the hats config in $EDITOR")
  .action(() => {
    const editor = process.env.EDITOR || "vi";
    const file = configPath();
    const result = spawnSync(editor, [file], { stdio: "inherit" });
    process.exit(result.status ?? 0);
  });