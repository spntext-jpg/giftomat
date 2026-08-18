export function createDownloadUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

export function revokeDownloadUrl(url?: string): void {
  if (!url) return;
  URL.revokeObjectURL(url);
}

export function triggerDownload(url: string, fileName: string): void {
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
