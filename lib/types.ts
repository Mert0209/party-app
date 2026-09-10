export type SongStatus = "queued" | "playing" | "played";

export type Song = {
  id: string;
  title: string;
  artist: string | null;
  added_by: string;
  guest_id: string;
  status: SongStatus;
  played_at: string | null;
  created_at: string;
};

export type SongVote = {
  song_id: string;
  guest_id: string;
  phase: "queue" | "live";
  value: -1 | 1;
  created_at: string;
};

export type Photo = {
  id: string;
  storage_path: string;
  caption: string | null;
  uploaded_by: string;
  guest_id: string;
  created_at: string;
};
