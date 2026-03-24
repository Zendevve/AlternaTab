// ============================================================
// QuickSwitch — Fuzzy Search Engine
// Optimized for tab switching: matches title and URL
// Returns scored + highlighted results
// ============================================================

function fuzzyScore(query, target) {
  if (!query) return { score: 1, indices: [] };

  const q = query.toLowerCase();
  const t = target.toLowerCase();

  // Exact substring match gets highest score
  const substringIdx = t.indexOf(q);
  if (substringIdx !== -1) {
    const indices = [];
    for (let i = substringIdx; i < substringIdx + q.length; i++) indices.push(i);
    // Bonus for matching at start
    const startBonus = substringIdx === 0 ? 0.2 : 0;
    // Bonus for matching after separator
    const sepBonus = (substringIdx > 0 && /[\s\-_/.]/.test(t[substringIdx - 1])) ? 0.1 : 0;
    return { score: 0.8 + startBonus + sepBonus, indices };
  }

  // Fuzzy match
  let qi = 0;
  let score = 0;
  const indices = [];
  let lastMatchIdx = -1;
  let consecutiveBonus = 0;

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (q[qi] === t[ti]) {
      indices.push(ti);

      // Consecutive character bonus
      if (lastMatchIdx === ti - 1) {
        consecutiveBonus += 0.15;
      } else {
        consecutiveBonus = 0;
      }

      // Start of word bonus
      const isWordStart = ti === 0 || /[\s\-_/.]/.test(t[ti - 1]);
      const wordBonus = isWordStart ? 0.3 : 0;

      // Camel case bonus
      const isCamelCase = ti > 0 && t[ti] !== target[ti]; // lowercase in target, uppercase in original
      const camelBonus = isCamelCase ? 0.2 : 0;

      // Position penalty (earlier matches are better)
      const positionScore = 1 - (ti / t.length) * 0.3;

      score += (0.1 + consecutiveBonus + wordBonus + camelBonus) * positionScore;
      lastMatchIdx = ti;
      qi++;
    }
  }

  // All characters must match
  if (qi < q.length) return null;

  // Normalize score
  const normalizedScore = Math.min(score / q.length, 1);

  return { score: normalizedScore, indices };
}

function fuzzySearch(query, items) {
  if (!query.trim()) return items.map((item, index) => ({ item, score: 1, titleIndices: [], urlIndices: [], index }));

  const results = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const titleResult = fuzzyScore(query, item.title || '');
    const urlResult = fuzzyScore(query, item.displayUrl || '');

    // Take best match between title and URL
    let bestScore = 0;
    let titleIndices = [];
    let urlIndices = [];

    if (titleResult) {
      bestScore = titleResult.score * 1.2; // Title matches weighted higher
      titleIndices = titleResult.indices;
    }
    if (urlResult && urlResult.score > bestScore) {
      bestScore = urlResult.score;
      titleIndices = [];
      urlIndices = urlResult.indices;
    } else if (urlResult) {
      urlIndices = urlResult.indices;
    }

    if (bestScore > 0) {
      // Frecency boost
      const frecencyBoost = item.frecency
        ? Math.min(item.frecency.frequency * 0.02, 0.2) +
        Math.max(0, 1 - (Date.now() - item.frecency.lastAccess) / (1000 * 60 * 60 * 24)) * 0.1
        : 0;

      results.push({
        item,
        score: bestScore + frecencyBoost,
        titleIndices,
        urlIndices,
        index: i,
      });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}

// Highlight helper: wraps matched characters in <mark>
function highlightMatches(text, indices) {
  if (!indices.length) return escapeHtml(text);

  const set = new Set(indices);
  let result = '';
  let inMark = false;

  for (let i = 0; i < text.length; i++) {
    if (set.has(i)) {
      if (!inMark) { result += '<mark>'; inMark = true; }
      result += escapeHtml(text[i]);
    } else {
      if (inMark) { result += '</mark>'; inMark = false; }
      result += escapeHtml(text[i]);
    }
  }
  if (inMark) result += '</mark>';
  return result;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"');
}

// Export for module usage
if (typeof module !== 'undefined') {
  module.exports = { fuzzyScore, fuzzySearch, highlightMatches };
}
