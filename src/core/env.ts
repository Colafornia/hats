import { readFileSync, existsSync } from "node:fs";
import { parse as parseDotenv } from "dotenv";
import type { Profile } from "./config.js";
import { expandTilde, resolveForRun, refKind } from "./resolve.js";

/**
 * Provider / config prefixes stripped from the *inherited* environment so a
 * stray global `export ANTHROPIC_*` (or a polluted `CLAUDE_CONFIG_DIR`) in the
 * user's shell can't leak into a hat. The profile's own env_file/env is applied
 * AFTER the strip, so anything a profile sets explicitly is always preserved.
 *
 * This is a best-effort default: it covers the well-known, fixed-prefix vars of
 * the popular coding CLIs (claude / codex / gemini). A provider whose key name is
 * configured elsewhere (e.g. Codex's `env_key`) can't be known in advance — a
 * future `strip` override will let users add their own.
 */
export const STRIP_PREFIXES = [
  "ANTHROPIC_",
  "CLAUDE_",
  "CODEX_",
  "OPENAI_",
  "GEMINI_",
  "GOOGLE_",
];

function shouldStrip(name: string, prefixes: string[]): boolean {
  return prefixes.some((p) => name.startsWith(p));
}

/** Expand ${VAR} and $VAR references using the assembled env. */
function expandVars(s: string, env: Record<string, string>): string {
  return s
    .replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, n) => env[n] ?? "")
    .replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (_, n) => env[n] ?? "");
}

export interface AssembledEnv {
  env: Record<string, string>;
  /** Resolved config-home var (CLAUDE_CONFIG_DIR / CODEX_HOME / GEMINI_CLI_HOME), if any. */
  configDir?: string;
  /** Names of inherited provider vars that were stripped (for visibility). */
  stripped: string[];
}

/**
 * Compute the final environment for a profile:
 *   inherit all  ->  strip provider prefixes  <-  env_file  <-  resolved env
 * Plain/env_file values get tilde + ${VAR} expansion; values pulled from
 * references (env:/file:/cmd:) are used verbatim (no re-expansion, so a token
 * containing `$` is not mangled).
 */
export async function assembleEnv(profile: Profile): Promise<AssembledEnv> {
  const env: Record<string, string> = {};
  const stripped: string[] = [];
  for (const [k, v] of Object.entries(process.env)) {
    if (v === undefined) continue;
    if (shouldStrip(k, STRIP_PREFIXES)) {
      stripped.push(k);
      continue;
    }
    env[k] = v;
  }

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

  const configDir = env.CLAUDE_CONFIG_DIR || env.CODEX_HOME || env.GEMINI_CLI_HOME;
  return { env, configDir, stripped };
}