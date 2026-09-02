import { describe, expect, it } from "vitest";
import {
  expandTemplate,
  findMatchingBangs,
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

  it("resolves multi-alias bangs (Helium-inspired)", () => {
    // Letterboxd aliases
    const lb = getTemplate("lb");
    const lbx = getTemplate("lbx");
    const letterboxd = getTemplate("letterboxd");
    expect(lb).toBeDefined();
    expect(lb?.domain).toBe("letterboxd.com");
    expect(lbx?.domain).toBe("letterboxd.com");
    expect(letterboxd?.domain).toBe("letterboxd.com");

    // ChatGPT aliases
    expect(getTemplate("cgpt")?.domain).toBe("chatgpt.com");
    expect(getTemplate("chatgpt")?.domain).toBe("chatgpt.com");

    // Claude
    expect(getTemplate("claude")?.domain).toBe("claude.ai");

    // StackOverflow aliases
    expect(getTemplate("so")?.domain).toBe("stackoverflow.com");
    expect(getTemplate("ov")?.domain).toBe("stackoverflow.com");
    expect(getTemplate("stack")?.domain).toBe("stackoverflow.com");

    // Chromium Code
    expect(getTemplate("crcode")?.domain).toBe("source.chromium.org");

    // Steam & Kagi
    expect(getTemplate("ste")?.domain).toBe("store.steampowered.com");
    expect(getTemplate("k")?.domain).toBe("kagi.com");
  });

  it("finds matching bangs for discovery and exploration", () => {
    const letterboxdMatches = findMatchingBangs("letterboxd");
    expect(letterboxdMatches.length).toBeGreaterThan(0);
    expect(letterboxdMatches[0]!.template.title).toBe("Letterboxd");
    expect(letterboxdMatches[0]!.allAliases).toContain("lb");
    expect(letterboxdMatches[0]!.allAliases).toContain("lbx");

    const bangMatches = findMatchingBangs("!l");
    expect(bangMatches.some((m) => m.template.title === "Letterboxd")).toBe(true);

    const emptyMatches = findMatchingBangs("");
    expect(emptyMatches.length).toBeGreaterThan(10);
  });

  it("parses multi-alias bang queries and expands URLs", () => {
    const parsed = parseBangQuery("!lb Dune 2");
    expect(parsed).not.toBeNull();
    expect(parsed?.templateId).toBe("lb");
    expect(parsed?.query).toBe("Dune 2");
    if (parsed) {
      const res = getTemplateResult(parsed);
      expect(res.url).toBe("https://letterboxd.com/search/Dune%202/");
      expect(res.domain).toBe("letterboxd.com");
    }
  });
});
