import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { adaptCodex } from "../src/core/codex.js";

function fixture() {
  const home = mkdtempSync(join(tmpdir(), "hats-codex-"));
  return {
    home,
    env: {
      CODEX_HOME: home,
      OPENAI_BASE_URL: "https://gateway.example/v1",
      OPENAI_API_KEY: "secret",
    },
  };
}

describe("Codex provider adapter", () => {
  test("injects a process-local provider and preserves model arguments", () => {
    const { home, env } = fixture();
    try {
      const argv = adaptCodex("café.hat", ["/opt/bin/codex", "-m", "gpt-test"], env);
      const id = "hats-3f515fc9f389a544c7e8be985c393a83d688d1a0f270af8162f1910fec19be37";
      assert.deepEqual(argv, [
        "/opt/bin/codex",
        "-c", `model_provider=${JSON.stringify(id)}`,
        "-c", `model_providers.${id}.name="Hats"`,
        "-c", `model_providers.${id}.base_url="https://gateway.example/v1"`,
        "-c", `model_providers.${id}.env_key="OPENAI_API_KEY"`,
        "-m", "gpt-test",
      ]);
      assert.equal(argv.includes("secret"), false);
      assert.deepEqual(readdirSync(home), []);
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  test("fails before launch when Hat provider data is incomplete", () => {
    const { home, env } = fixture();
    try {
      delete (env as Partial<typeof env>).OPENAI_BASE_URL;
      assert.throws(() => adaptCodex("rc", ["codex"], env), /missing OPENAI_BASE_URL/);
      assert.deepEqual(readdirSync(home), []);
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  test("leaves explicit provider selection and non-Codex commands alone", () => {
    const { home, env } = fixture();
    try {
      const explicit = ["codex", "-c", "model_provider=4ai"];
      assert.equal(adaptCodex("4ai", explicit, env), explicit);
      const profile = ["codex", "-p=personal"];
      assert.equal(adaptCodex("personal", profile, env), profile);
      const ollama = ["ollama", "launch", "codex"];
      assert.equal(adaptCodex("local", ollama, env), ollama);
      assert.deepEqual(readdirSync(home), []);
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });
});
