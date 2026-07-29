export function createDownloadUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

export function revokeDownloadUrl(url?: string): void {
  if (!url) return;
  URL.revokeObjectURL(url);
}
