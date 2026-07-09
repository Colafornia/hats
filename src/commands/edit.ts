import { Command } from "commander";
import { spawnSync } from "node:child_process";
import { configPath } from "../core/config.js";

/** Open the hats config in $EDITOR (inherit stdio). Exits the process with the editor's status. */
export function openConfigEditor(): void {
  const editor = process.env.EDITOR || "vi";
  const result = spawnSync(editor, [configPath()], { stdio: "inherit" });
  process.exit(result.status ?? 0);
}

export const editCommand = new Command("edit")
  .description("open the hats config in $EDITOR")
  .action(() => {
    openConfigEditor();
  });