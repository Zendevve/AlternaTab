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

export function getEngineTemplate(engine: string, custom: string): string {
  switch (engine) {
    case "duckduckgo":
      return "https://duckduckgo.com/?q={q}";
    case "bing":
      return "https://www.bing.com/search?q={q}";
    case "custom":
      if (custom && custom.includes("{q}")) {
        try { new URL(custom.replace("{q}", "test")); return custom; } catch { return "https://www.google.com/search?q={q}"; }
      }
      return "https://www.google.com/search?q={q}";
    case "google":
    default:
      return "https://www.google.com/search?q={q}";
  }
}

export function getFallbackItems(query: string, engine: string = "google", custom: string = ""): NavigateItem[] {
  if (!query?.trim()) return [];
  if (isUrlLike(query) || isCalcQuery(query)) return [];
  const template = getEngineTemplate(engine, custom);
  const url = toSearchEngineUrl(query, template);
  let domain: string;
  try { domain = new URL(url).hostname; } catch { domain = "search"; }
  const engineLabel = engine === "duckduckgo" ? "DuckDuckGo" : engine === "bing" ? "Bing" : engine === "custom" ? "Custom" : "Google";
  const items: NavigateItem[] = [
    {
      id: `search:${engine}:${query}`,
      url,
      title: `Search ${engineLabel}: ${query}`,
      domain,
    },
  ];
  // optional history search item is handled in UI via dispatch; keep only engine item here
  return items;
}
