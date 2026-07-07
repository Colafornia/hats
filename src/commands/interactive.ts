import * as p from "@clack/prompts";
import type { HatsConfig } from "../core/config.js";
import { profileNames } from "../core/profile.js";

/** Interactive profile picker; returns the chosen name or null if cancelled. */
export async function pickProfileInteractive(cfg: HatsConfig): Promise<string | null> {
  const names = profileNames(cfg);
  if (names.length === 0) {
    p.log.warn("No profiles yet. Run `hats add` to create one.");
    return null;
  }
  const options = names.map((n) => {
    const prof = cfg.profiles[n];
    const desc = prof?.desc ? ` — ${prof.desc}` : "";
    return { value: n, label: `${n}${desc}` };
  });
  const res = await p.select({
    message: "Pick a hat to wear",
    options,
  });
  if (p.isCancel(res)) {
    p.cancel("cancelled");
    return null;
  }
  return res as string;
}