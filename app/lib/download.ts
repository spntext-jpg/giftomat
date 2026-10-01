export function createDownloadUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

export function revokeDownloadUrl(url?: string): void {
  if (!url) return;
  URL.revokeObjectURL(url);
}

function clickDownloadLink(url: string, fileName: string): void {
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function triggerDownload(url: string, fileName: string): void {
  // Keep the user in the current app context. The hosting iframe must allow
  // downloads; opening blob URLs in a new tab is intentionally forbidden.
  clickDownloadLink(url, fileName);
}
