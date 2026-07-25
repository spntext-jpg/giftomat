export interface JpegPdfPage {
  bytes: Uint8Array;
  pixelWidth: number;
  pixelHeight: number;
}

const encoder = new TextEncoder();

function copyToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function text(value: string): Uint8Array {
  return encoder.encode(value);
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}

export function buildImagePdf(
  pages: JpegPdfPage[],
  pageWidth: number,
  pageHeight: number
): Blob {
  if (!pages.length) throw new Error("PDF должен содержать хотя бы одну страницу");

  const objectCount = 2 + pages.length * 3;
  const objects: Uint8Array[] = new Array(objectCount + 1);
  const pageObjectIds: number[] = [];

  objects[1] = text("<< /Type /Catalog /Pages 2 0 R >>");

  pages.forEach((page, index) => {
    const pageId = 3 + index * 3;
    const imageId = pageId + 1;
    const contentId = pageId + 2;
    pageObjectIds.push(pageId);

    objects[pageId] = text(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
      `/Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`
    );

    objects[imageId] = concat([
      text(
        `<< /Type /XObject /Subtype /Image /Width ${page.pixelWidth} /Height ${page.pixelHeight} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.bytes.length} >>\nstream\n`
      ),
      page.bytes,
      text("\nendstream"),
    ]);

    const drawCommand = `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Im0 Do\nQ\n`;
    objects[contentId] = text(`<< /Length ${text(drawCommand).length} >>\nstream\n${drawCommand}endstream`);
  });

  objects[2] = text(
    `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`
  );

  const chunks: Uint8Array[] = [text("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n")];
  const offsets = new Array<number>(objectCount + 1).fill(0);
  let currentOffset = chunks[0].length;

  for (let id = 1; id <= objectCount; id += 1) {
    offsets[id] = currentOffset;
    const chunk = concat([text(`${id} 0 obj\n`), objects[id], text("\nendobj\n")]);
    chunks.push(chunk);
    currentOffset += chunk.length;
  }

  const xrefOffset = currentOffset;
  const xrefLines = ["xref", `0 ${objectCount + 1}`, "0000000000 65535 f "];
  for (let id = 1; id <= objectCount; id += 1) {
    xrefLines.push(`${String(offsets[id]).padStart(10, "0")} 00000 n `);
  }

  chunks.push(
    text(
      `${xrefLines.join("\n")}\ntrailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\n` +
      `startxref\n${xrefOffset}\n%%EOF\n`
    )
  );

  return new Blob([copyToArrayBuffer(concat(chunks))], { type: "application/pdf" });
}
