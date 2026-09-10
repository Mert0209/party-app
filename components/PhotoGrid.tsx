"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Photo } from "@/lib/types";

type Item = Photo & { url: string };

export default function PhotoGrid() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Item | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("photos")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    setItems(
      (data ?? []).map((photo) => ({
        ...photo,
        // Bucket ist öffentlich, also reicht die statische URL —
        // keine signierten Links, die nach einer Stunde ablaufen.
        url: supabase.storage.from("photos").getPublicUrl(photo.storage_path)
          .data.publicUrl,
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();

    const channel = supabase
      .channel("photos")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "photos" },
        () => load(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  // Zurück-Taste schließt das Vollbild, statt die Seite zu verlassen.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (loading) {
    return (
      <div className="mt-6 grid grid-cols-3 gap-1.5">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="aspect-square animate-pulse rounded-lg bg-ink-raised" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="mt-10 text-center text-muted">
        Noch keine Bilder. Mach das erste.
      </p>
    );
  }

  return (
    <>
      <div className="mt-6 grid grid-cols-3 gap-1.5">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => setOpen(item)}
            className="aspect-square overflow-hidden rounded-lg bg-ink-raised"
          >
            {/* Bewusst <img> statt next/image: die Bilder liegen bei
                Supabase, sind schon klein, und so sparen wir uns die
                Domain-Konfiguration und den Optimierungs-Umweg. */}
            <img
              src={item.url}
              alt={`Foto von ${item.uploaded_by}`}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>

      {open && (
        <div
          onClick={() => setOpen(null)}
          className="fixed inset-0 z-60 flex flex-col items-center justify-center bg-ink/95 p-4"
        >
          <img
            src={open.url}
            alt={`Foto von ${open.uploaded_by}`}
            className="max-h-[80dvh] w-auto rounded-xl object-contain"
          />
          <p className="mt-4 text-sm text-muted">von {open.uploaded_by}</p>
          <button
            onClick={() => setOpen(null)}
            className="mt-4 rounded-full border border-ink-line px-6 py-2.5 font-display font-bold"
          >
            Schließen
          </button>
        </div>
      )}
    </>
  );
}
