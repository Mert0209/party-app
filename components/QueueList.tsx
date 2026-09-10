"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useGuest } from "@/lib/guest";
import { useLiveReload } from "@/lib/live";
import type { Song } from "@/lib/types";

type Row = Song & { votes: number; voted: boolean };

export default function QueueList() {
  const { guest } = useGuest();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (guestId: string) => {
    // Zwei Abfragen statt einer mit Join: bei ein paar Dutzend Songs
    // ist das schneller getippt und genauso schnell ausgeführt.
    const [songsRes, votesRes] = await Promise.all([
      supabase
        .from("songs")
        .select("*")
        .eq("status", "queued")
        .order("created_at", { ascending: true }),
      supabase
        .from("song_votes")
        .select("song_id, guest_id")
        .eq("phase", "queue"),
    ]);

    const votes = votesRes.data ?? [];

    const merged: Row[] = (songsRes.data ?? []).map((song) => ({
      ...song,
      votes: votes.filter((v) => v.song_id === song.id).length,
      voted: votes.some(
        (v) => v.song_id === song.id && v.guest_id === guestId,
      ),
    }));

    // Meiste Stimmen zuerst; bei Gleichstand gewinnt, wer früher dran war.
    merged.sort(
      (a, b) =>
        b.votes - a.votes ||
        a.created_at.localeCompare(b.created_at),
    );

    setRows(merged);
    setLoading(false);
  }, []);

  const scheduleReload = useLiveReload(() => {
    if (guest) load(guest.id);
  });

  useEffect(() => {
    if (!guest) return;

    load(guest.id);

    const channel = supabase
      .channel("queue")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "songs" },
        () => scheduleReload(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "song_votes" },
        () => scheduleReload(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [guest, load, scheduleReload]);

  async function toggleVote(row: Row) {
    if (!guest) return;

    // Sofort umschalten, damit der Tap sich nicht nach Warten anfühlt.
    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id
          ? { ...r, voted: !r.voted, votes: r.votes + (r.voted ? -1 : 1) }
          : r,
      ),
    );

    if (row.voted) {
      await supabase
        .from("song_votes")
        .delete()
        .match({ song_id: row.id, guest_id: guest.id, phase: "queue" });
    } else {
      await supabase.from("song_votes").upsert(
        {
          song_id: row.id,
          guest_id: guest.id,
          phase: "queue",
          value: 1,
        },
        { onConflict: "song_id,guest_id,phase" },
      );
    }
  }

  if (loading) {
    return (
      <div className="mt-6 space-y-2">
        <div className="h-16 animate-pulse rounded-2xl bg-ink-raised" />
        <div className="h-16 animate-pulse rounded-2xl bg-ink-raised" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="mt-8 text-center text-muted">
        Die Liste ist leer. Mach den Anfang.
      </p>
    );
  }

  return (
    <ul className="mt-6 space-y-2">
      {rows.map((row, index) => (
        <li
          key={row.id}
          className="flex items-center gap-3 rounded-2xl border border-ink-line px-4 py-3"
        >
          {/* Die Position ist echte Information: sie sagt, was als
              Nächstes drankommt. Deshalb steht sie hier. */}
          <span className="w-5 shrink-0 font-display text-sm text-muted">
            {index + 1}
          </span>

          <span className="min-w-0 flex-1">
            <span className="block truncate font-display font-bold">
              {row.title}
            </span>
            <span className="block truncate text-sm text-muted">
              {row.artist ? `${row.artist} · ` : ""}
              {row.added_by}
            </span>
          </span>

          <button
            onClick={() => toggleVote(row)}
            aria-pressed={row.voted}
            aria-label={`Für ${row.title} stimmen, aktuell ${row.votes}`}
            className={`flex min-h-11 min-w-14 shrink-0 items-center justify-center gap-1 rounded-full px-3 font-display font-bold transition-colors ${
              row.voted
                ? "bg-pink text-ink"
                : "border border-ink-line text-cream active:bg-ink-line"
            }`}
          >
            <span aria-hidden>▲</span>
            {row.votes}
          </button>
        </li>
      ))}
    </ul>
  );
}
