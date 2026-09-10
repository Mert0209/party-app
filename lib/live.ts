"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Bremse für Realtime-Ereignisse.
 *
 * Ohne sie löst jede Änderung bei jedem verbundenen Gerät sofort ein
 * Neuladen aus. Bei 60 Gästen sind das 60 gleichzeitige Abfragen für
 * einen einzigen Tap — und wenn zwanzig Leute nacheinander voten,
 * hat die Datenbank binnen Sekunden ein paar Tausend Anfragen.
 *
 * Zwei Maßnahmen:
 *   1. Bündeln — ist schon ein Neuladen eingeplant, werden weitere
 *      Ereignisse verworfen. Ein Schwall wird zu einer Abfrage.
 *   2. Streuen — die Verzögerung ist zufällig, damit nicht alle
 *      Geräte in derselben Millisekunde losfragen.
 */
export function useLiveReload(load: () => void, spreadMs = 700) {
  const timer = useRef<number | null>(null);
  const latest = useRef(load);

  latest.current = load;

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  return useCallback(() => {
    if (timer.current !== null) return;

    timer.current = window.setTimeout(
      () => {
        timer.current = null;
        latest.current();
      },
      Math.random() * spreadMs,
    );
  }, [spreadMs]);
}
