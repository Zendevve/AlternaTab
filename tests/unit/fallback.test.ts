import { describe, expect, it } from "vitest";
import { getEngineTemplate, getFallbackItems } from "../../src/utils/search/fallback";

describe("web fallback engine", () => {
  it("resolves engine templates correctly", () => {
    expect(getEngineTemplate("google", "")).toBe("https://www.google.com/search?q={q}");
    expect(getEngineTemplate("duckduckgo", "")).toBe("https://duckduckgo.com/?q={q}");
    expect(getEngineTemplate("bing", "")).toBe("https://www.bing.com/search?q={q}");
    expect(getEngineTemplate("custom", "https://kagi.com/search?q={q}")).toBe("https://kagi.com/search?q={q}");
    expect(getEngineTemplate("custom", "invalid-template")).toBe("https://www.google.com/search?q={q}");
  });

  it("builds fallback items based on selected engine", () => {
    const itemsGoogle = getFallbackItems("query term", "google");
    expect(itemsGoogle).toHaveLength(1);
    expect(itemsGoogle[0]?.url).toBe("https://www.google.com/search?q=query%20term");
    expect(itemsGoogle[0]?.title).toBe("Search Google: query term");

    const itemsDdg = getFallbackItems("query term", "duckduckgo");
    expect(itemsDdg).toHaveLength(1);
    expect(itemsDdg[0]?.url).toBe("https://duckduckgo.com/?q=query%20term");
    expect(itemsDdg[0]?.title).toBe("Search DuckDuckGo: query term");

    const itemsBing = getFallbackItems("query term", "bing");
    expect(itemsBing).toHaveLength(1);
    expect(itemsBing[0]?.url).toBe("https://www.bing.com/search?q=query%20term");
    expect(itemsBing[0]?.title).toBe("Search Bing: query term");
  });

  it("returns empty array for url-like queries or empty queries", () => {
    expect(getFallbackItems("")).toHaveLength(0);
    expect(getFallbackItems("   ")).toHaveLength(0);
    expect(getFallbackItems("https://github.com")).toHaveLength(0);
    expect(getFallbackItems("github.com/pulls")).toHaveLength(0);
  });
});
