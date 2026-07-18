import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { isRemovalConfirmed } from "../src/commands/rm.js";

describe("rm", () => {
  test("only an explicit yes permits deletion", () => {
    assert.equal(isRemovalConfirmed(true), true);
    assert.equal(isRemovalConfirmed(false), false);
    assert.equal(isRemovalConfirmed(Symbol("cancel")), false);
  });
});
