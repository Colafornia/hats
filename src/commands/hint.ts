import { loadConfig } from "../core/config.js";

/**
 * Friendly summary shown for bare `hats` when profiles already exist.
 * (When there are no profiles, the index action routes to `guideFirstRun`.)
 */
export function friendlyHint(): void {
  const cfg = loadConfig();
  const names = Object.keys(cfg.profiles);
  const c = (s: string) => `\x1b[36m${s}\x1b[0m`;
  const lines: string[] = [];

  lines.push(`${c("🎩 hats")} — switch CLI configs per-terminal without polluting your shell.`);
  lines.push("");
  lines.push(`${c("Your profiles:")}`);
  for (const n of names) {
    const p = cfg.profiles[n];
    const d = p.desc ? ` — ${p.desc}` : "";
    lines.push(`  ${n}${d}`);
  }
  lines.push("");
  lines.push(`${c("Run one:")}    hats run <profile>`);
  lines.push(`${c("Pick one:")}   hats pick`);
  lines.push(`${c("Inspect:")}    hats which <profile>   ·   ${c("list:")} hats ls`);
  lines.push("");
  lines.push(`Full command list: ${c("hats -h")}`);
  // eslint-disable-next-line no-console
  console.log(lines.join("\n"));
}