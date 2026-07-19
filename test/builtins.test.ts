import test from "node:test";
import assert from "node:assert/strict";
import { COMMANDS } from "../src/commands/index.js";
import { BUILTIN_NAMES } from "../src/core/builtins.js";

test("registered commands match completion metadata", () => {
  assert.deepEqual(
    COMMANDS.map((command) => command.name()).sort(),
    [...BUILTIN_NAMES].sort(),
  );
});
