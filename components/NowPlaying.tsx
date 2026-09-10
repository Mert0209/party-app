"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useGuest } from "@/lib/guest";
import type { Song } from "@/lib/types";

type Tally = { up: number; down: number; mine: -1 | 1 | null };

const EMPTY: Tally = { up: 0, down: 0, mine: null };

/**
 * Herzstück der Startseite. Zwei Realtime-Kanäle:
 *   1. songs      — wechselt der laufende Song, tauscht die Karte
 *   2. song_votes — jede Stimme im ganzen Raum landet hier binnen ~1s
 */
export default function NowPlaying() {
  const { guest } = useGuest();
  const [song, setSong] = useState<Song | null>(null);
  const [tally, setTally] = useState<Tally>(EMPTY);
  const [loading, setLoading] = useState(true);

  const loadSong = useCallback(async () => {
    const { data } = await supabase
      .from("songs")
      .select("*")
      .eq("status", "playing")
      .maybeSingle();

    setSong(data ?? null);
    setLoading(false);
  }, []);

  const loadVotes = useCallback(
    async (songId: string, guestId: string) => {
      const { data } = await supabase
        .from("song_votes")
        .select("guest_id, value")
        .eq("song_id", songId)
        .eq("phase", "live");

      const rows = data ?? [];
      setTally({
        up: rows.filter((r) => r.value === 1).length,
        down: rows.filter((r) => r.value === -1).length,
        mine:
          (rows.find((r) => r.guest_id === guestId)?.value as -1 | 1) ?? null,
      });
    },
    [],
  );

  // Welcher Song läuft?
  useEffect(() => {
    loadSong();

    const channel = supabase
      .channel("now-playing")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "songs" },
        () => loadSong(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadSong]);

  // Stimmen zum laufenden Song.
  useEffect(() => {
    if (!song || !guest) {
      setTally(EMPTY);
      return;
    }

    loadVotes(song.id, guest.id);

    const channel = supabase
      .channel(`live-votes-${song.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "song_votes",
          filter: `song_id=eq.${song.id}`,
        },
        () => loadVotes(song.id, guest.id),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [song, guest, loadVotes]);

  async function vote(value: -1 | 1) {
    if (!song || !guest) return;

    // Nochmal dieselbe Taste = Stimme zurücknehmen.
    if (tally.mine === value) {
      setTally((t) => ({
        ...t,
        mine: null,
        up: t.up - (value === 1 ? 1 : 0),
        down: t.down - (value === -1 ? 1 : 0),
      }));

      await supabase
        .from("song_votes")
        .delete()
        .match({ song_id: song.id, guest_id: guest.id, phase: "live" });
      return;
    }

    // Optimistisch aktualisieren, damit der Tap sich sofort anfühlt.
    setTally((t) => ({
      mine: value,
      up: t.up + (value === 1 ? 1 : 0) - (t.mine === 1 ? 1 : 0),
      down: t.down + (value === -1 ? 1 : 0) - (t.mine === -1 ? 1 : 0),
    }));

    await supabase.from("song_votes").upsert(
      {
        song_id: song.id,
        guest_id: guest.id,
        phase: "live",
        value,
      },
      { onConflict: "song_id,guest_id,phase" },
    );
  }

  if (loading) {
    return <div className="h-44 animate-pulse rounded-3xl bg-ink-raised" />;
  }

  if (!song) {
    return (
      <div className="rounded-3xl border border-dashed border-ink-line px-5 py-8 text-center">
        <p className="font-display text-lg font-bold">Noch ist es still</p>
        <p className="mt-1 text-sm text-muted">
          Trag den ersten Wunsch ein, dann geht es los.
        </p>
      </div>
    );
  }

  const score = tally.up - tally.down;

  return (
    <section className="relative overflow-hidden rounded-3xl bg-ink-raised px-5 py-6">
      {/* Warmer Lichtkegel hinter dem Titel — der einzige Effekt auf
          der Seite, deshalb darf er auffallen. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-16 h-56 w-56 rounded-full bg-amber/20 blur-3xl"
      />

      <div className="relative">
        <p className="flex items-center gap-2 text-sm text-amber">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber" />
          </span>
          Läuft gerade
        </p>

        <h2 className="mt-3 font-display text-3xl leading-[1.1] font-extrabold tracking-tight text-balance">
          {song.title}
        </h2>
        {song.artist && <p className="mt-1 text-muted">{song.artist}</p>}
        <p className="mt-2 text-sm text-muted">Gewünscht von {song.added_by}</p>

        <div className="mt-6 flex items-center gap-3">
          <VoteButton
            active={tally.mine === 1}
            onClick={() => vote(1)}
            label={`Gefällt mir, ${tally.up} Stimmen`}
          >
            <span aria-hidden>▲</span> {tally.up}
          </VoteButton>

          <VoteButton
            active={tally.mine === -1}
            onClick={() => vote(-1)}
            label={`Gefällt mir nicht, ${tally.down} Stimmen`}
          >
            <span aria-hidden>▼</span> {tally.down}
          </VoteButton>

          <span
            className={`ml-auto font-display text-2xl font-extrabold ${
              score > 0 ? "text-amber" : score < 0 ? "text-pink" : "text-muted"
            }`}
          >
            {score > 0 ? `+${score}` : score}
          </span>
        </div>
      </div>
    </section>
  );
}

function VoteButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`flex min-w-20 items-center justify-center gap-1.5 rounded-full px-4 py-3 font-display font-bold transition-colors ${
        active
          ? "bg-pink text-ink"
          : "border border-ink-line text-cream active:bg-ink-line"
      }`}
    >
      {children}
    </button>
  );
}
