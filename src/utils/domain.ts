import type { TabGroupColor } from "../types/models";

const CHROME_GROUP_COLORS: TabGroupColor[] = [
  "grey",
  "blue",
  "red",
  "yellow",
  "green",
  "pink",
  "purple",
  "cyan",
  "orange",
];

export function extractDomain(urlStr: string): string {
  if (!urlStr) return "";
  try {
    const parsed = new URL(urlStr);
    return parsed.hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function getDomainColor(domain: string): TabGroupColor {
  if (!domain) return "grey";
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    hash = (hash * 31 + domain.charCodeAt(i)) >>> 0;
  }
  const color = CHROME_GROUP_COLORS[hash % CHROME_GROUP_COLORS.length];
  return color ?? "grey";
}
