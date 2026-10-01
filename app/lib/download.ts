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
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function isEmbeddedInFrame(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    // Cross-origin parent: `top` is inaccessible, so the page is embedded.
    return true;
  }
}

export function triggerDownload(url: string, fileName: string): void {
  // The Bitrix24 preview embeds the app in an iframe. There the browser ignores
  // the `download` attribute on blob: URLs, so a plain link click silently does
  // nothing. Opening the blob in a new tab (a user gesture from the button) lets
  // the top-level browsing context download or display it. Outside an iframe the
  // temporary-anchor click is kept because it preserves the file name.
  if (isEmbeddedInFrame() && window.open(url, "_blank")) return;
  clickDownloadLink(url, fileName);
}
