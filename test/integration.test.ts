import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");
const tsx = join(repoRoot, "node_modules", ".bin", "tsx");
const cli = join(repoRoot, "src", "index.ts");

let tmpHome: string;

const CONFIG_TOML = `version = 1

[profiles.relay]
desc = "relay"
launch = "claude"
env = { ANTHROPIC_BASE_URL = "https://relay.example" }

[profiles.local]
desc = "local model"
launch = "ollama launch claude --model your-model"
`;

before(() => {
  tmpHome = mkdtempSync(join(tmpdir(), "hats-int-"));
  writeFileSync(join(tmpHome, "config.toml"), CONFIG_TOML);
});

after(() => {
  rmSync(tmpHome, { recursive: true, force: true });
});

/** A minimal env for the spawned hats CLI: enough to run node/tsx, no ambient ANTHROPIC_*. */
function childEnv(overrides: Record<string, string> = {}): Record<string, string> {
  const keep = ["PATH", "HOME", "USER", "SHELL", "LANG", "LC_ALL", "TZ", "TMPDIR", "TERM"];
  const env: Record<string, string> = { HATS_HOME: tmpHome };
  for (const k of keep) if (process.env[k]) env[k] = process.env[k] as string;
  return { ...env, ...overrides };
}

interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

function runCli(args: string[], env: Record<string, string>): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(tsx, [cli, ...args], { env, stdio: ["ignore", "pipe", "pipe"], shell: false });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`hats ${args.join(" ")} timed out`));
    }, 15000);
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

describe("integration: hats exec through the real CLI", () => {
  test("exit code is passed through (E1)", async () => {
    const r = await runCli(["exec", "relay", "--", "node", "-e", "process.exit(3)"], childEnv());
    assert.equal(r.code, 3, `stderr: ${r.stderr}`);
  });

  test("profile env reaches the child (E2a)", async () => {
    const r = await runCli(["exec", "relay", "--", "printenv", "ANTHROPIC_BASE_URL"], childEnv());
    assert.equal(r.code, 0, `stderr: ${r.stderr}`);
    assert.equal(r.stdout.trim(), "https://relay.example");
  });

  test("default provider-prefix strip keeps a dirty shell's ANTHROPIC_* out of the child (E2b)", async () => {
    // Simulate a dirty parent shell that still exports an ANTHROPIC_* globally.
    const r = await runCli(
      ["exec", "local", "--", "printenv", "ANTHROPIC_BASE_URL"],
      childEnv({ ANTHROPIC_BASE_URL: "dirty-gateway" }),
    );
    assert.equal(r.stdout, "", "dirty ANTHROPIC_* must be stripped before reaching the child");
  });
});