import { describe, expect, it } from "vitest";
import type { TabItem } from "../../src/types/models";
import {
  compareTabTieBreakers,
  sortTabsByDomain,
  sortTabsByFrecency,
  sortTabsByMRU,
  sortTabsByTitle,
} from "../../src/utils/sorting";

function createTab(partial: Partial<TabItem>): TabItem {
  return {
    id: 1,
    windowId: 1,
    index: 0,
    title: "Default Title",
    url: "https://example.com",
    domain: "example.com",
    pinned: false,
    audible: false,
    muted: false,
    discarded: false,
    groupId: -1,
    lastAccessed: 1000,
    lastActivatedAt: 1000,
    activationCount: 1,
    frecencyScore: 1.0,
    ...partial,
  };
}

describe("Tab Sorting & Tie Breakers", () => {
  it("prioritizes active tab on equal frecency", () => {
    const tab1 = createTab({ id: 1, frecencyScore: 2.0 });
    const tab2 = createTab({ id: 2, frecencyScore: 2.0 });
    const sorted = sortTabsByFrecency([tab1, tab2], 2);
    expect(sorted[0]?.id).toBe(2);
  });

  it("prioritizes pinned tab on equal frecency", () => {
    const tab1 = createTab({ id: 1, pinned: false, frecencyScore: 2.0 });
    const tab2 = createTab({ id: 2, pinned: true, frecencyScore: 2.0 });
    const sorted = sortTabsByFrecency([tab1, tab2]);
    expect(sorted[0]?.id).toBe(2);
  });

  it("breaks ties with activation count and index", () => {
    const tab1 = createTab({ id: 1, activationCount: 5, index: 2, frecencyScore: 2.0 });
    const tab2 = createTab({ id: 2, activationCount: 10, index: 3, frecencyScore: 2.0 });
    expect(compareTabTieBreakers(tab1, tab2)).toBeGreaterThan(0);
  });

  it("sorts by title alphabetically", () => {
    const a = createTab({ id: 1, title: "Apple" });
    const b = createTab({ id: 2, title: "Zebra" });
    const sorted = sortTabsByTitle([b, a]);
    expect(sorted[0]?.title).toBe("Apple");
  });

  it("sorts by domain then title", () => {
    const t1 = createTab({ id: 1, domain: "github.com", title: "Repo B" });
    const t2 = createTab({ id: 2, domain: "amazon.com", title: "Shopping" });
    const t3 = createTab({ id: 3, domain: "github.com", title: "Repo A" });
    const sorted = sortTabsByDomain([t1, t2, t3]);
    expect(sorted.map((t) => t.id)).toEqual([2, 3, 1]);
  });

  it("sorts by MRU correctly", () => {
    const t1 = createTab({ id: 1, lastActivatedAt: 500 });
    const t2 = createTab({ id: 2, lastActivatedAt: 2000 });
    const sorted = sortTabsByMRU([t1, t2]);
    expect(sorted[0]?.id).toBe(2);
  });
});
