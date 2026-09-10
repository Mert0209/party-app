"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useGuest } from "@/lib/guest";

export default function SongForm() {
  const { guest } = useGuest();
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = title.trim().length > 0;

  async function submit() {
    if (!valid || !guest || saving) return;

    setSaving(true);
    setError(null);

    const { error } = await supabase.from("songs").insert({
      title: title.trim(),
      artist: artist.trim() || null,
      added_by: guest.name,
      guest_id: guest.id,
      status: "queued",
    });

    setSaving(false);

    if (error) {
      // Was schiefging, nicht bloß dass etwas schiefging.
      setError("Der Wunsch kam nicht durch. Netz kurz weg? Nochmal antippen.");
      return;
    }

    // Formular leeren, Fokus bleibt — viele tragen zwei Songs am Stück ein.
    setTitle("");
    setArtist("");
  }

  return (
    <div className="rounded-2xl border border-ink-line p-4">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Song"
        maxLength={120}
        className="w-full rounded-xl bg-ink-raised px-4 py-3 placeholder:text-muted/60"
      />
      <input
        value={artist}
        onChange={(e) => setArtist(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        placeholder="Interpret (kannst du weglassen)"
        maxLength={120}
        className="mt-2 w-full rounded-xl bg-ink-raised px-4 py-3 placeholder:text-muted/60"
      />

      <button
        onClick={submit}
        disabled={!valid || saving}
        className="mt-3 w-full rounded-xl bg-amber py-3.5 font-display font-bold text-ink disabled:opacity-35"
      >
        {saving ? "Wird eingetragen …" : "Auf die Liste"}
      </button>

      {error && <p className="mt-2 text-sm text-pink">{error}</p>}
    </div>
  );
}
