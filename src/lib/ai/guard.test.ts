import assert from "node:assert/strict";
import test from "node:test";
import { stitchPersonalStatement, stitchWitnessStatement } from "./guard";

test("personal statement keeps the veteran's sentences", () => {
  const statement = stitchPersonalStatement("Jordan Hale", "lumbar strain", ["I cannot unload the dishwasher."]);
  assert.match(statement, /dishwasher/);
  assert.match(statement, /Jordan Hale/);
  assert.doesNotMatch(statement, /40%/);
});

test("witness statement does not add clinical claims", () => {
  const statement = stitchWitnessStatement({
    witnessName: "Paige",
    veteranName: "Jordan Hale",
    relationshipLabel: "Spouse or partner",
    condition: "migraines",
    transcript: "Last Thursday Jordan had to lie down with the lights off.",
  });
  assert.match(statement, /Thursday/);
  assert.match(statement, /not a clinician/);
});
