import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "smol-toml";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

test("edit creates a minimal config before opening the editor", () => {
  const home = mkdtempSync(join(tmpdir(), "hats-edit-"));
  try {
    const result = spawnSync(join(repoRoot, "node_modules", ".bin", "tsx"), [join(repoRoot, "src", "index.ts"), "edit"], {
      env: { ...process.env, HATS_HOME: home, EDITOR: "/usr/bin/true" },
    });
    assert.equal(result.status, 0, result.stderr.toString());
    assert.deepEqual(parse(readFileSync(join(home, "config.toml"), "utf8")), { version: 1, profiles: {} });
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
