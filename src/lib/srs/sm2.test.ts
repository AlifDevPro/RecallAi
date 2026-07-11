import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { previewSm2Interval, sm2Next, SM2_INITIAL } from "./sm2";

describe("sm2Next", () => {
  it("resets on again", () => {
    const next = sm2Next(
      { easiness: 2.5, interval_days: 10, repetitions: 3, lapse_count: 0 },
      "again"
    );
    assert.equal(next.repetitions, 0);
    assert.equal(next.interval_days, 1);
    assert.equal(next.lapse_count, 1);
  });

  it("grows interval on good", () => {
    const first = sm2Next(SM2_INITIAL, "good");
    assert.equal(first.repetitions, 1);
    assert.equal(first.interval_days, 1);

    const second = sm2Next(first, "good");
    assert.equal(second.repetitions, 2);
    assert.equal(second.interval_days, 6);

    const third = sm2Next(second, "good");
    assert.ok(third.interval_days >= 6);
  });

  it("preview matches next interval", () => {
    const state = sm2Next(SM2_INITIAL, "good");
    assert.equal(previewSm2Interval(state, "easy"), sm2Next(state, "easy").interval_days);
  });
});
