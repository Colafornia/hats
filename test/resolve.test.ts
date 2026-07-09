import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { refKind, resolveForRun, describeForDisplay, looksSecret } from "../src/core/resolve.js";

describe("resolveForRun", () => {
  test("plain value is returned as-is", () => {
    assert.equal(resolveForRun("hello"), "hello");
  });

  test("env:NAME reads the current process env", () => {
    process.env.HATS_TEST_ENVVAR = "from-env";
    try {
      assert.equal(resolveForRun("env:HATS_TEST_ENVVAR"), "from-env");
    } finally {
      delete process.env.HATS_TEST_ENVVAR;
    }
  });

  test("env: missing variable resolves to empty string", () => {
    assert.equal(resolveForRun("env:HATS_DEFINITELY_NOT_SET"), "");
  });

  test("file: reads contents and trims surrounding whitespace", () => {
    const dir = mkdtempSync(join(tmpdir(), "hats-resolve-"));
    try {
      writeFileSync(join(dir, "token"), "  abc123\n\n");
      assert.equal(resolveForRun(`file:${join(dir, "token")}`), "abc123");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("cmd: returns trimmed stdout", () => {
    assert.equal(resolveForRun("cmd:printf '   hi   '"), "hi");
  });
});

describe("describeForDisplay (which-mode: never executes cmd:)", () => {
  test("plain value: display raw, isRef false, source plain", () => {
    const d = describeForDisplay("https://relay.example");
    assert.equal(d.display, "https://relay.example");
    assert.equal(d.isRef, false);
    assert.equal(d.source, "plain");
  });

  test("cmd: is masked to **** and NOT executed — no side effect", () => {
    const dir = mkdtempSync(join(tmpdir(), "hats-display-"));
    try {
      const marker = join(dir, "marker");
      // If describeForDisplay executed cmd:, this file would appear.
      const d = describeForDisplay(`cmd:touch ${marker}`);
      assert.equal(d.display, "****");
      assert.equal(d.isRef, true);
      assert.match(d.source, /^cmd:/);
      assert.equal(existsSync(marker), false, "describeForDisplay must not execute cmd:");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("file: is masked to ****, isRef true", () => {
    const d = describeForDisplay("file:~/.config/hats/relay.token");
    assert.equal(d.display, "****");
    assert.equal(d.isRef, true);
  });

  test("env: is masked to ****, isRef true", () => {
    const d = describeForDisplay("env:MY_TOKEN");
    assert.equal(d.display, "****");
    assert.equal(d.isRef, true);
  });

  test("plaintext secret is masked when its key name looks secret", () => {
    const d = describeForDisplay("sk-proj-abc123", "OPENAI_API_KEY");
    assert.equal(d.display, "****", "a plaintext value under a *_KEY name must not print raw");
    assert.equal(d.isRef, false);
  });

  test("plaintext non-secret is shown raw (BASE_URL etc.)", () => {
    const d = describeForDisplay("https://gateway.example", "ANTHROPIC_BASE_URL");
    assert.equal(d.display, "https://gateway.example");
  });

  test("plaintext without a key is shown raw (backward compatible)", () => {
    const d = describeForDisplay("https://relay.example");
    assert.equal(d.display, "https://relay.example");
  });
});

describe("looksSecret", () => {
  test("keys containing KEY/TOKEN/SECRET/AUTH are secret", () => {
    assert.ok(looksSecret("OPENAI_API_KEY"));
    assert.ok(looksSecret("ANTHROPIC_AUTH_TOKEN"));
    assert.ok(looksSecret("API_SECRET"));
    assert.ok(looksSecret("DB_PASSWORD"));
    assert.ok(looksSecret("AUTH_TOKEN"));
  });
  test("non-secret keys are not flagged", () => {
    assert.ok(!looksSecret("ANTHROPIC_BASE_URL"));
    assert.ok(!looksSecret("OLLAMA_HOST"));
    assert.ok(!looksSecret("CODEX_HOME"));
    assert.ok(!looksSecret("CLAUDE_CONFIG_DIR"));
    assert.ok(!looksSecret("DISPLAY_NAME"), "AUTHOR must not match AUTH (boundary)");
  });
});

describe("refKind", () => {
  test("classifies each prefix", () => {
    assert.equal(refKind("plain"), "plain");
    assert.equal(refKind("env:X"), "env");
    assert.equal(refKind("file:x"), "file");
    assert.equal(refKind("cmd:x"), "cmd");
  });
});