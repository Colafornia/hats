import { homedir } from "node:os";
import { join } from "node:path";
import { hatsHome, type HatsConfig, type Profile } from "./config.js";

export class ProfileError extends Error {}

/** Which env var carries a tool's isolated config home, keyed by launch first-token. */
export const CONFIG_HOME_BY_TOOL: Record<string, string> = {
  codex: "CODEX_HOME",
  claude: "CLAUDE_CONFIG_DIR",
  gemini: "GEMINI_CLI_HOME",
};

/** First whitespace-delimited token of a launch string (no shell parsing). */
export function launchFirstToken(launch: string | undefined): string | undefined {
  if (!launch) return undefined;
  const t = launch.trim().split(/\s+/)[0];
  return t || undefined;
}

/** Render an absolute path as `~`-prefixed when it lives under $HOME (nicer in config). */
function tildeify(absPath: string): string {
  const home = homedir();
  if (absPath === home) return "~";
  if (home && absPath.startsWith(home + "/")) return "~" + absPath.slice(home.length);
  return absPath;
}

export interface ConfigHome {
  /** Env var name to set, e.g. CODEX_HOME. */
  varName: string;
  /** Value to set, tilde-prefixed when under $HOME, e.g. ~/.config/hats/homes/codex-personal. */
  path: string;
}

/**
 * Resolve the isolated config home for a profile: var name inferred from the
 * launch command's first token (codex/claude/gemini), path under HATS_HOME/homes/<name>.
 * Throws ProfileError if the first token isn't a known tool — caller should let the user
 * set the env var manually instead of guessing.
 */
export function resolveConfigHome(name: string, launch: string | undefined): ConfigHome {
  const first = launchFirstToken(launch);
  const varName = first ? CONFIG_HOME_BY_TOOL[first] : undefined;
  if (!varName) {
    throw new ProfileError(
      `--home only works when launch starts with codex, claude, or gemini ` +
        `(got "${first ?? "(none)"}"). Set it manually, e.g. ` +
        `env = { CODEX_HOME = "~/.config/hats/homes/${name}" }`,
    );
  }
  return { varName, path: tildeify(join(hatsHome(), "homes", name)) };
}

export function getProfile(cfg: HatsConfig, name: string): Profile {
  const p = cfg.profiles[name];
  if (!p) throw new ProfileError(`profile "${name}" not found`);
  return p;
}

export function profileNames(cfg: HatsConfig): string[] {
  return Object.keys(cfg.profiles);
}

export function validateProfile(p: Profile): string[] {
  const errs: string[] = [];
  if (!p.name) errs.push("name is required");
  if (p.env) {
    for (const [k, v] of Object.entries(p.env)) {
      if (typeof v !== "string") errs.push(`env.${k} must be a string`);
    }
  }
  return errs;
}