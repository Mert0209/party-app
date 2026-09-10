import SongForm from "@/components/SongForm";
import QueueList from "@/components/QueueList";

export default function MusikPage() {
  return (
    <main className="pt-10">
      <h1 className="font-display text-3xl leading-tight font-extrabold tracking-tight">
        Musik wünschen
      </h1>
      <p className="mt-2 mb-6 text-muted">
        Was oben steht, kommt als Nächstes. Stimm ab, was du hören willst.
      </p>

      <SongForm />
      <QueueList />
    </main>
  );
}
