import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "smol-toml";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");
const tsx = join(repoRoot, "node_modules", ".bin", "tsx");
const cli = join(repoRoot, "src", "index.ts");

let tmpHome: string;

before(() => {
  tmpHome = mkdtempSync(join(tmpdir(), "hats-setenv-"));
});

after(() => {
  rmSync(tmpHome, { recursive: true, force: true });
});

function childEnv(): Record<string, string> {
  const keep = ["PATH", "HOME", "USER", "SHELL", "LANG", "LC_ALL", "TZ", "TMPDIR", "TERM"];
  const env: Record<string, string> = { HATS_HOME: tmpHome };
  for (const k of keep) if (process.env[k]) env[k] = process.env[k] as string;
  return env;
}

/** Run `hats setenv ...` with the given stdin content; resolve on exit. */
function runSetenv(args: string[], stdin: string): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(tsx, [cli, "setenv", ...args], {
      env: childEnv(),
      stdio: ["pipe", "pipe", "pipe"],
      shell: false,
    });
    let stderr = "";
    child.stderr.on("data", (d) => (stderr += d.toString()));
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`hats setenv ${args.join(" ")} timed out`));
    }, 15000);
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, stderr });
    });
    child.stdin.write(stdin);
    child.stdin.end();
  });
}

/** Load the profiles written under tmpHome. */
function profiles(): Record<string, { env?: Record<string, string>; launch?: string }> {
  const raw = parse(readFileSync(join(tmpHome, "config.toml"), "utf8")) as Record<string, unknown>;
  return (raw.profiles ?? {}) as Record<string, { env?: Record<string, string>; launch?: string }>;
}

describe("setenv (batch merge env)", () => {
  test("creates a profile if missing and sets launch", async () => {
    await runSetenv(["newone", "--launch", "codex"], "OPENAI_BASE_URL=https://gw\n");
    const p = profiles().newone;
    assert.equal(p.launch, "codex");
    assert.equal(p.env?.OPENAI_BASE_URL, "https://gw");
  });

  test("merges new keys without overwriting the whole env block (S1)", async () => {
    await runSetenv(["m", "--launch", "codex"], "A=1\nB=2\n");
    await runSetenv(["m"], "B=3\nC=4\n");
    const env = profiles().m.env;
    assert.equal(env?.A, "1", "A survives the second merge");
    assert.equal(env?.B, "3", "B updated, not dropped");
    assert.equal(env?.C, "4", "C added");
  });

  test("does NOT delete keys absent from the new input (S2)", async () => {
    await runSetenv(["d", "--launch", "codex"], "KEEP=keep\nDROP=drop\n");
    await runSetenv(["d"], "OTHER=x\n");
    const env = profiles().d.env;
    assert.equal(env?.KEEP, "keep", "pre-existing KEEP not deleted");
    assert.equal(env?.DROP, "drop", "pre-existing DROP not deleted even though absent from input");
    assert.equal(env?.OTHER, "x");
  });

  test("--home injects the inferred config-home var alongside the env (S3)", async () => {
    await runSetenv(["h", "--launch", "codex", "--home"], "OPENAI_BASE_URL=https://gw\n");
    const env = profiles().h.env;
    assert.equal(env?.OPENAI_BASE_URL, "https://gw");
    assert.ok(env?.CODEX_HOME, "CODEX_HOME injected");
    assert.ok(env?.CODEX_HOME?.endsWith("/homes/h"), "config home path under homes/<name>");
  });

  test("--home alone (no KEY=value lines) still injects config home", async () => {
    await runSetenv(["ho", "--launch", "claude", "--home"], "");
    const env = profiles().ho.env;
    assert.equal(env?.CLAUDE_CONFIG_DIR, join(tmpHome, "homes", "ho"));
  });

  test("a file: reference value is stored verbatim, not resolved (S4)", async () => {
    await runSetenv(["r", "--launch", "codex"], "OPENAI_API_KEY=file:~/k\n");
    assert.equal(profiles().r.env?.OPENAI_API_KEY, "file:~/k", "file: ref stored verbatim, not read");
  });
});