import { Command } from "commander";
import Table from "cli-table3";
import { loadConfig } from "../core/config.js";
import { describeForDisplay } from "../core/resolve.js";

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
    // sort: cli first, then gui; alpha within group
    entries.sort((a, b) => {
      const ka = a.kind ?? "cli";
      const kb = b.kind ?? "cli";
      if (ka !== kb) return ka === "cli" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    const table = new Table({
      head: ["name", "kind", "launch", "env (masked)", "inherit"],
      wordWrap: true,
    });
    for (const p of entries) {
      const envKeys = p.env ? Object.entries(p.env).map(([k, v]) => {
        const d = describeForDisplay(v);
        return d.isRef ? `${k}=****` : `${k}=${d.display}`;
      }) : [];
      table.push([
        p.name,
        p.kind ?? "cli",
        p.launch ?? "",
        envKeys.join(", ") || "—",
        String(p.inherit_env ?? cfg.settings.inherit_env ?? true),
      ]);
    }
    // eslint-disable-next-line no-console
    console.log(table.toString());
  });