import { Command } from "commander";
import { loadConfig } from "../core/config.js";
import { getProfile } from "../core/profile.js";
import { describeForDisplay } from "../core/resolve.js";

export const whichCommand = new Command("which")
  .description("show what a profile would inject (secrets masked, cmd: not executed)")
  .argument("<profile>", "profile name")
  .action((name: string) => {
    const cfg = loadConfig();
    const profile = getProfile(cfg, name);

    const lines: string[] = [];
    lines.push(`profile: ${name}`);
    if (profile.desc) lines.push(`desc:    ${profile.desc}`);
    lines.push(`kind:    ${profile.kind ?? "cli"}`);
    if (profile.cwd) lines.push(`cwd:     ${profile.cwd}`);
    if (profile.launch) lines.push(`launch:  ${profile.launch}`);
    lines.push(`inherit: ${profile.inherit_env ?? cfg.settings.inherit_env ?? true}`);

    if (profile.env_file) {
      const files = Array.isArray(profile.env_file) ? profile.env_file : [profile.env_file];
      lines.push(`env_file: ${files.join(", ")}`);
    }

    if (profile.env && Object.keys(profile.env).length) {
      lines.push("");
      lines.push("env:");
      for (const [k, v] of Object.entries(profile.env)) {
        const d = describeForDisplay(v);
        const src = d.isRef ? `  (${d.source})` : "";
        lines.push(`  ${k} = ${d.display}${src}`);
      }
    } else {
      lines.push("env: (none — zero-injection profile)");
    }

    // eslint-disable-next-line no-console
    console.log(lines.join("\n"));
  });