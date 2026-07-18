import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join } from "node:path";
import { assembleEnv, STRIP_PREFIXES } from "../src/core/env.js";
import type { Profile } from "../src/core/config.js";

/** Set a process.env var for the duration of a test, restoring after. */
function withEnv(key: string, value: string, fn: () => Promise<void> | void): Promise<void> {
  const prev = process.env[key];
  process.env[key] = value;
  return Promise.resolve(fn()).finally(() => {
    if (prev === undefined) delete process.env[key];
    else process.env[key] = prev;
  });
}

describe("isolation / provider-prefix strip", () => {
  test("a stray ANTHROPIC_* from a dirty shell is stripped by default", async () => {
    await withEnv("ANTHROPIC_BASE_URL", "dirty-gateway", async () => {
      const profile: Profile = { name: "local" };
      const { env, stripped } = await assembleEnv(profile);
      assert.equal(env.ANTHROPIC_BASE_URL, undefined, "stray ANTHROPIC_* must be stripped, not leaked");
      assert.ok(stripped.includes("ANTHROPIC_BASE_URL"), "stripped list records it for visibility");
    });
  });

  test("a stray config-home var (CLAUDE_CONFIG_DIR) is also stripped", async () => {
    await withEnv("CLAUDE_CONFIG_DIR", "/tmp/dirty-claude", async () => {
      const { env } = await assembleEnv({ name: "r" });
      assert.equal(env.CLAUDE_CONFIG_DIR, undefined, "stray CLAUDE_CONFIG_DIR must not steer the hat");
    });
  });

  test("non-provider vars survive the strip (ollama / proxy / editor not starved)", async () => {
    await withEnv("OLLAMA_HOST", "remote:11434", async () => {
      const { env, stripped } = await assembleEnv({ name: "local" });
      assert.equal(env.OLLAMA_HOST, "remote:11434", "OLLAMA_HOST preserved");
      assert.ok(!stripped.includes("OLLAMA_HOST"), "OLLAMA_HOST not in stripped list");
    });
  });

  test("profile env overlays on top of the stripped, inherited env", async () => {
    await withEnv("ANTHROPIC_BASE_URL", "dirty", async () => {
      const profile: Profile = { name: "r", env: { ANTHROPIC_BASE_URL: "https://relay.example", NEW: "x" } };
      const { env } = await assembleEnv(profile);
      // stray stripped, then profile's value applied → survives
      assert.equal(env.ANTHROPIC_BASE_URL, "https://relay.example", "profile value wins over stripped stray");
      assert.equal(env.NEW, "x");
    });
  });

  test("precedence: inherited(stripped) < env_file < env (env wins)", async () => {
    const dir = mkdtempSync(join(tmpdir(), "hats-env-"));
    try {
      writeFileSync(join(dir, "f.env"), "KEY=file\n");
      const withEnvOverride: Profile = { name: "r", env_file: join(dir, "f.env"), env: { KEY: "env" } };
      const { env } = await assembleEnv(withEnvOverride);
      assert.equal(env.KEY, "env", "env overrides env_file");

      const onlyFile: Profile = { name: "r", env_file: join(dir, "f.env") };
      const { env: env2 } = await assembleEnv(onlyFile);
      assert.equal(env2.KEY, "file", "env_file value used when no env override");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a profile's own config-home env is preserved (opt-in isolation)", async () => {
    const a: Profile = { name: "a", env: { CLAUDE_CONFIG_DIR: "~/.claude-a" } };
    const b: Profile = { name: "b", env: { CLAUDE_CONFIG_DIR: "~/.claude-b" } };
    const ea = await assembleEnv(a);
    const eb = await assembleEnv(b);
    assert.equal(ea.configDir, join(homedir(), ".claude-a"));
    assert.equal(eb.configDir, join(homedir(), ".claude-b"));
    assert.notEqual(ea.configDir, eb.configDir);
  });

  test("codex hats also resolve distinct config homes through the registry", async () => {
    const a = await assembleEnv({ name: "a", env: { CODEX_HOME: "~/.codex-a" } });
    const b = await assembleEnv({ name: "b", env: { CODEX_HOME: "~/.codex-b" } });
    assert.notEqual(a.configDir, b.configDir);
  });

  test("${VAR} expansion resolves against the assembled env", async () => {
    const profile: Profile = {
      name: "r",
      env: { ANTHROPIC_BASE_URL: "https://relay", ANTHROPIC_API_PATH: "${ANTHROPIC_BASE_URL}/v1" },
    };
    const { env } = await assembleEnv(profile);
    assert.equal(env.ANTHROPIC_API_PATH, "https://relay/v1");
  });

  test("inherited values containing $ are left unchanged", async () => {
    await withEnv("HATS_LITERAL_DOLLAR", "abc$def", async () => {
      const { env } = await assembleEnv({ name: "r" });
      assert.equal(env.HATS_LITERAL_DOLLAR, "abc$def");
    });
  });

  test("plain profile values support an escaped dollar", async () => {
    const { env } = await assembleEnv({ name: "r", env: { TOKEN: String.raw`abc\$def` } });
    assert.equal(env.TOKEN, "abc$def");
  });

  test("TOML scalar env values are coerced to strings", async () => {
    const { env } = await assembleEnv({ name: "r", env: { FLAG: true, COUNT: 2 } as never });
    assert.equal(env.FLAG, "true");
    assert.equal(env.COUNT, "2");
  });

  test("missing env_file and env: references warn", async () => {
    const errors: string[] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => errors.push(args.join(" "));
    try {
      await assembleEnv({ name: "r", env_file: "/definitely/missing", env: { TOKEN: "env:HATS_MISSING" } });
    } finally {
      console.error = original;
    }
    assert.match(errors.join("\n"), /env_file.*not found/);
    assert.match(errors.join("\n"), /HATS_MISSING.*not set/);
  });

  test("reference values are used verbatim — a token containing $ is not re-expanded", async () => {
    const dir = mkdtempSync(join(tmpdir(), "hats-env-"));
    try {
      writeFileSync(join(dir, "tok"), "abc$def");
      const profile: Profile = { name: "r", env: { TOKEN: `file:${join(dir, "tok")}` } };
      const { env } = await assembleEnv(profile);
      assert.equal(env.TOKEN, "abc$def", "file: value used verbatim, $ not mangled");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("STRIP_PREFIXES", () => {
  test("covers the popular coding CLIs", () => {
    for (const p of ["ANTHROPIC_", "CLAUDE_", "CODEX_", "OPENAI_", "GEMINI_"]) {
      assert.ok(STRIP_PREFIXES.includes(p), `${p} in default strip set`);
    }
  });

  test("does not strip unrelated GOOGLE_ variables", async () => {
    await withEnv("GOOGLE_APPLICATION_CREDENTIALS", "/tmp/gcp.json", async () => {
      const { env } = await assembleEnv({ name: "gcp" });
      assert.equal(env.GOOGLE_APPLICATION_CREDENTIALS, "/tmp/gcp.json");
    });
  });
});
