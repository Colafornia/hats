import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
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

function readLines(path: string): string[] {
  return readFileSync(path, "utf8").trim().split("\n");
}

async function readEventually(path: string, count: number): Promise<string[]> {
  for (let i = 0; i < 100; i++) {
    try {
      const lines = readLines(path);
      if (lines.length >= count) return lines;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return readLines(path);
}

function herdrFixture(herdrTail = "", launch = "", agentExit = 0): { home: string; bin: string; log: string } {
  const home = mkdtempSync(join(tmpdir(), "hats-herdr-"));
  const bin = join(home, "bin");
  const log = join(home, "herdr.log");
  const herdr = join(bin, "herdr");
  const agent = join(home, "agent");
  mkdirSync(bin);
  writeFileSync(
    agent,
    `#!/bin/sh\ntest -z "$AGENT_LOG" || printf 'agent\\n' >> "$AGENT_LOG"\nexit ${agentExit}\n`,
    { mode: 0o755 },
  );
  writeFileSync(join(home, "config.toml"), `[profiles.gpt]\nlaunch = "${launch || agent}"\n`);
  writeFileSync(
    herdr,
    `#!/bin/sh\nprintf '%s\\n' "$*" >> "$HERDR_LOG"\n${herdrTail}`,
    { mode: 0o755 },
  );
  return { home, bin, log };
}

describe("integration: Herdr active hat metadata", () => {
  test("does not wait for slow Herdr calls", async () => {
    const { home, bin } = herdrFixture();
    try {
      writeFileSync(join(bin, "herdr"), "#!/usr/bin/env node\nsetTimeout(() => {}, 5000);\n", { mode: 0o755 });
      const started = Date.now();
      const r = await runCli(
        ["run", "gpt"],
        childEnv({
          HATS_HOME: home,
          HERDR_PANE_ID: "pane-7",
          PATH: `${bin}:${process.env.PATH ?? ""}`,
        }),
      );

      assert.equal(r.code, 0, r.stderr);
      assert.ok(Date.now() - started < 1500, "slow Herdr must not delay hats");
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  test("reports the active hat and clears it after a non-zero exit", async () => {
    const { home, bin, log } = herdrFixture("", "", 7);
    try {
      const r = await runCli(
        ["run", "gpt"],
        childEnv({
          HATS_HOME: home,
          HERDR_PANE_ID: "pane-7",
          HERDR_LOG: log,
          PATH: `${bin}:${process.env.PATH ?? ""}`,
        }),
      );

      assert.equal(r.code, 7, r.stderr);
      assert.deepEqual((await readEventually(log, 2)).sort(), [
        "pane report-metadata pane-7 --source hats --clear-token hat",
        "pane report-metadata pane-7 --source hats --token hat=gpt",
      ]);
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  test("does not invoke Herdr without a pane id", async () => {
    const { home, bin, log } = herdrFixture();
    try {
      const r = await runCli(
        ["run", "gpt"],
        childEnv({ HATS_HOME: home, HERDR_LOG: log, PATH: `${bin}:${process.env.PATH ?? ""}` }),
      );

      assert.equal(r.code, 0, r.stderr);
      assert.throws(() => readFileSync(log), /ENOENT/);
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  test("ignores a failing Herdr CLI", async () => {
    const { home, bin, log } = herdrFixture("exit 9\n");
    try {
      const r = await runCli(
        ["run", "gpt"],
        childEnv({
          HATS_HOME: home,
          HERDR_PANE_ID: "pane-7",
          HERDR_LOG: log,
          PATH: `${bin}:${process.env.PATH ?? ""}`,
        }),
      );

      assert.equal(r.code, 0, r.stderr);
      assert.equal((await readEventually(log, 2)).length, 2);
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  test("does not report metadata for hats exec", async () => {
    const { home, bin, log } = herdrFixture();
    try {
      const r = await runCli(
        ["exec", "gpt", "--", "node", "-e", "process.exit(0)"],
        childEnv({
          HATS_HOME: home,
          HERDR_PANE_ID: "pane-7",
          HERDR_LOG: log,
          PATH: `${bin}:${process.env.PATH ?? ""}`,
        }),
      );

      assert.equal(r.code, 0, r.stderr);
      assert.throws(() => readFileSync(log), /ENOENT/);
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  test("clears metadata when the agent fails to spawn", async () => {
    const { home, bin, log } = herdrFixture("", "missing-hats-agent");
    try {
      const r = await runCli(
        ["run", "gpt"],
        childEnv({
          HATS_HOME: home,
          HERDR_PANE_ID: "pane-7",
          HERDR_LOG: log,
          PATH: `${bin}:${process.env.PATH ?? ""}`,
        }),
      );

      assert.notEqual(r.code, 0);
      assert.deepEqual((await readEventually(log, 2)).sort(), [
        "pane report-metadata pane-7 --source hats --clear-token hat",
        "pane report-metadata pane-7 --source hats --token hat=gpt",
      ]);
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });
});

describe("integration: hats exec through the real CLI", () => {
  test("-v prints the version", async () => {
    const r = await runCli(["-v"], childEnv());
    assert.equal(r.code, 0, `stderr: ${r.stderr}`);
    assert.equal(r.stdout.trim(), "0.2.0");
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

describe("integration: config warning scope", () => {
  test("common paths warn only when inspecting the affected hat", async () => {
    const home = mkdtempSync(join(tmpdir(), "hats-warnings-"));
    try {
      writeFileSync(
        join(home, "config.toml"),
        'version = 1\n[profiles.target]\nlaunch = "codex"\n[profiles.legacy]\nlaunch = "claude"\nkind = "legacy"\n',
      );

      for (const args of [
        ["rm", "missing"],
        ["which", "target"],
        ["setenv", "target", "--launch", "codex"],
        ["add", "new", "codex"],
        [],
        ["__complete", "0"],
      ]) {
        const r = await runCli(args, childEnv({ HATS_HOME: home }));
        assert.doesNotMatch(r.stderr, /profiles\.legacy\.kind/, args.join(" "));
      }

      const target = await runCli(["which", "legacy"], childEnv({ HATS_HOME: home }));
      assert.match(target.stderr, /profiles\.legacy\.kind/);
      const all = await runCli(["ls"], childEnv({ HATS_HOME: home }));
      assert.match(all.stderr, /profiles\.legacy\.kind/);
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });
});

describe("integration: shell completion", () => {
  test("the public command emits sourceable adapters for supported shells", async () => {
    const registrations = {
      bash: "complete -F _hats hats",
      zsh: "compdef _hats hats",
      fish: "complete -c hats",
    };

    for (const [shell, registration] of Object.entries(registrations)) {
      const r = await runCli(["completion", shell], childEnv());
      assert.equal(r.code, 0, `${shell}: ${r.stderr}`);
      assert.match(r.stdout, /hats __complete/, shell);
      assert.match(r.stdout, new RegExp(registration), shell);
    }

    const unsupported = await runCli(["completion", "powershell"], childEnv());
    assert.notEqual(unsupported.code, 0);
    assert.match(unsupported.stderr, /unsupported shell/);
  });

  test("generating an adapter does not depend on the hats config", async () => {
    const invalidHome = mkdtempSync(join(tmpdir(), "hats-completion-invalid-"));
    try {
      writeFileSync(join(invalidHome, "config.toml"), "not valid toml = [");
      const r = await runCli(["completion", "zsh"], childEnv({ HATS_HOME: invalidHome }));

      assert.equal(r.code, 0, r.stderr);
      assert.match(r.stdout, /compdef _hats hats/);
    } finally {
      rmSync(invalidHome, { recursive: true, force: true });
    }
  });

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
