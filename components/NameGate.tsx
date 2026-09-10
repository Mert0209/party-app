"use client";

import { useState } from "react";
import { useGuest } from "@/lib/guest";

/**
 * Das einzige "Onboarding": Name eintragen. Kein Passwort, keine Mail.
 * Danach wird der Gate transparent und zeigt nur noch die App.
 */
export default function NameGate({ children }: { children: React.ReactNode }) {
  const { guest, ready, error, setName } = useGuest();
  const [draft, setDraft] = useState("");

  // Diagnose statt schwarzer Seite: bleibt "Einen Moment" stehen, ist
  // der Effect nie fertig geworden. Kommt gar nichts, lief kein JS.
  if (!ready) {
    return (
      <div className="screen flex items-center justify-center text-muted">
        Einen Moment …
      </div>
    );
  }

  if (error) {
    return (
      <div className="screen flex flex-col justify-center px-6">
        <p className="font-display text-xl font-bold">Da klemmt etwas</p>
        <p className="mt-2 break-words text-sm text-pink">{error}</p>
      </div>
    );
  }

  if (guest && guest.name) return <>{children}</>;

  const valid = draft.trim().length >= 2;

  return (
    <div className="screen mx-auto flex w-full max-w-md flex-col justify-center px-6">
      <h1 className="font-display text-4xl leading-[1.05] font-extrabold tracking-tight text-balance">
        Schön, dass du da bist.
      </h1>
      <p className="mt-3 text-muted">
        Sag kurz, wer du bist — dann wissen alle, von wem der Song kommt.
      </p>

      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && valid) setName(draft);
        }}
        placeholder="Dein Name"
        maxLength={40}
        autoComplete="given-name"
        autoFocus
        className="mt-8 w-full rounded-2xl border border-ink-line bg-ink-raised px-4 py-4 text-cream placeholder:text-muted/60"
      />

      <button
        onClick={() => setName(draft)}
        disabled={!valid}
        className="mt-3 w-full rounded-2xl bg-amber py-4 font-display font-bold text-ink disabled:opacity-35"
      >
        Los geht's
      </button>
    </div>
  );
}
