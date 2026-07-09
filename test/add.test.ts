import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "smol-toml";
import { parseLaunch } from "../src/core/spawn.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");
const tsx = join(repoRoot, "node_modules", ".bin", "tsx");
const cli = join(repoRoot, "src", "index.ts");

let tmpHome: string;

before(() => {
  tmpHome = mkdtempSync(join(tmpdir(), "hats-add-"));
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

function runAdd(args: string[]): Promise<{ code: number; out: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(tsx, [cli, "add", ...args], {
      env: childEnv(),
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    });
    let out = "";
    child.stdout.on("data", (d) => (out += d.toString()));
    child.stderr.on("data", (d) => (out += d.toString()));
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`hats add ${args.join(" ")} timed out`));
    }, 15000);
    child.on("exit", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, out });
    });
  });
}

function profiles(): Record<string, { launch?: string; env?: Record<string, string> }> {
  const raw = parse(readFileSync(join(tmpHome, "config.toml"), "utf8")) as Record<string, unknown>;
  return (raw.profiles ?? {}) as Record<string, { launch?: string; env?: Record<string, string> }>;
}

describe("add (positional)", () => {
  test("`add <name> <cmd>` creates a profile with the joined launch", async () => {
    const r = await runAdd(["plain", "ollama", "launch", "claude", "--model", "q"]);
    assert.equal(r.code, 0, `out: ${r.out}`);
    const p = profiles().plain;
    assert.equal(p.launch, "ollama launch claude --model q");
  });

  test("`add <name> <cmd> --home` injects the inferred config-home var", async () => {
    const r = await runAdd(["codex-personal", "codex", "--home"]);
    assert.equal(r.code, 0, `out: ${r.out}`);
    const p = profiles()["codex-personal"];
    assert.equal(p.launch, "codex");
    assert.equal(p.env?.CODEX_HOME, join(tmpHome, "homes", "codex-personal"));
  });

  test("`add <name> --home` with an uninferrable launch fails (no guessing)", async () => {
    const r = await runAdd(["local", "ollama", "launch", "claude", "--home"]);
    assert.notEqual(r.code, 0, "should error when --home can't be inferred");
    assert.match(r.out, /--home only works when launch starts with codex, claude, or gemini/);
  });

  test("`add <name>` with no launch command fails", async () => {
    const r = await runAdd(["lonely"]);
    assert.notEqual(r.code, 0);
    assert.match(r.out, /launch command required/);
  });

  test("duplicate name is rejected", async () => {
    await runAdd(["dup", "codex"]);
    const r = await runAdd(["dup", "codex"]);
    assert.notEqual(r.code, 0);
    assert.match(r.out, /already exists/);
  });

  test("a quoted arg with a space round-trips through the stored launch (Q1)", async () => {
    // `hats add q codex --model "gpt 5"` — the shell already split this into argv,
    // so commander receives ["codex","--model","gpt 5"]. The stored launch must
    // re-quote "gpt 5" so parseLaunch() splits it back to the same argv.
    const r = await runAdd(["q", "codex", "--model", "gpt 5"]);
    assert.equal(r.code, 0, `out: ${r.out}`);
    const launch = profiles().q.launch ?? "";
    assert.deepEqual(parseLaunch(launch), ["codex", "--model", "gpt 5"], "launch round-trips to the same argv");
  });
});