-- =====================================================================
--  Geburtstags-App — Schema
--  Im Supabase Dashboard unter "SQL Editor" komplett einfuegen und
--  einmal ausfuehren. Laesst sich gefahrlos wiederholen (drop + create).
-- =====================================================================

-- ---------------------------------------------------------------------
--  Aufraeumen (nur relevant, wenn du das Schema nochmal einspielst)
-- ---------------------------------------------------------------------
drop table if exists public.song_votes cascade;
drop table if exists public.songs cascade;
drop table if exists public.photos cascade;
drop table if exists public.guestbook cascade;
drop function if exists public.guestbook_signers cascade;


-- ---------------------------------------------------------------------
--  1. songs — Wunschliste + aktueller Song
-- ---------------------------------------------------------------------
create table public.songs (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 1 and 120),
  artist      text check (char_length(artist) <= 120),
  added_by    text not null check (char_length(added_by) between 1 and 40),
  guest_id    uuid not null,
  -- queued  = steht in der Warteschlange
  -- playing  = laeuft gerade (immer nur genau einer, s. Trigger unten)
  -- played  = war dran
  status      text not null default 'queued'
              check (status in ('queued', 'playing', 'played')),
  played_at   timestamptz,
  created_at  timestamptz not null default now()
);

create index songs_status_idx on public.songs (status, created_at);


-- ---------------------------------------------------------------------
--  2. song_votes — getrennt nach Phase
--
--  phase = 'queue' : Priorisierung der Warteschlange, nur Upvotes
--  phase = 'live'  : Stimmungsbarometer zum laufenden Song, up + down
--
--  Der Primaerschluessel (song_id, guest_id, phase) sorgt dafuer, dass
--  jeder Gast pro Song und Phase genau eine Stimme hat.
-- ---------------------------------------------------------------------
create table public.song_votes (
  song_id     uuid not null references public.songs(id) on delete cascade,
  guest_id    uuid not null,
  phase       text not null check (phase in ('queue', 'live')),
  value       smallint not null check (value in (-1, 1)),
  created_at  timestamptz not null default now(),
  primary key (song_id, guest_id, phase),
  -- In der Warteschlange gibt es kein Downvote.
  constraint queue_is_upvote_only check (phase <> 'queue' or value = 1)
);

create index song_votes_song_idx on public.song_votes (song_id, phase);


-- ---------------------------------------------------------------------
--  3. photos — geteiltes Album
--     Die Datei selbst liegt im Storage, hier steht nur der Pfad.
-- ---------------------------------------------------------------------
create table public.photos (
  id            uuid primary key default gen_random_uuid(),
  storage_path  text not null unique,
  thumb_path    text unique,
  caption       text check (char_length(caption) <= 140),
  uploaded_by   text not null check (char_length(uploaded_by) between 1 and 40),
  guest_id      uuid not null,
  created_at    timestamptz not null default now()
);

create index photos_created_idx on public.photos (created_at desc);


-- ---------------------------------------------------------------------
--  4. guestbook — private Nachrichten an dich
--     Absichtlich NICHT oeffentlich lesbar (s. RLS weiter unten).
-- ---------------------------------------------------------------------
create table public.guestbook (
  id          uuid primary key default gen_random_uuid(),
  message     text not null check (char_length(message) between 1 and 1000),
  author      text not null check (char_length(author) between 1 and 40),
  guest_id    uuid not null,
  created_at  timestamptz not null default now()
);


-- ---------------------------------------------------------------------
--  Trigger: es kann immer nur ein Song 'playing' sein
--  Wird ein Song auf 'playing' gesetzt, wandern alle anderen auf 'played'.
-- ---------------------------------------------------------------------
create or replace function public.enforce_single_playing()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'playing' then
    update public.songs
       set status    = 'played',
           played_at = coalesce(played_at, now())
     where status = 'playing'
       and id <> new.id;

    new.played_at := coalesce(new.played_at, now());
  end if;
  return new;
end;
$$;

create trigger songs_single_playing
  before insert or update of status on public.songs
  for each row
  execute function public.enforce_single_playing();


-- ---------------------------------------------------------------------
--  Funktion: wer hat sich ins Gaestebuch eingetragen
--  Gibt bewusst NUR Name + Zeitpunkt zurueck, niemals den Text.
--  security definer = laeuft mit den Rechten des Besitzers und darf
--  deshalb die Tabelle lesen, obwohl anon das nicht darf.
-- ---------------------------------------------------------------------
create or replace function public.guestbook_signers()
returns table (author text, created_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select g.author, g.created_at
    from public.guestbook g
   order by g.created_at desc
   limit 200;
$$;

grant execute on function public.guestbook_signers() to anon;


-- =====================================================================
--  Row Level Security
--
--  Wichtig: der anon-Key steht im Browser und ist damit oeffentlich.
--  Ohne die folgenden Policies koennte jeder Gast per Konsole alles
--  loeschen. Grundregel hier:
--    - lesen und einfuegen darf jeder
--    - aendern und loeschen darf niemand ueber den anon-Key
--  Deine Admin-Ansicht laeuft ueber Server-Routen mit dem
--  Service-Role-Key, und der umgeht RLS komplett.
-- =====================================================================

alter table public.songs      enable row level security;
alter table public.song_votes enable row level security;
alter table public.photos     enable row level security;
alter table public.guestbook  enable row level security;


-- songs: lesen + neue Wuensche eintragen.
-- Der with-check verhindert, dass ein Gast sich selbst auf 'playing' setzt.
create policy songs_select on public.songs
  for select to anon using (true);

create policy songs_insert on public.songs
  for insert to anon with check (status = 'queued' and played_at is null);


-- song_votes: lesen, abstimmen, Stimme aendern, Stimme zuruecknehmen.
--
-- Bewusster Kompromiss: weil es keinen Login gibt, ist guest_id nur
-- behauptet und nicht geprueft. Wer Devtools aufmacht, koennte fremde
-- Stimmen aendern. Fuer eine Geburtstagsfeier ist das okay — sobald du
-- so etwas oeffentlich betreibst, muss hier echte Auth hin.
create policy song_votes_select on public.song_votes
  for select to anon using (true);

create policy song_votes_insert on public.song_votes
  for insert to anon with check (true);

create policy song_votes_update on public.song_votes
  for update to anon using (true) with check (true);

create policy song_votes_delete on public.song_votes
  for delete to anon using (true);


-- photos: alle sehen alles, hochladen darf jeder, loeschen nur du.
create policy photos_select on public.photos
  for select to anon using (true);

create policy photos_insert on public.photos
  for insert to anon with check (true);


-- guestbook: NUR einfuegen. Kein select fuer anon —
-- die Texte sind fuer dich, nicht fuer die Party.
create policy guestbook_insert on public.guestbook
  for insert to anon with check (true);


-- =====================================================================
--  Realtime — nur diese Tabellen pushen Aenderungen an die Clients
-- =====================================================================
alter publication supabase_realtime add table public.songs;
alter publication supabase_realtime add table public.song_votes;
alter publication supabase_realtime add table public.photos;


-- =====================================================================
--  Storage-Bucket fuer die Fotowand
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

drop policy if exists photos_bucket_read   on storage.objects;
drop policy if exists photos_bucket_upload on storage.objects;

create policy photos_bucket_read on storage.objects
  for select to anon
  using (bucket_id = 'photos');

create policy photos_bucket_upload on storage.objects
  for insert to anon
  with check (bucket_id = 'photos');
