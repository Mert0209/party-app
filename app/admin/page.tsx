"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Song, Photo } from "@/lib/types";

type Tab = "musik" | "fotos" | "texte";
type Entry = {
  id: string;
  message: string;
  author: string;
  created_at: string;
};

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("musik");

  async function login() {
    setLoginError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      setAuthed(true);
      setPassword("");
    } else {
      setLoginError("Passwort stimmt nicht.");
    }
  }

  if (!authed) {
    return (
      <main className="screen flex flex-col justify-center">
        <h1 className="font-display text-2xl font-extrabold">Nur für Mert</h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && login()}
          placeholder="Passwort"
          className="mt-6 w-full rounded-2xl border border-ink-line bg-ink-raised px-4 py-4"
        />
        <button
          onClick={login}
          className="mt-3 w-full rounded-2xl bg-amber py-4 font-display font-bold text-ink"
        >
          Rein
        </button>
        {loginError && <p className="mt-2 text-sm text-pink">{loginError}</p>}
      </main>
    );
  }

  return (
    <main className="pt-10">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        Regie
      </h1>

      <div className="mt-5 flex gap-2">
        {(
          [
            ["musik", "Musik"],
            ["fotos", "Fotos"],
            ["texte", "Texte"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-full px-4 py-2 font-display text-sm font-bold ${
              tab === key
                ? "bg-cream text-ink"
                : "border border-ink-line text-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "musik" && <MusicControl />}
        {tab === "fotos" && <PhotoControl />}
        {tab === "texte" && <GuestbookReader />}
      </div>
    </main>
  );
}

function MusicControl() {
  const [songs, setSongs] = useState<(Song & { votes: number })[]>([]);
  const [working, setWorking] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [songsRes, votesRes] = await Promise.all([
      supabase
        .from("songs")
        .select("*")
        .in("status", ["queued", "playing"])
        .order("created_at", { ascending: true }),
      supabase.from("song_votes").select("song_id").eq("phase", "queue"),
    ]);

    const votes = votesRes.data ?? [];
    const rows = (songsRes.data ?? []).map((s) => ({
      ...s,
      votes: votes.filter((v) => v.song_id === s.id).length,
    }));

    rows.sort(
      (a, b) =>
        Number(b.status === "playing") - Number(a.status === "playing") ||
        b.votes - a.votes ||
        a.created_at.localeCompare(b.created_at),
    );

    setSongs(rows);
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("admin-songs")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "songs" },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "song_votes" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  async function play(id: string) {
    setWorking(id);
    await fetch("/api/admin/play", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ songId: id }),
    });
    setWorking(null);
  }

  if (songs.length === 0) {
    return <p className="text-muted">Nichts in der Warteschlange.</p>;
  }

  return (
    <ul className="space-y-2">
      {songs.map((song) => {
        const live = song.status === "playing";
        return (
          <li
            key={song.id}
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${
              live ? "bg-ink-raised" : "border border-ink-line"
            }`}
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate font-display font-bold">
                {song.title}
              </span>
              <span className="block truncate text-sm text-muted">
                {song.artist ? `${song.artist} · ` : ""}
                {song.votes} Stimmen · {song.added_by}
              </span>
            </span>

            {live ? (
              <span className="shrink-0 text-sm text-amber">läuft</span>
            ) : (
              <button
                onClick={() => play(song.id)}
                disabled={working === song.id}
                className="min-h-11 shrink-0 rounded-full bg-amber px-4 font-display text-sm font-bold text-ink disabled:opacity-50"
              >
                {working === song.id ? "…" : "Jetzt"}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function PhotoControl() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [confirming, setConfirming] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("photos")
      .select("*")
      .order("created_at", { ascending: false });
    setPhotos(data ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(photo: Photo) {
    await fetch("/api/admin/photo", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: photo.id, storagePath: photo.storage_path }),
    });
    setConfirming(null);
    load();
  }

  if (photos.length === 0) {
    return <p className="text-muted">Noch keine Fotos.</p>;
  }

  return (
    <div className="grid grid-cols-3 gap-1.5">
      {photos.map((photo) => {
        const url = supabase.storage
          .from("photos")
          .getPublicUrl(photo.storage_path).data.publicUrl;

        return (
          <div key={photo.id} className="relative aspect-square">
            <img
              src={url}
              alt={`Foto von ${photo.uploaded_by}`}
              loading="lazy"
              className="h-full w-full rounded-lg object-cover"
            />
            {/* Zwei Taps zum Löschen — ein versehentlicher Tap auf dem
                Handy soll kein Bild vernichten. */}
            {confirming === photo.id ? (
              <button
                onClick={() => remove(photo)}
                className="absolute inset-0 rounded-lg bg-pink/90 font-display text-sm font-bold text-ink"
              >
                Wirklich?
              </button>
            ) : (
              <button
                onClick={() => setConfirming(photo.id)}
                aria-label="Foto löschen"
                className="absolute top-1 right-1 h-8 w-8 rounded-full bg-ink/80 text-cream"
              >
                ×
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function GuestbookReader() {
  const [entries, setEntries] = useState<Entry[] | null>(null);

  useEffect(() => {
    fetch("/api/admin/guestbook")
      .then((r) => r.json())
      .then((d) => setEntries(d.entries ?? []));
  }, []);

  if (!entries) return <p className="text-muted">Lädt …</p>;

  if (entries.length === 0) {
    return <p className="text-muted">Noch nichts geschrieben.</p>;
  }

  return (
    <ul className="space-y-3">
      {entries.map((entry) => (
        <li key={entry.id} className="rounded-2xl bg-ink-raised px-4 py-4">
          <p className="leading-relaxed whitespace-pre-wrap">{entry.message}</p>
          <p className="mt-3 font-display text-sm font-bold text-amber">
            {entry.author}
          </p>
        </li>
      ))}
    </ul>
  );
}
