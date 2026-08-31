import { describe, expect, it } from "vitest";
import { normalizeUrl } from "../../src/utils/url";

describe("normalizeUrl", () => {
  it("lowercases hostname", () => {
    expect(normalizeUrl("https://EXAMPLE.COM/path")).toBe("https://example.com/path");
  });

  it("removes default ports 80 and 443", () => {
    expect(normalizeUrl("https://example.com:443/test")).toBe("https://example.com/test");
    expect(normalizeUrl("http://example.com:80/test")).toBe("http://example.com/test");
    expect(normalizeUrl("http://example.com:8080/test")).toBe("http://example.com:8080/test");
  });

  it("removes hash fragments", () => {
    expect(normalizeUrl("https://example.com/page#section")).toBe("https://example.com/page");
  });

  it("normalizes trailing slashes on non-root paths", () => {
    expect(normalizeUrl("https://example.com/page/")).toBe("https://example.com/page");
    expect(normalizeUrl("https://example.com/")).toBe("https://example.com/");
  });

  it("preserves query parameters", () => {
    expect(normalizeUrl("https://example.com/search?q=test&page=2#heading")).toBe(
      "https://example.com/search?q=test&page=2",
    );
  });

  it("gracefully handles invalid URLs", () => {
    expect(normalizeUrl("not a valid url")).toBe("not a valid url");
  });
});
