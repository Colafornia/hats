import { homedir } from "node:os";
import { join } from "node:path";
import { hatsHome, type HatsConfig, type Profile } from "./config.js";
import { CredentialStorage, TOOLS } from "./tools.js";

export class ProfileError extends Error {}

export const RESERVED_NAMES = new Set(["run", "exec", "which", "ls", "add", "setenv", "init", "rm", "edit"]);

export function validateProfileName(name: string): string | undefined {
  if (!/^[A-Za-z0-9_-]+$/.test(name)) return "letters, digits, _ or - only";
  if (RESERVED_NAMES.has(name)) return `"${name}" is a reserved command name`;
}

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
 * Resolve a supported isolated config home from the launch command's first token.
 * Shared credential stores fail with a manual recipe instead of pretending credentials move.
 */
export function resolveConfigHome(name: string, launch: string | undefined): ConfigHome {
  const first = launchFirstToken(launch);
  const tool = first ? TOOLS[first] : undefined;
  if (!tool) {
    throw new ProfileError(
      `--isolated only works for a known tool (got "${first ?? "(none)"}"). ` +
        `Use env injection for other CLIs.`,
    );
  }
  if (tool.credentialStorage === CredentialStorage.FixedKeychain) {
    throw new ProfileError(
      "credentials live in a fixed keychain entry; isolate manually with " +
        'env = { GEMINI_CLI_HOME = "...", GEMINI_FORCE_FILE_STORAGE = "true" }',
    );
  }
  if (tool.credentialStorage === CredentialStorage.ExternalData) {
    throw new ProfileError(
      "credentials live outside the config home (XDG data); use env injection instead — provider keys are env-driven",
    );
  }
  return { varName: tool.homeVar as string, path: tildeify(join(hatsHome(), "homes", name)) };
}

export function getProfile(cfg: HatsConfig, name: string): Profile {
  const p = cfg.profiles[name];
  if (!p) throw new ProfileError(`hat "${name}" not found`);
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
