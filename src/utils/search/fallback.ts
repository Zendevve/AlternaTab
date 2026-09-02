import { isUrlLike, toNavigateUrl, toSearchEngineUrl } from "../url";
import { evaluateCalc, getCalcExpression, isCalcQuery } from "../calc";

export interface NavigateItem {
  id: string;
  url: string;
  title: string;
  domain: string;
}

export interface CalcItem {
  id: string;
  expression: string;
  result: number;
  title: string;
}

export function getNavigateItem(query: string): NavigateItem | null {
  if (!query?.trim()) return null;
  if (isUrlLike(query)) {
    const url = toNavigateUrl(query);
    try {
      const u = new URL(url);
      return {
        id: `nav:${url}`,
        url,
        title: `Go to ${url}`,
        domain: u.hostname,
      };
    } catch {
      return null;
    }
  }
  return null;
}

export function getCalcItem(query: string): CalcItem | null {
  if (!isCalcQuery(query)) return null;
  const expr = getCalcExpression(query);
  const result = evaluateCalc(expr);
  if (result === null) return null;
  return {
    id: `calc:${expr}`,
    expression: expr,
    result,
    title: `${expr} = ${result}`,
  };
}

export function getSearchFallbackItem(query: string): NavigateItem | null {
  if (!query?.trim()) return null;
  // If it's url-like or calc, fallback is not needed (those win)
  if (isUrlLike(query) || isCalcQuery(query)) return null;
  const url = toSearchEngineUrl(query);
  return {
    id: `search:${query}`,
    url,
    title: `Search with Google: ${query}`,
    domain: "google.com",
  };
}
