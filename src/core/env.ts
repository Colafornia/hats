import { readFileSync, existsSync } from "node:fs";
import { parse as parseDotenv } from "dotenv";
import type { Profile, Settings } from "./config.js";
import { expandTilde, resolveForRun, refKind } from "./resolve.js";

/** Variables kept when a profile sets `inherit_env = false`. */
const WHITELIST = new Set([
  "PATH",
  "HOME",
  "USER",
  "LOGNAME",
  "SHELL",
  "TERM",
  "TERM_PROGRAM",
  "LANG",
  "LC_ALL",
  "TZ",
  "TMPDIR",
]);

function whitelist(src: NodeJS.ProcessEnv): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(src)) {
    if (v === undefined) continue;
    if (WHITELIST.has(k) || k.startsWith("LC_")) out[k] = v;
  }
  return out;
}

/** Expand ${VAR} and $VAR references using the assembled env. */
function expandVars(s: string, env: Record<string, string>): string {
  return s
    .replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, n) => env[n] ?? "")
    .replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (_, n) => env[n] ?? "");
}

export interface AssembledEnv {
  env: Record<string, string>;
  /** human-readable summary for the launch banner */
  clean: boolean;
  configDir?: string;
}

/**
 * Compute the final environment for a profile:
 *   base (inherit | whitelist)  <-  env_file  <-  resolved env
 * Plain values and env_file values get tilde + ${VAR} expansion; values pulled
 * from references (env:/file:/cmd:) are used verbatim (no re-expansion, so a
 * token containing `$` is not mangled).
 */
export async function assembleEnv(
  profile: Profile,
  settings: Settings,
): Promise<AssembledEnv> {
  const inherit = profile.inherit_env ?? settings.inherit_env ?? true;
  const env: Record<string, string> = inherit
    ? { ...process.env } as Record<string, string>
    : whitelist(process.env);

  const noExpand = new Set<string>();

  if (profile.env_file) {
    const files = Array.isArray(profile.env_file) ? profile.env_file : [profile.env_file];
    for (const f of files) {
      const p = expandTilde(f);
      if (!existsSync(p)) continue;
      Object.assign(env, parseDotenv(readFileSync(p, "utf8")));
    }
  }

  if (profile.env) {
    for (const [k, v] of Object.entries(profile.env)) {
      const knd = refKind(v);
      env[k] = resolveForRun(v);
      if (knd !== "plain") noExpand.add(k);
    }
  }

  for (const [k, v] of Object.entries(env)) {
    if (noExpand.has(k)) continue;
    env[k] = expandVars(expandTilde(v), env);
  }

  const clean = !inherit;
  const configDir = env.CLAUDE_CONFIG_DIR || env.CODEX_HOME;
  return { env, clean, configDir };
}