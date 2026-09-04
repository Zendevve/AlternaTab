import { describe, expect, it } from "vitest";

describe("Multi-Tab Staging Logic", () => {
  it("toggles tab IDs in and out of a Set", () => {
    let staged = new Set<number>();

    const toggle = (id: number) => {
      const next = new Set(staged);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      staged = next;
    };

    toggle(101);
    expect(staged.has(101)).toBe(true);
    expect(staged.size).toBe(1);

    toggle(102);
    expect(staged.has(101)).toBe(true);
    expect(staged.has(102)).toBe(true);
    expect(staged.size).toBe(2);

    toggle(101);
    expect(staged.has(101)).toBe(false);
    expect(staged.has(102)).toBe(true);
    expect(staged.size).toBe(1);
  });

  it("formats markdown links for batch copy", () => {
    const tabs = [
      { id: 1, title: "GitHub - Repo", url: "https://github.com/repo", domain: "github.com" },
      { id: 2, title: "", url: "https://example.com", domain: "example.com" },
      { id: 3, title: "Docs", url: "https://docs.example.com", domain: "docs.example.com" },
    ];

    const stagedIds = [1, 3];
    const matched = tabs.filter((t) => stagedIds.includes(t.id));
    const markdown = matched
      .map((t) => `- [${t.title || t.domain}](${t.url})`)
      .join("\n");

    expect(markdown).toBe(
      "- [GitHub - Repo](https://github.com/repo)\n- [Docs](https://docs.example.com)",
    );
  });
});
