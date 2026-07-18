import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  loadConfig,
  saveConfig,
  defaultConfig,
  configPath,
  type HatsConfig,
  type Profile,
} from "../src/core/config.js";
import { getProfile, validateProfile, ProfileError } from "../src/core/profile.js";

// Point HATS_HOME at a throwaway dir so we never touch the user's real config.
let tmpHome: string;
let prevHome: string | undefined;

before(() => {
  tmpHome = mkdtempSync(join(tmpdir(), "hats-cfg-"));
  prevHome = process.env.HATS_HOME;
  process.env.HATS_HOME = tmpHome;
});

after(() => {
  if (prevHome === undefined) delete process.env.HATS_HOME;
  else process.env.HATS_HOME = prevHome;
  rmSync(tmpHome, { recursive: true, force: true });
});

describe("config", () => {
  test("missing config file yields the default config", () => {
    const cfg = loadConfig();
    assert.equal(cfg.version, 1);
    assert.deepEqual(cfg.profiles, {});
  });

  test("save → load roundtrip preserves profiles and env", () => {
    const cfg: HatsConfig = {
      version: 1,
      profiles: {
        relay: {
          name: "relay",
          desc: "d",
          launch: "claude",
          env: { ANTHROPIC_BASE_URL: "https://relay.example" },
        },
      },
    };
    saveConfig(cfg);
    const loaded = loadConfig();
    assert.deepEqual(loaded.profiles.relay, cfg.profiles.relay);
  });

  test("configPath respects $HATS_HOME", () => {
    assert.equal(configPath(), join(tmpHome, "config.toml"));
  });

  test("load warns about unknown profile fields", () => {
    writeFileSync(configPath(), 'version = 1\n[profiles.old]\nlaunch = "codex"\nkind = "legacy"\n');
    const errors: string[] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => errors.push(args.join(" "));
    try {
      loadConfig();
    } finally {
      console.error = original;
    }
    assert.match(errors.join("\n"), /profiles\.old\.kind.*unknown/i);
  });

  test("save warns when a plaintext secret is written", () => {
    const errors: string[] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => errors.push(args.join(" "));
    try {
      saveConfig({ version: 1, profiles: { x: { name: "x", env: { API_TOKEN: "plaintext" } } } });
    } finally {
      console.error = original;
    }
    assert.match(errors.join("\n"), /API_TOKEN.*plaintext.*cmd:/i);
  });

  test("replacing an existing config keeps one recoverable .bak", () => {
    saveConfig({ version: 1, profiles: { before: { name: "before", launch: "codex" } } });
    const before = readFileSync(configPath(), "utf8");
    saveConfig({ version: 1, profiles: { after: { name: "after", launch: "claude" } } });
    assert.equal(readFileSync(`${configPath()}.bak`, "utf8"), before);
  });
});

describe("profile", () => {
  test("getProfile throws ProfileError when the name is missing", () => {
    assert.throws(() => getProfile(defaultConfig(), "nope"), ProfileError);
  });

  test("validateProfile flags an empty name", () => {
    assert.ok(
      validateProfile({ name: "" } as Profile).includes("name is required"),
      "empty name is flagged",
    );
  });

  test("validateProfile passes a well-formed profile", () => {
    const errs = validateProfile({ name: "x", launch: "claude" });
    assert.equal(errs.length, 0);
  });
});
