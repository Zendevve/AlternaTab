export function normalizeUrl(input: string): string {
  if (!input) return "";
  try {
    const url = new URL(input);

    url.hostname = url.hostname.toLowerCase();

    if (
      (url.protocol === "https:" && url.port === "443") ||
      (url.protocol === "http:" && url.port === "80")
    ) {
      url.port = "";
    }

    url.hash = "";

    if (url.pathname.length > 1) {
      url.pathname = url.pathname.replace(/\/+$/, "");
    }

    return url.toString();
  } catch {
    return input.trim();
  }
}

export function isValidUrl(input: string): boolean {
  try {
    new URL(input);
    return true;
  } catch {
    return false;
  }
}

export function isUrlLike(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  if (/^(https?:\/\/|chrome:\/\/|about:)/i.test(trimmed)) return true;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed)) return true;
  if (trimmed.includes(".") && !trimmed.includes(" ") && trimmed.length >= 4) {
    // has dot and no spaces, likely a domain
    try {
      // try to parse with https prefix
      const u = new URL(trimmed.includes("://") ? trimmed : "https://" + trimmed);
      return !!u.hostname && u.hostname.includes(".");
    } catch {
      return false;
    }
  }
  return false;
}

export function toNavigateUrl(input: string): string {
  const trimmed = input.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("chrome://") || trimmed.startsWith("about:")) return trimmed;
  return "https://" + trimmed;
}

export function toSearchEngineUrl(query: string, template?: string): string {
  const fallback = template || "https://www.google.com/search?q={q}";
  return fallback.replace("{q}", encodeURIComponent(query));
}
