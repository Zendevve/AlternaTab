/**
 * Formatting utilities for the UI
 */

const CHROME_FAVICON_PATH = '/_favicon/';

export function formatDomain(host: string): string {
  // Strip common subdomains for cleaner display
  return host.replace(/^www\./, '');
}

export function formatPath(path: string): string {
  if (!path || path === '/') return '';
  return path;
}

export function buildFaviconSources(url: string, favIconUrl?: string): string[] {
  const pageUrl = `chrome-extension://${chrome.runtime.id}${CHROME_FAVICON_PATH}?pageUrl=${encodeURIComponent(url)}&size=32`;
  const sources: string[] = [];

  if (favIconUrl && favIconUrl.trim().length > 0) {
    sources.push(favIconUrl);
  }

  // Always keep Chrome's internal favicon endpoint as a fallback
  sources.push(pageUrl);

  return [...new Set(sources)];
}
