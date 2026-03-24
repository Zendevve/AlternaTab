/**
 * Ranking Configuration
 *
 * Centralized scoring constants for tab search ranking.
 * All magic numbers are now named constants for maintainability.
 */

export const RANKING = {
  // Match weights
  TITLE_MATCH: 100,
  HOST_MATCH: 50,
  URL_MATCH: 20,

  // Bonus weights
  PINNED_BONUS: 10,

  // Penalty weights
  CURRENT_TAB_PENALTY: 20,

  // MRU weight (negative = lower rank index = higher score)
  MRU_WEIGHT: -1,

  // Minimum score threshold to include in results
  MIN_SCORE_THRESHOLD: -9000,

  // Maximum MRU rank to consider for bonus
  // MRU ranks beyond this don't get additional scoring benefit
  MAX_MRU_RANK_BONUS: 10,
} as const;

// MRU bonus tiers for more nuanced recency scoring
export const MRU_BONUS_TIERS = [
  { maxRank: 0, bonus: 30 },   // Most recently used
  { maxRank: 3, bonus: 20 },   // Top 3
  { maxRank: 10, bonus: 10 },  // Top 10
] as const;

/**
 * Get MRU bonus based on rank
 */
export function getMruBonus(rank: number): number {
  for (const tier of MRU_BONUS_TIERS) {
    if (rank <= tier.maxRank) {
      return tier.bonus;
    }
  }
  return 0;
}

/**
 * Calculate score for a single tab
 */
export function calculateScore(
  titleMatch: boolean,
  hostMatch: boolean,
  urlMatch: boolean,
  mruRank: number,
  isPinned: boolean,
  isCurrentTab: boolean
): number {
  let score = 0;

  // Match bonuses
  if (titleMatch) score += RANKING.TITLE_MATCH;
  if (hostMatch) score += RANKING.HOST_MATCH;
  if (urlMatch) score += RANKING.URL_MATCH;

  // MRU bonus (using tiered approach)
  score += getMruBonus(mruRank);

  // Pin bonus
  if (isPinned) score += RANKING.PINNED_BONUS;

  // Current tab penalty
  if (isCurrentTab) score -= RANKING.CURRENT_TAB_PENALTY;

  return score;
}
