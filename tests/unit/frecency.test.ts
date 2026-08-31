import { describe, expect, it } from "vitest";
import { calculateFrecencyScore } from "../../src/utils/frecency";

describe("calculateFrecencyScore", () => {
  it("computes base score with 0 activations and 0 elapsed time", () => {
    const score = calculateFrecencyScore(0, 0);
    // (1 + ln(1 + 0)) * 2^0 * 1 * 1 * 1 = 1.0
    expect(score).toBeCloseTo(1.0, 4);
  });

  it("decays to ~0.5 at elapsed time equal to halfLife", () => {
    const score0 = calculateFrecencyScore(10, 0, {}, 180);
    const score180 = calculateFrecencyScore(10, 180, {}, 180);
    expect(score180 / score0).toBeCloseTo(0.5, 4);
  });

  it("decays to ~0.25 at elapsed time equal to 2 * halfLife", () => {
    const score0 = calculateFrecencyScore(10, 0, {}, 180);
    const score360 = calculateFrecencyScore(10, 360, {}, 180);
    expect(score360 / score0).toBeCloseTo(0.25, 4);
  });

  it("applies weights for pinned, audible, and currentWindow", () => {
    const base = calculateFrecencyScore(5, 10, { pinned: 1.0, audible: 1.0, currentWindow: 1.0 });
    const withWeights = calculateFrecencyScore(5, 10, {
      pinned: 1.35,
      audible: 1.5,
      currentWindow: 1.2,
    });
    expect(withWeights).toBeCloseTo(base * 1.35 * 1.5 * 1.2, 4);
  });

  it("safely handles negative inputs without crashing or returning NaN", () => {
    const score = calculateFrecencyScore(-5, -10, {}, -50);
    expect(Number.isFinite(score)).toBe(true);
    expect(score).toBeGreaterThanOrEqual(1.0);
  });
});
