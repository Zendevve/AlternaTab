import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, validateConfig } from "../../src/utils/validation";

describe("validateConfig", () => {
  it("returns valid config for defaults", () => {
    const result = validateConfig(DEFAULT_CONFIG);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.config.theme).toBe("dark");
  });

  it("handles empty or non-object input", () => {
    const result = validateConfig(null);
    expect(result.valid).toBe(false);
    expect(result.config).toEqual(DEFAULT_CONFIG);
  });

  it("validates and bounds blurRadiusPx (0-24)", () => {
    const invalidHigh = validateConfig({ blurRadiusPx: 50 });
    expect(invalidHigh.valid).toBe(false);
    expect(invalidHigh.errors[0]).toContain("blurRadiusPx");

    const invalidLow = validateConfig({ blurRadiusPx: -5 });
    expect(invalidLow.valid).toBe(false);

    const valid = validateConfig({ blurRadiusPx: 16 });
    expect(valid.valid).toBe(true);
    expect(valid.config.blurRadiusPx).toBe(16);
  });

  it("validates frecencyHalfLifeMinutes > 0", () => {
    const invalid = validateConfig({ frecencyHalfLifeMinutes: -10 });
    expect(invalid.valid).toBe(false);

    const valid = validateConfig({ frecencyHalfLifeMinutes: 60 });
    expect(valid.valid).toBe(true);
    expect(valid.config.frecencyHalfLifeMinutes).toBe(60);
  });

  it("validates maxRenderedItems between 1 and 200", () => {
    const invalid = validateConfig({ maxRenderedItems: 0 });
    expect(invalid.valid).toBe(false);

    const valid = validateConfig({ maxRenderedItems: 50 });
    expect(valid.valid).toBe(true);
    expect(valid.config.maxRenderedItems).toBe(50);
  });

  it("filters invalid domain colors", () => {
    const res = validateConfig({
      domainColors: {
        "github.com": "#123456",
        "bad.com": "not-a-color-value",
      },
    });
    expect(res.config.domainColors["github.com"]).toBe("#123456");
    expect(res.config.domainColors["bad.com"]).toBeUndefined();
  });

  it("validates defaultSearchEngine and customSearchTemplate", () => {
    const validEngine = validateConfig({ defaultSearchEngine: "duckduckgo" });
    expect(validEngine.valid).toBe(true);
    expect(validEngine.config.defaultSearchEngine).toBe("duckduckgo");

    const invalidEngine = validateConfig({ defaultSearchEngine: "unknown-engine" });
    expect(invalidEngine.valid).toBe(true);
    expect(invalidEngine.config.defaultSearchEngine).toBe("google");

    const validCustom = validateConfig({ defaultSearchEngine: "custom", customSearchTemplate: "https://kagi.com/search?q={q}" });
    expect(validCustom.valid).toBe(true);
    expect(validCustom.config.customSearchTemplate).toBe("https://kagi.com/search?q={q}");

    const invalidCustom = validateConfig({ customSearchTemplate: "https://kagi.com/search?no-placeholder=1" });
    expect(invalidCustom.valid).toBe(false);
    expect(invalidCustom.errors[0]).toContain("{q}");
  });

  it("validates enableMruCycle", () => {
    const res = validateConfig({ enableMruCycle: true });
    expect(res.valid).toBe(true);
    expect(res.config.enableMruCycle).toBe(true);
  });
});
