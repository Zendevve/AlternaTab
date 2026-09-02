import { describe, expect, it } from "vitest";
import {
  expandTemplate,
  getBundledTemplates,
  getTemplate,
  getTemplateResult,
  isBangQuery,
  isQuicklinkQuery,
  listQuicklinks,
  mergeTemplates,
  parseBangQuery,
} from "../../src/utils/search/templates";

describe("quicklinks and search templates", () => {
  it("provides 62 bundled search templates", () => {
    const bundled = getBundledTemplates();
    expect(bundled.length).toBeGreaterThanOrEqual(62);
    expect(listQuicklinks().length).toBeGreaterThanOrEqual(62);
  });

  it("identifies leading and trailing bang queries with isQuicklinkQuery", () => {
    expect(isBangQuery("!yt lo-fi beats")).toBe(true);
    expect(isQuicklinkQuery("!yt lo-fi beats")).toBe(true);
    expect(isQuicklinkQuery("react hooks !gh")).toBe(true);
    expect(isQuicklinkQuery("regular search")).toBe(false);
  });

  it("parses bang queries accurately", () => {
    const parsedLeading = parseBangQuery("!gh solidjs");
    expect(parsedLeading).not.toBeNull();
    expect(parsedLeading?.templateId).toBe("gh");
    expect(parsedLeading?.query).toBe("solidjs");

    const parsedTrailing = parseBangQuery("solidjs !gh");
    expect(parsedTrailing).not.toBeNull();
    expect(parsedTrailing?.templateId).toBe("gh");
    expect(parsedTrailing?.query).toBe("solidjs");
  });

  it("expands URL templates", () => {
    const tpl = getTemplate("yt");
    expect(tpl).toBeDefined();
    if (tpl) {
      const url = expandTemplate(tpl, "ambient space music");
      expect(url).toBe("https://www.youtube.com/results?search_query=ambient%20space%20music");
    }
  });

  it("merges custom templates overriding bundled templates on id collision", () => {
    const bundled = getBundledTemplates();
    const custom = [
      {
        id: "yt",
        title: "Custom YouTube",
        category: "quicklink",
        urlTemplate: "https://custom.youtube.com/?q={q}",
        keywords: ["video"],
      },
    ];
    const merged = mergeTemplates(bundled, custom);
    expect(merged.get("yt")?.title).toBe("Custom YouTube");
    expect(merged.get("yt")?.urlTemplate).toBe("https://custom.youtube.com/?q={q}");
  });
});
