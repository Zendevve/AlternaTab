/**
 * Local-only performance logger — never phones home.
 * Enable via localStorage.__alternatab_debug = "1" or config.debugMode
 */
export function measureLatency<T>(label: string, fn: () => T): { result: T; elapsedMs: number } {
  const start = typeof performance !== "undefined" ? performance.now() : Date.now();
  const result = fn();
  const end = typeof performance !== "undefined" ? performance.now() : Date.now();
  const elapsedMs = end - start;
  if (isDebugEnabled()) {
    // eslint-disable-next-line no-console
    console.debug(`[alternatab:perf] ${label}: ${elapsedMs.toFixed(2)}ms`);
  }
  return { result, elapsedMs };
}

export async function measureLatencyAsync<T>(label: string, fn: () => Promise<T>): Promise<{ result: T; elapsedMs: number }> {
  const start = typeof performance !== "undefined" ? performance.now() : Date.now();
  const result = await fn();
  const end = typeof performance !== "undefined" ? performance.now() : Date.now();
  const elapsedMs = end - start;
  if (isDebugEnabled()) {
    // eslint-disable-next-line no-console
    console.debug(`[alternatab:perf] ${label}: ${elapsedMs.toFixed(2)}ms`);
  }
  return { result, elapsedMs };
}

function isDebugEnabled(): boolean {
  try {
    if (typeof localStorage !== "undefined" && localStorage.getItem("__alternatab_debug") === "1") return true;
    // Also check global flag set by options
    if ((globalThis as any).__ALTERNATAB_DEBUG__ === true) return true;
  } catch {}
  return false;
}

export function logPStats(label: string, samplesMs: number[]): void {
  if (samplesMs.length === 0) return;
  const sorted = [...samplesMs].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)] ?? 0;
  const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? sorted[sorted.length - 1] ?? 0;
  const avg = samplesMs.reduce((a, b) => a + b, 0) / samplesMs.length;
  if (isDebugEnabled()) {
    // eslint-disable-next-line no-console
    console.debug(`[alternatab:perf] ${label} p50=${p50.toFixed(2)}ms p95=${p95.toFixed(2)}ms avg=${avg.toFixed(2)}ms n=${samplesMs.length}`);
  }
}

export function formatIndexSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function estimateIndexSize(obj: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(obj)).length;
  } catch {
    return JSON.stringify(String(obj)).length;
  }
}
