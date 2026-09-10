"use client";

import { useCallback, useEffect, useState } from "react";

const ID_KEY = "party.guestId";
const NAME_KEY = "party.guestName";

export type Guest = {
  id: string;
  name: string;
};

/**
 * crypto.randomUUID() gibt es nur im "secure context" — also HTTPS oder
 * localhost. Ruft jemand die App im WLAN über http://192.168.x.x auf,
 * fehlt die Funktion und der Aufruf wirft. crypto.getRandomValues ist
 * dagegen überall da, deshalb bauen wir die UUID im Zweifel selbst.
 */
function createId(): string {
  const c = globalThis.crypto;

  // typeof statt "in": das "in" verengt crypto im Else-Zweig auf never,
  // weil randomUUID im Crypto-Typ immer deklariert ist.
  if (typeof c?.randomUUID === "function") {
    return c.randomUUID();
  }

  const bytes = new Uint8Array(16);
  c.getRandomValues(bytes);

  // Version 4 und Variante nach RFC 4122 setzen.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
}

/**
 * Identität ohne Login: beim ersten Öffnen wird eine UUID erzeugt und
 * zusammen mit dem Namen in localStorage abgelegt. Das überlebt das
 * Schließen des Tabs, aber nicht den Wechsel des Geräts — und genau
 * das reicht für einen Abend.
 *
 * `ready` unterscheidet "noch nicht aus localStorage gelesen" von
 * "kein Name gesetzt". Ohne das blitzt beim Laden kurz die
 * Namensabfrage auf, obwohl der Name längst da ist.
 */
export function useGuest() {
  const [guest, setGuest] = useState<Guest | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fällt hier irgendetwas aus (privater Modus mit gesperrtem
    // localStorage, blockierte Crypto-API), darf die App nicht
    // schwarz bleiben — dann eben eine Identität nur für diese Sitzung.
    try {
      let id = localStorage.getItem(ID_KEY);
      if (!id) {
        id = createId();
        localStorage.setItem(ID_KEY, id);
      }

      const name = localStorage.getItem(NAME_KEY) ?? "";
      setGuest({ id, name });
    } catch (e) {
      // Fehler nicht verschlucken — auf dem Handy gibt es keine Konsole,
      // deshalb reichen wir ihn zur Anzeige durch.
      setError(e instanceof Error ? `${e.name}: ${e.message}` : String(e));
      try {
        setGuest({ id: createId(), name: "" });
      } catch (inner) {
        setError(
          inner instanceof Error
            ? `${inner.name}: ${inner.message}`
            : String(inner),
        );
      }
    } finally {
      setReady(true);
    }
  }, []);

  const setName = useCallback((name: string) => {
    const trimmed = name.trim().slice(0, 40);
    try {
      localStorage.setItem(NAME_KEY, trimmed);
    } catch {
      // Kein Speicher verfügbar — Name gilt dann nur für diese Sitzung.
    }
    setGuest((prev) => (prev ? { ...prev, name: trimmed } : prev));
  }, []);

  return { guest, ready, error, setName };
}
