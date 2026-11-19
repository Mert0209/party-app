# party-app

Eine Web-App für meine Geburtstagsfeier. Die Gäste scannen einen QR-Code, tragen ihren Namen ein und können dann vom Handy aus Musik wünschen, Fotos teilen und mir eine Nachricht hinterlassen. Ein Konto oder eine App-Installation braucht niemand.

## Funktionen

- **Musikwünsche:** Gäste tragen Songs ein und stimmen per Upvote ab. Was die meisten Stimmen hat, steht oben.
- **Läuft gerade:** Die Startseite zeigt den aktuellen Song. Die Gäste können ihn mit Daumen hoch oder runter bewerten, das Ergebnis aktualisiert sich bei allen live.
- **Fotowand:** Fotos vom Handy hochladen, alle sehen sie in einem gemeinsamen Album.
- **Gästebuch:** Nachrichten an mich. Die Gäste sehen nur, *wer* sich eingetragen hat, die Texte nicht.
- **Admin-Bereich:** Hinter einem Passwort. Dort lese ich das Gästebuch, setze den laufenden Song und kann Fotos löschen.

## Technik

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS · Supabase (Postgres, Storage, Realtime)

## Aufbau

Die Gäste-Seiten sprechen direkt mit Supabase, über den öffentlichen anon-Key. Was dieser Key darf, regeln die Row-Level-Security-Regeln in der Datenbank. Alles, was nur ich darf, läuft über eigene API-Routen von Next.js. Die prüfen zuerst das Admin-Passwort und nutzen erst dann den Service-Role-Key. Der steht ausschließlich auf dem Server und landet nie im Browser.

```
Gäste (Browser) ──anon-Key──► Supabase  (RLS: lesen + einfügen, kein Ändern/Löschen)
Admin (Browser) ──Cookie───► /api/admin/* ──Service-Role-Key──► Supabase
```

## Probleme und Entscheidungen

**Sicherheit ohne Login.** Der anon-Key ist im Browser sichtbar. Ohne Regeln könnte jeder Gast über die Entwicklertools alles löschen. Deshalb gilt per Row Level Security: Gäste dürfen lesen und Neues eintragen, aber nichts ändern oder löschen. Das Gästebuch ist für Gäste sogar nur beschreibbar. Die Namen der Unterzeichner liefert eine eigene Datenbankfunktion, die bewusst keine Texte zurückgibt.

**Identität ohne Konto.** Beim ersten Öffnen erzeugt die App eine zufällige ID und speichert sie zusammen mit dem Namen im Browser. So hat jeder Gast pro Song eine Stimme, ohne sich anzumelden. Das funktioniert auch, wenn die App im WLAN über eine IP-Adresse ohne HTTPS aufgerufen wird. Dort gibt es `crypto.randomUUID()` nicht, deshalb wird die ID dann selbst aus Zufallsbytes gebaut.

**Zu viele Anfragen bei Live-Updates.** Jede Stimme löst über Supabase Realtime bei allen Geräten ein Neuladen aus. Bei 60 Gästen werden aus einem Tap 60 Abfragen, bei schnellem Abstimmen schnell tausende. Die App bündelt deshalb Ereignisse, die kurz hintereinander kommen, zu einer Abfrage und verzögert sie pro Gerät zufällig, damit nicht alle gleichzeitig fragen.

**Große Handyfotos.** Fotos werden vor dem Hochladen im Browser verkleinert: eine Version für die Vollansicht, ein kleines Vorschaubild für das Raster. Sonst lädt jeder Gast beim Durchscrollen die Originale, und der Datentransfer wird schnell teuer. Hochkant-Fotos werden dabei richtig gedreht. Formate, die der Browser nicht lesen kann, werden unverändert hochgeladen, statt dass der Upload scheitert.

**Nur ein Song läuft.** Ein Datenbank-Trigger sorgt dafür, dass immer genau ein Song den Status „läuft“ hat. Wird ein neuer gestartet, rutscht der alte automatisch auf „gespielt“.

## Lokal starten

1. Ein Supabase-Projekt anlegen und `supabase/schema.sql` im SQL-Editor ausführen.
2. Eine Datei `.env.local` anlegen:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<projekt>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
   ADMIN_PASSWORD=<ein-passwort>
   ```

3. Starten:

   ```bash
   npm install
   npm run dev
   ```

Die App läuft dann unter http://localhost:3000, der Admin-Bereich unter `/admin`.

## Projektstruktur

```
app/              Seiten (Start, Musik, Fotos, Gästebuch, Admin) und API-Routen
components/       Oberflächen-Bausteine (Warteschlange, Fotowand, Gästebuch …)
lib/              Supabase-Clients, Gast-Identität, Bildverkleinerung, Live-Updates
supabase/         Datenbankschema mit Tabellen, Trigger und RLS-Regeln
```

## Grenzen

Die App ist für einen Abend unter Freunden gebaut, nicht für den öffentlichen Betrieb:

- Die Gast-ID wird nicht geprüft. Wer sich auskennt, kann über die Entwicklertools fremde Stimmen ändern.
- Das Admin-Cookie enthält das Passwort selbst (httpOnly, nur auf dem Server verglichen). Für eine echte Anwendung gehört hier eine signierte Session hin.
- Es gibt keine automatisierten Tests.
