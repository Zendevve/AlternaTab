import { describe, expect, it } from "vitest";
import type { TabItem } from "../../src/types/models";
import { highlightText, parseQuery, searchTabs } from "../../src/utils/search";

describe("Search & Parsing", () => {
  it("parses search prefixes correctly", () => {
    expect(parseQuery("@github")).toEqual({ scope: "tabs", query: "github" });
    expect(parseQuery("#work")).toEqual({ scope: "groups", query: "work" });
    expect(parseQuery("*react")).toEqual({ scope: "bookmarks", query: "react" });
    expect(parseQuery(">close")).toEqual({ scope: "commands", query: "close" });
    expect(parseQuery("plain text")).toEqual({ scope: "default", query: "plain text" });
  });

  it("highlights substring matches cleanly without HTML injection", () => {
    const parts = highlightText("GitHub - Where the world builds software", "world");
    expect(parts).toHaveLength(3);
    expect(parts[0]).toEqual({ text: "GitHub - Where the ", highlight: false });
    expect(parts[1]).toEqual({ text: "world", highlight: true });
    expect(parts[2]).toEqual({ text: " builds software", highlight: false });
  });

  it("handles empty query and empty text in highlightText", () => {
    expect(highlightText("", "test")).toEqual([]);
    expect(highlightText("Hello", "")).toEqual([{ text: "Hello", highlight: false }]);
  });

  it("searches across 250 tabs efficiently", () => {
    const tabs: TabItem[] = [];
    for (let i = 0; i < 250; i++) {
      tabs.push({
        id: i + 1,
        windowId: 1,
        index: i,
        title: `Tab Title ${i} - ${i % 2 === 0 ? "Work Project" : "Personal Fun"}`,
        url: `https://${i % 2 === 0 ? "github.com" : "youtube.com"}/item/${i}`,
        domain: i % 2 === 0 ? "github.com" : "youtube.com",
        pinned: i === 0,
        audible: false,
        muted: false,
        discarded: false,
        groupId: -1,
        lastAccessed: 1000 + i,
        lastActivatedAt: 1000 + i,
        activationCount: i,
        frecencyScore: 1.0,
      });
    }

    const start = performance.now();
    const results = searchTabs(tabs, "Personal Fun");
    const elapsed = performance.now() - start;

    expect(results.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(20);
  });
});
