import assert from "node:assert/strict";
import test from "node:test";
import { calculateCombinedRating, lookupCriteria, monthlyCompensation } from "./cfr-criteria";
import { extractMetrics } from "./extract";
import { introducesNewNumbers } from "./guard";

test("50 and 30 combine to 70 under VA math", () => {
  const result = calculateCombinedRating([30, 50]);
  assert.equal(result.whole, 65);
  assert.equal(result.rounded, 70);
});

test("10 and 10 combine to 20", () => {
  assert.equal(calculateCombinedRating([10, 10]).rounded, 20);
});

test("40 and 20 combine to 50", () => {
  assert.equal(calculateCombinedRating([40, 20]).rounded, 50);
});

test("70, 40, and 20 combine to 90", () => {
  assert.equal(calculateCombinedRating([20, 70, 40]).rounded, 90);
});

test("empty ratings combine to 0", () => {
  assert.equal(calculateCombinedRating([]).rounded, 0);
});

test("2026 veteran-alone 40% rate matches the published table", () => {
  assert.equal(monthlyCompensation(40), 795.84);
  assert.equal(monthlyCompensation(40, { spouse: true }), 882.84);
  assert.equal(monthlyCompensation(10, { spouse: true, childrenUnder18: 3 }), 180.42);
  assert.equal(monthlyCompensation(0), 0);
  assert.equal(monthlyCompensation(15), null);
});

test("70% with a spouse and 3 children under 18 matches VA's worked example", () => {
  assert.equal(monthlyCompensation(70, { spouse: true, childrenUnder18: 3 }), 2226.45);
});

test("40% household rows add the first child, extra children, a parent, and a school child", () => {
  assert.equal(monthlyCompensation(40, { spouse: true, childrenUnder18: 1 }), 947.84);
  assert.equal(monthlyCompensation(40, { spouse: true, childrenUnder18: 2 }), 990.84);
  assert.equal(monthlyCompensation(40, { dependentParents: 1 }), 865.84);
  assert.equal(monthlyCompensation(40, { childrenInSchool: 1 }), 935.84);
});

test("lookup finds lumbar strain and PTSD by name", () => {
  assert.equal(lookupCriteria({ diagnosticCode: "5237" }).citation.includes("4.71a"), true);
  assert.equal(lookupCriteria({ name: "PTSD" }).diagnosticCode, "9411");
  assert.equal(lookupCriteria({ diagnosticCode: "6847" }).ratings.some((row) => row.percent === 50), true);
});

test("extractor quotes the speaker and does not fill severity that was never said", () => {
  const criterion = lookupCriteria({ diagnosticCode: "5237" });
  const metrics = extractMetrics(
    "My lower back started hurting during a field exercise years ago. Most weeks I have pain at least four days. On a bad flare I cannot unload the dishwasher, and it can take two days before I can walk the dog again. Bending to tie my shoes is the thing I avoid.",
    criterion,
  );
  assert.ok(metrics.onset.length >= 8);
  assert.ok(metrics.frequency.length >= 8);
  assert.ok(metrics.functionalImpact.length >= 8);
  assert.equal(metrics.readinessScore > 0, true);
});

test("guard rejects a draft that adds a new measurement", () => {
  assert.equal(introducesNewNumbers("I lie down about twice a month.", "I have prostrating attacks 4 times a week."), true);
  assert.equal(introducesNewNumbers("It lasts 2 days.", "The hard days last 2 days."), false);
});
