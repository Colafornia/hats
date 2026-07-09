import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join } from "node:path";
import { resolveConfigHome, launchFirstToken, CONFIG_HOME_BY_TOOL, ProfileError } from "../src/core/profile.js";

let tmpHome: string;
let prevHome: string | undefined;

before(() => {
  tmpHome = mkdtempSync(join(tmpdir(), "hats-prof-"));
  prevHome = process.env.HATS_HOME;
  process.env.HATS_HOME = tmpHome;
});

after(() => {
  if (prevHome === undefined) delete process.env.HATS_HOME;
  else process.env.HATS_HOME = prevHome;
  rmSync(tmpHome, { recursive: true, force: true });
});

describe("resolveConfigHome (--home inference)", () => {
  test("codex launch → CODEX_HOME under HATS_HOME/homes/<name>", () => {
    const h = resolveConfigHome("codex-personal", "codex");
    assert.equal(h.varName, "CODEX_HOME");
    assert.equal(h.path, join(tmpHome, "homes", "codex-personal"));
  });

  test("claude launch → CLAUDE_CONFIG_DIR", () => {
    assert.equal(resolveConfigHome("c", "claude").varName, "CLAUDE_CONFIG_DIR");
  });

  test("gemini launch → GEMINI_CLI_HOME", () => {
    assert.equal(resolveConfigHome("g", "gemini").varName, "GEMINI_CLI_HOME");
  });

  test("infers from the FIRST launch token only (ollama launch claude → not claude)", () => {
    // first token is `ollama`, which isn't a known tool → must throw, NOT infer claude.
    assert.throws(() => resolveConfigHome("local", "ollama launch claude"), ProfileError);
  });

  test("unknown launch first token throws a ProfileError (no guessing)", () => {
    assert.throws(() => resolveConfigHome("x", "some-other-cli"), ProfileError);
  });

  test("empty/undefined launch throws ProfileError", () => {
    assert.throws(() => resolveConfigHome("x", undefined), ProfileError);
    assert.throws(() => resolveConfigHome("x", "   "), ProfileError);
  });

  test("path is tilde-prefixed when HATS_HOME is under $HOME", () => {
    const prev = process.env.HATS_HOME;
    process.env.HATS_HOME = join(homedir(), ".config", "hats-test-tilde");
    try {
      const h = resolveConfigHome("codex-personal", "codex");
      assert.equal(h.path, "~/.config/hats-test-tilde/homes/codex-personal");
    } finally {
      process.env.HATS_HOME = prev;
    }
  });
});

describe("launchFirstToken", () => {
  test("returns the first whitespace token", () => {
    assert.equal(launchFirstToken("ollama launch claude --model q"), "ollama");
    assert.equal(launchFirstToken("  codex  "), "codex");
  });
  test("undefined / empty → undefined", () => {
    assert.equal(launchFirstToken(undefined), undefined);
    assert.equal(launchFirstToken("   "), undefined);
  });
});

describe("CONFIG_HOME_BY_TOOL", () => {
  test("covers the three supported tools", () => {
    assert.deepEqual(CONFIG_HOME_BY_TOOL, {
      codex: "CODEX_HOME",
      claude: "CLAUDE_CONFIG_DIR",
      gemini: "GEMINI_CLI_HOME",
    });
  });
});