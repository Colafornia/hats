import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("rm", () => {
  test("Ctrl+C cancellation does not delete the profile", async () => {
    const home = mkdtempSync(join(tmpdir(), "hats-rm-"));
    const path = join(home, "config.toml");
    const original = 'version = 1\n[profiles.keep]\nlaunch = "codex"\n';
    writeFileSync(path, original);
    try {
      await new Promise<void>((resolve, reject) => {
        const child = spawn(join(root, "node_modules/.bin/tsx"), [join(root, "src/index.ts"), "rm", "keep"], {
          env: { ...process.env, HATS_HOME: home },
          stdio: ["pipe", "ignore", "ignore"],
        });
        const timer = setTimeout(() => child.stdin.write("\x03"), 100);
        child.on("error", reject);
        child.on("exit", () => {
          clearTimeout(timer);
          resolve();
        });
      });
      assert.equal(readFileSync(path, "utf8"), original);
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });
});
