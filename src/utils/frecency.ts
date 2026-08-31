export interface FrecencyWeights {
  pinned: number;
  audible: number;
  currentWindow: number;
}

export const DEFAULT_FRECENCY_WEIGHTS: FrecencyWeights = {
  pinned: 1.35,
  audible: 1.5,
  currentWindow: 1.2,
};

export function calculateFrecencyScore(
  activationCount: number,
  elapsedMinutes: number,
  weights: Partial<FrecencyWeights> = {},
  halfLifeMinutes = 180,
): number {
  const safeCount = Math.max(0, activationCount);
  const safeElapsed = Math.max(0, elapsedMinutes);
  const safeHalfLife = halfLifeMinutes > 0 ? halfLifeMinutes : 180;

  const frequency = 1 + Math.log1p(safeCount);
  const decay = 2 ** (-safeElapsed / safeHalfLife);

  const wPinned = weights.pinned ?? 1.0;
  const wAudible = weights.audible ?? 1.0;
  const wCurrentWindow = weights.currentWindow ?? 1.0;

  return frequency * decay * wPinned * wAudible * wCurrentWindow;
}
