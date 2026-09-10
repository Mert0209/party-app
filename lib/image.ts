/**
 * Aus einem Handyfoto werden zwei Dateien:
 *
 *   full  — lange Kante 1600px, für die Vollbildansicht
 *   thumb — lange Kante 400px, für das Raster
 *
 * Der Grund ist Egress, nicht Speicherplatz. Das Raster zeigt bei
 * 60 Gästen tausende Bildaufrufe. Mit den Vollbildern wären das
 * mehrere Gigabyte, mit Thumbnails ein Bruchteil davon.
 */

const FULL_EDGE = 1600;
const THUMB_EDGE = 400;
const FULL_QUALITY = 0.82;
const THUMB_QUALITY = 0.7;

export type Prepared = {
  full: Blob;
  thumb: Blob | null;
  extension: string;
};

export async function shrinkImage(file: File): Promise<Prepared> {
  // imageOrientation: hochkant aufgenommene Fotos tragen ihre Drehung
  // nur im EXIF. Ohne diese Option liegen sie hinterher quer.
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Manche Formate (z.B. HEIC auf Nicht-Apple-Geräten) lassen sich
    // nicht dekodieren. Dann laden wir das Original hoch, statt den
    // Upload ganz scheitern zu lassen.
    return { full: file, thumb: null, extension: extensionOf(file) };
  }

  const full = await render(bitmap, FULL_EDGE, FULL_QUALITY);
  const thumb = await render(bitmap, THUMB_EDGE, THUMB_QUALITY);
  bitmap.close();

  if (!full) return { full: file, thumb: null, extension: extensionOf(file) };

  return { full, thumb, extension: "jpg" };
}

async function render(
  bitmap: ImageBitmap,
  maxEdge: number,
  quality: number,
): Promise<Blob | null> {
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
}

function extensionOf(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && fromName.length <= 5) return fromName;
  return "jpg";
}
