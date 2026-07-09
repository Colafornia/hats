import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
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