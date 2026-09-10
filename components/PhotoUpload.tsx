"use client";

import { useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useGuest } from "@/lib/guest";
import { shrinkImage } from "@/lib/image";

export default function PhotoUpload() {
  const { guest } = useGuest();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0 || !guest) return;

    setError(null);
    const list = Array.from(files);
    setBusy({ done: 0, total: list.length });

    let failed = 0;

    // Nacheinander statt parallel: im überfüllten Party-WLAN kommen
    // fünf gleichzeitige Uploads seltener durch als fünf hintereinander.
    for (const [index, file] of list.entries()) {
      try {
        const { full, thumb, extension } = await shrinkImage(file);

        // Pfad mit Gast-ID vorne: so kollidieren zwei Leute nie,
        // die gleichzeitig "IMG_1234.jpg" hochladen.
        const base = `${guest.id}/${Date.now()}-${index}`;
        const path = `${base}.${extension}`;
        const thumbPath = thumb ? `${base}-thumb.jpg` : null;

        const upload = await supabase.storage
          .from("photos")
          .upload(path, full, { contentType: full.type || "image/jpeg" });

        if (upload.error) throw upload.error;

        if (thumb && thumbPath) {
          // Scheitert das Thumbnail, ist das kein Grund zum Abbruch —
          // die Galerie faellt dann auf das grosse Bild zurueck.
          await supabase.storage
            .from("photos")
            .upload(thumbPath, thumb, { contentType: "image/jpeg" });
        }

        const insert = await supabase.from("photos").insert({
          storage_path: path,
          thumb_path: thumbPath,
          uploaded_by: guest.name,
          guest_id: guest.id,
        });

        if (insert.error) throw insert.error;
      } catch {
        failed += 1;
      }

      setBusy({ done: index + 1, total: list.length });
    }

    setBusy(null);
    if (inputRef.current) inputRef.current.value = "";

    if (failed > 0) {
      setError(
        failed === list.length
          ? "Hat nicht geklappt. Netz kurz weg? Nochmal versuchen."
          : `${failed} von ${list.length} Bildern kamen nicht durch.`,
      );
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />

      <button
        onClick={() => inputRef.current?.click()}
        disabled={!!busy}
        className="w-full rounded-2xl bg-amber py-4 font-display font-bold text-ink disabled:opacity-50"
      >
        {busy
          ? `Lädt hoch … ${busy.done} von ${busy.total}`
          : "Fotos hinzufügen"}
      </button>

      {error && <p className="mt-2 text-sm text-pink">{error}</p>}
    </div>
  );
}
