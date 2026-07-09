import { Command } from "commander";
import Table from "cli-table3";
import { loadConfig } from "../core/config.js";

export const lsCommand = new Command("ls")
  .description("list all profiles")
  .action(() => {
    const cfg = loadConfig();
    const entries = Object.values(cfg.profiles);
    if (entries.length === 0) {
      // eslint-disable-next-line no-console
      console.log("No profiles yet. Run `hats add` to create one.");
      return;
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));

    // Bounded columns + wordWrap so a profile with many env keys wraps instead
    // of stretching the table past the terminal width.
    const table = new Table({
      head: ["name", "launch", "env keys"],
      wordWrap: true,
      colWidths: [14, 34, 40],
    });
    for (const p of entries) {
      // Summary view: never print values (a plaintext API key would otherwise
      // leak and blow up the column width). Show env_file paths + env key names;
      // use `hats which` for values (masked for anything that looks like a secret).
      const parts: string[] = [];
      if (p.env_file) {
        const files = Array.isArray(p.env_file) ? p.env_file : [p.env_file];
        parts.push(...files.map((f) => `env_file:${f}`));
      }
      if (p.env) parts.push(...Object.keys(p.env));
      table.push([p.name, p.launch ?? "", parts.join(", ") || "—"]);
    }
    // eslint-disable-next-line no-console
    console.log(table.toString());
  });