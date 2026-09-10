"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useGuest } from "@/lib/guest";

type Signer = { author: string; created_at: string };

export default function Guestbook() {
  const { guest } = useGuest();
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signers, setSigners] = useState<Signer[]>([]);

  // Die Texte selbst sind für Gäste nicht lesbar — dafür gibt es keine
  // select-Policy. Diese Funktion gibt nur Namen und Zeitpunkt zurück.
  const loadSigners = useCallback(async () => {
    const { data } = await supabase.rpc("guestbook_signers");
    setSigners((data as Signer[]) ?? []);
  }, []);

  useEffect(() => {
    loadSigners();
  }, [loadSigners]);

  async function submit() {
    if (message.trim().length < 2 || !guest || saving) return;

    setSaving(true);
    setError(null);

    const { error } = await supabase.from("guestbook").insert({
      message: message.trim(),
      author: guest.name,
      guest_id: guest.id,
    });

    setSaving(false);

    if (error) {
      setError("Kam nicht durch. Nochmal antippen.");
      return;
    }

    setMessage("");
    setDone(true);
    loadSigners();
  }

  if (done) {
    return (
      <div className="mt-10 text-center">
        <p className="font-display text-2xl font-extrabold">Angekommen.</p>
        <p className="mt-2 text-muted">
          Das liest nur Mert — heute Abend wahrscheinlich nicht mehr.
        </p>
        <button
          onClick={() => setDone(false)}
          className="mt-6 rounded-full border border-ink-line px-6 py-3 font-display font-bold"
        >
          Noch etwas schreiben
        </button>
      </div>
    );
  }

  return (
    <div>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Schreib was du willst. Ernst, albern, egal."
        maxLength={1000}
        rows={7}
        className="w-full resize-none rounded-2xl border border-ink-line bg-ink-raised px-4 py-3 leading-relaxed placeholder:text-muted/60"
      />

      <div className="mt-1 text-right text-xs text-muted">
        {message.length}/1000
      </div>

      <button
        onClick={submit}
        disabled={message.trim().length < 2 || saving}
        className="mt-2 w-full rounded-2xl bg-amber py-4 font-display font-bold text-ink disabled:opacity-35"
      >
        {saving ? "Wird abgeschickt …" : "Abschicken"}
      </button>

      {error && <p className="mt-2 text-sm text-pink">{error}</p>}

      {signers.length > 0 && (
        <div className="mt-10">
          <p className="text-sm text-muted">
            Haben schon geschrieben ({signers.length})
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {signers.map((signer, i) => (
              <span
                key={`${signer.author}-${i}`}
                className="rounded-full border border-ink-line px-3 py-1.5 text-sm"
              >
                {signer.author}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
