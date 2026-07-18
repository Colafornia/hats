import { loadConfig } from "../core/config.js";

/**
 * Non-interactive summary for bare `hats` (no subcommand). When there are no
 * profiles, hint at the first-run commands; otherwise list profiles and hint at
 * `hats run <name>`. No interactive picker — switching is always an explicit
 * `hats run <name>`.
 */
export function friendlyHint(): void {
  const cfg = loadConfig();
  const names = Object.keys(cfg.profiles);
  const c = (s: string) => `\x1b[36m${s}\x1b[0m`;
  const lines: string[] = [];

  lines.push(`${c("🎩 hats")} — switch CLI configs per-terminal without polluting your shell.`);
  lines.push("");

  if (names.length === 0) {
    lines.push(`No hats yet. Create one:`);
    lines.push(`  ${c("hats add")}                       thin interactive wizard`);
    lines.push(`  ${c("hats add <name> <cmd> [--isolated]")}  non-interactive`);
    lines.push(`  ${c("hats init")}                      write an example config to copy from`);
  } else {
    lines.push(`${c("Your hats:")}`);
    for (const n of names) {
      const p = cfg.profiles[n];
      const d = p.desc ? ` — ${p.desc}` : "";
      lines.push(`  ${n}${d}`);
    }
    lines.push("");
    lines.push(`${c("Run one:")}   hats <name>`);
    lines.push(`${c("Inspect:")}   hats which <name>   ·   ${c("list:")} hats ls`);
  }

  lines.push("");
  lines.push(`Full command list: ${c("hats -h")}`);
  // eslint-disable-next-line no-console
  console.log(lines.join("\n"));
}
