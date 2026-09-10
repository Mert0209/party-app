/**
 * Ein Handyfoto ist schnell 4 MB groß. Bei 30 Gästen wäre der Speicher
 * voll und jeder Upload im vollen WLAN eine Geduldsprobe. Deshalb
 * rechnen wir vor dem Hochladen im Browser runter: lange Kante auf
 * 1600px, JPEG mit Qualität 0.82. Das landet meist bei 200-400 KB und
 * sieht auf jedem Display noch gut aus.
 */

const MAX_EDGE = 1600;
const QUALITY = 0.82;

export type Prepared = {
  blob: Blob;
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
    return { blob: file, extension: extensionOf(file) };
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return { blob: file, extension: extensionOf(file) };
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", QUALITY),
  );

  if (!blob) return { blob: file, extension: extensionOf(file) };

  return { blob, extension: "jpg" };
}

function extensionOf(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && fromName.length <= 5) return fromName;
  return "jpg";
}