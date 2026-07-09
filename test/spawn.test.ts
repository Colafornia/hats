import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { parseLaunch } from "../src/core/spawn.js";

describe("parseLaunch (tokenizes without a shell, rejects operators)", () => {
  test("single command", () => {
    assert.deepEqual(parseLaunch("claude"), ["claude"]);
  });

  test("splits on whitespace", () => {
    assert.deepEqual(parseLaunch("ollama launch claude --model glm-5.2:cloud"), [
      "ollama",
      "launch",
      "claude",
      "--model",
      "glm-5.2:cloud",
    ]);
  });

  test("preserves a quoted arg as a single token", () => {
    assert.deepEqual(parseLaunch('claude --x "a b"'), ["claude", "--x", "a b"]);
  });

  test("rejects the && operator (no shell chaining)", () => {
    assert.throws(() => parseLaunch("claude && rm -rf /"), /shell operator/);
  });

  test("rejects the | operator (no pipe)", () => {
    assert.throws(() => parseLaunch("claude | tee log"), /shell operator/);
  });

  test("rejects the ; operator (no sequencing)", () => {
    assert.throws(() => parseLaunch("claude; echo done"), /shell operator/);
  });

  test("rejects an empty launch string", () => {
    assert.throws(() => parseLaunch("   "), /empty/);
  });
});