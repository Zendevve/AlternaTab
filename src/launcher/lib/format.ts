/**
 * Formatting utilities for the UI
 */

export function formatDomain(host: string): string {
  // Strip common subdomains for cleaner display
  return host.replace(/^www\./, '');
}

export function formatPath(path: string): string {
  if (!path || path === '/') return '';
  return path;
}
