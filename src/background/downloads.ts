import type { DownloadItem } from "../types/models";
import { extractDomain } from "../utils/domain";

export async function getDownloads(maxResults = 100): Promise<DownloadItem[]> {
  if (typeof chrome === "undefined" || !chrome.downloads?.search) {
    return [];
  }
  try {
    const results = await chrome.downloads.search({ orderBy: ["-startTime"], limit: maxResults } as any);
    return results.map((d) => ({
      id: d.id,
      url: d.url,
      filename: d.filename || d.url,
      domain: extractDomain(d.url),
      mime: d.mime,
      state: d.state,
      fileSize: d.fileSize,
      startTime: d.startTime ?? new Date().toISOString(),
      endTime: d.endTime,
    }));
  } catch {
    return [];
  }
}

export async function openDownload(downloadId: number): Promise<void> {
  if (typeof chrome === "undefined" || !chrome.downloads?.open) {
    throw new Error("Downloads API unavailable");
  }
  await chrome.downloads.open(downloadId);
}

export async function showDownloadInFolder(downloadId: number): Promise<void> {
  if (typeof chrome === "undefined" || !chrome.downloads?.show) {
    throw new Error("Downloads API unavailable");
  }
  await chrome.downloads.show(downloadId);
}
