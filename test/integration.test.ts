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
  test("-v prints the version", async () => {
    const r = await runCli(["-v"], childEnv());
    assert.equal(r.code, 0, `stderr: ${r.stderr}`);
    assert.equal(r.stdout.trim(), "0.1.0");
  });

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

describe("integration: hat shorthand", () => {
  test("`hats <hat>` runs the hat and preserves trailing args", async () => {
    const script = join(tmpHome, "argv.mjs");
    writeFileSync(script, "console.log(process.argv.slice(2).join('|'))\n");
    writeFileSync(
      join(tmpHome, "config.toml"),
      `${CONFIG_TOML}\n[profiles.work]\nlaunch = "node ${script}"\n`,
    );

    const r = await runCli(["work", "--model", "gpt 5"], childEnv());

    assert.equal(r.code, 0, `stderr: ${r.stderr}`);
    assert.equal(r.stdout.trim(), "--model|gpt 5");
  });

  test("shorthand does not warn about unrelated hats", async () => {
    const script = join(tmpHome, "noop.mjs");
    writeFileSync(script, "");
    writeFileSync(
      join(tmpHome, "config.toml"),
      `${CONFIG_TOML}\n[profiles.work]\nlaunch = "node ${script}"\n\n[profiles.legacy]\nlaunch = "claude"\nkind = "legacy"\n`,
    );

    const r = await runCli(["work"], childEnv());

    assert.equal(r.code, 0, `stderr: ${r.stderr}`);
    assert.doesNotMatch(r.stderr, /profiles\.legacy\.kind/);
  });

  test("an unknown word stays an unknown command", async () => {
    const r = await runCli(["not-a-hat"], childEnv());
    assert.notEqual(r.code, 0);
    assert.match(r.stderr, /unknown command 'not-a-hat'/);
  });

  test("a mistyped built-in gets Commander's real suggestion", async () => {
    const r = await runCli(["rn", "work"], childEnv());
    assert.notEqual(r.code, 0);
    assert.match(r.stderr, /Did you mean.*run/);
  });
});

describe("integration: shell completion", () => {
  test("top-level completion lists built-ins and configured hats", async () => {
    const r = await runCli(["__complete", "0"], childEnv());

    assert.equal(r.code, 0, `stderr: ${r.stderr}`);
    const candidates = r.stdout.trim().split("\n");
    assert.ok(candidates.includes("run"));
    assert.ok(candidates.includes("relay"));
    assert.ok(candidates.includes("local"));
  });

  test("hat-taking commands complete configured hats for their first argument", async () => {
    for (const command of ["run", "exec", "which", "rm", "setenv"]) {
      const r = await runCli(["__complete", "1", command], childEnv());
      assert.equal(r.code, 0, `${command}: ${r.stderr}`);
      assert.match(r.stdout, /^relay$/m, command);
      assert.match(r.stdout, /^local$/m, command);
    }
  });

  test("command options are offered only where hats still owns the arguments", async () => {
    const add = await runCli(["__complete", "1", "add"], childEnv());
    assert.match(add.stdout, /^--isolated$/m);

    const setenv = await runCli(["__complete", "2", "setenv", "relay"], childEnv());
    assert.match(setenv.stdout, /^--file$/m);
    assert.match(setenv.stdout, /^--launch$/m);
    assert.match(setenv.stdout, /^--isolated$/m);

    const run = await runCli(["__complete", "2", "run", "relay"], childEnv());
    assert.equal(run.stdout, "");
  });

  test("completion errors stay off stdout and exit successfully", async () => {
    const invalidHome = mkdtempSync(join(tmpdir(), "hats-complete-invalid-"));
    try {
      writeFileSync(join(invalidHome, "config.toml"), "not valid toml = [");
      const r = await runCli(["__complete", "0"], childEnv({ HATS_HOME: invalidHome }));

      assert.equal(r.code, 0);
      assert.equal(r.stdout, "");
      assert.notEqual(r.stderr, "");
    } finally {
      rmSync(invalidHome, { recursive: true, force: true });
    }
  });
});
