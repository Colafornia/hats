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
let envFile: string;

before(() => {
  tmpHome = mkdtempSync(join(tmpdir(), "hats-which-"));
  envFile = join(tmpHome, "company.env");
  // Plaintext secret in the env_file — `which` must NOT print it, only the path.
  writeFileSync(envFile, "ANTHROPIC_AUTH_TOKEN=super-secret-token\nOPENAI_API_KEY=super-secret-token\n");
  writeFileSync(
    join(tmpHome, "config.toml"),
    `version = 1
[profiles.company-claude]
launch = "claude"
env_file = "${envFile}"
`,
  );
});

after(() => {
  rmSync(tmpHome, { recursive: true, force: true });
});

function runWhich(profile: string): Promise<{ code: number; out: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(tsx, [cli, "which", profile], {
      env: { ...process.env, HATS_HOME: tmpHome } as Record<string, string>,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    });
    let out = "";
    child.stdout.on("data", (d) => (out += d.toString()));
    child.stderr.on("data", (d) => (out += d.toString()));
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`hats which ${profile} timed out`));
    }, 15000);
    child.on("exit", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, out });
    });
  });
}

describe("which (env_file profile)", () => {
  test("shows the env_file path, not its contents (no secret leak) (W1)", async () => {
    const r = await runWhich("company-claude");
    assert.equal(r.code, 0, `out: ${r.out}`);
    assert.match(r.out, /env_file:.*company\.env/);
    // The plaintext secret must not appear anywhere in `which` output.
    assert.doesNotMatch(r.out, /super-secret-token/, "env_file contents must not be printed");
  });

  test("env section says values come from env_file, not 'zero-injection' (W2)", async () => {
    const r = await runWhich("company-claude");
    assert.match(r.out, /no inline keys — values come from env_file above/);
    assert.doesNotMatch(r.out, /zero-injection/, "must not claim zero-injection when env_file provides env");
  });
});