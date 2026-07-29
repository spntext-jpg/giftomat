function inferMimeType(fileName: string, blob: Blob): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.zip')) return 'application/zip';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return blob.type || 'application/octet-stream';
}

function inferExtension(fileName: string): string {
  const match = fileName.match(/\.[^.]+$/);
  return match ? match[0].toLowerCase() : '';
}

export async function downloadBlob(blob: Blob, fileName: string): Promise<void> {
  const picker = (window as Window & {
    showSaveFilePicker?: (options: {
      suggestedName?: string;
      types?: Array<{
        description: string;
        accept: Record<string, string[]>;
      }>;
    }) => Promise<{
      createWritable: () => Promise<{
        write: (data: Blob) => Promise<void>;
        close: () => Promise<void>;
      }>;
    }>;
  }).showSaveFilePicker;

  if (typeof picker === 'function') {
    try {
      const mimeType = inferMimeType(fileName, blob);
      const extension = inferExtension(fileName);
      const handle = await picker({
        suggestedName: fileName,
        types: extension
          ? [{
              description: 'Файл Giftomat',
              accept: { [mimeType]: [extension] },
            }]
          : undefined,
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener noreferrer';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  requestAnimationFrame(() => anchor.click());
  window.setTimeout(() => {
    anchor.remove();
    URL.revokeObjectURL(url);
  }, 4000);
}
