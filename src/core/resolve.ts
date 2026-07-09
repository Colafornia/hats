import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";

export type RefKind = "plain" | "env" | "file" | "cmd";

/** Key-name pattern that marks a value as a secret worth masking in listings/inspectors. */
const SECRET_KEY_RE = /(?:^|_)(KEY|TOKEN|SECRET|PASSWD|PASSWORD|CREDENTIAL|AUTH)(?:_|$)/i;

/** True if the env var name looks like it holds a secret (OPENAI_API_KEY, *_AUTH_TOKEN, …). */
export function looksSecret(key: string): boolean {
  return SECRET_KEY_RE.test(key);
}

export function refKind(v: string): RefKind {
  if (v.startsWith("env:")) return "env";
  if (v.startsWith("file:")) return "file";
  if (v.startsWith("cmd:")) return "cmd";
  return "plain";
}

/** Expand a leading `~/` (and bare `~`) to $HOME. */
export function expandTilde(s: string): string {
  if (s === "~") return homedir();
  if (s.startsWith("~/")) return join(homedir(), s.slice(2));
  return s;
}

/** Strip the `<kind>:` prefix, returning the argument (tilde-expanded). */
function refArg(v: string, kind: RefKind): string {
  return expandTilde(v.slice(kind.length + 1));
}

/**
 * Resolve a value for actual execution.
 * - plain: returned as-is (var/tilde expansion handled later in env.ts)
 * - env:NAME: read from current process env
 * - file:path: file contents, trimmed
 * - cmd:<shell>: stdout of the command, trimmed (run with current env, e.g. for `op read`)
 */
export function resolveForRun(v: string): string {
  const k = refKind(v);
  if (k === "plain") return v;
  const arg = refArg(v, k);
  if (k === "env") return process.env[arg] ?? "";
  if (k === "file") return readFileSync(arg, "utf8").trim();
  return execSync(arg, { encoding: "utf8" }).trim();
}

export interface DisplayValue {
  /** What to show in `which` — masked for any reference, raw for plain. */
  display: string;
  /** Human-readable source, e.g. `file:~/.config/hats/relay.token`. */
  source: string;
  /** Whether the underlying value came from a reference (potentially secret). */
  isRef: boolean;
}

/**
 * Describe a value for display WITHOUT executing `cmd:` (avoids e.g. 1Password
 * biometric prompts on a read-only inspection). References are masked to `****`.
 * A plaintext value is masked too when its key name looks like a secret
 * (pass `key` for that check); otherwise shown raw (e.g. ANTHROPIC_BASE_URL).
 */
export function describeForDisplay(v: string, key?: string): DisplayValue {
  const k = refKind(v);
  if (k === "plain") {
    if (key && looksSecret(key)) {
      return { display: "****", source: "plain (secret)", isRef: false };
    }
    return { display: v, source: "plain", isRef: false };
  }
  const arg = v.slice(k.length + 1);
  return { display: "****", source: `${k}:${arg}`, isRef: true };
}