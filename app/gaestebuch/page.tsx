import Guestbook from "@/components/Guestbook";

export default function GaestebuchPage() {
  return (
    <main className="pt-10">
      <h1 className="font-display text-3xl leading-tight font-extrabold tracking-tight">
        Für Mert
      </h1>
      <p className="mt-2 mb-6 text-muted">
        Kein anderer Gast sieht, was du schreibst. Nur er.
      </p>

      <Guestbook />
    </main>
  );
}
