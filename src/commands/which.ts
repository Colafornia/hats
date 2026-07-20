import { Command } from "commander";
import { loadConfig } from "../core/config.js";
import { getProfile } from "../core/profile.js";
import { describeForDisplay } from "../core/resolve.js";
import { STRIP_PREFIXES } from "../core/env.js";

export const whichCommand = new Command("which")
  .description("show what a hat would inject (secrets masked, cmd: not executed)")
  .argument("<hat>", "hat name")
  .action((name: string) => {
    const cfg = loadConfig(name);
    const profile = getProfile(cfg, name);

    const lines: string[] = [];
    lines.push(`hat:     ${name}`);
    if (profile.desc) lines.push(`desc:    ${profile.desc}`);
    if (profile.launch) lines.push(`launch:  ${profile.launch}`);
    lines.push(`strips:  ${STRIP_PREFIXES.join(", ")} (from inherited env)`);

    if (profile.env_file) {
      const files = Array.isArray(profile.env_file) ? profile.env_file : [profile.env_file];
      lines.push(`env_file: ${files.join(", ")}`);
    }

    if (profile.env && Object.keys(profile.env).length) {
      lines.push("");
      lines.push("env:");
      for (const [k, v] of Object.entries(profile.env)) {
        const d = describeForDisplay(v, k);
        const src = d.isRef ? `  (${d.source})` : "";
        lines.push(`  ${k} = ${d.display}${src}`);
      }
    } else if (profile.env_file) {
      lines.push("env: (no inline keys — values come from env_file above)");
    } else {
      lines.push("env: (none — zero-injection hat)");
    }

    // eslint-disable-next-line no-console
    console.log(lines.join("\n"));
  });
