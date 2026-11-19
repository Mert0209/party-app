import Link from "next/link";
import NowPlaying from "@/components/NowPlaying";

const AREAS = [
  {
    href: "/musik",
    title: "Musik wünschen",
    hint: "Eintragen und hochvoten",
  },
  {
    href: "/fotos",
    title: "Fotowand",
    hint: "Das gemeinsame Album",
  },
  {
    href: "/gaestebuch",
    title: "Für Mert",
    hint: "Liest nur er",
  },
];

export default function Home() {
  return (
    <main className="pt-10">
      <h1 className="font-display text-4xl leading-[1.05] font-extrabold tracking-tight">
        Merts Geburtstag
      </h1>

      <div className="mt-6">
        <NowPlaying />
      </div>

      {/* Bewusst flacher und ruhiger als die Karte oben — die Kacheln
          sollen Wegweiser sein, nicht mit dem Song konkurrieren. */}
      <div className="mt-8 space-y-2">
        {AREAS.map((area) => (
          <Link
            key={area.href}
            href={area.href}
            className="flex items-center justify-between rounded-2xl border border-ink-line px-5 py-4 active:bg-ink-raised"
          >
            <span>
              <span className="block font-display font-bold">{area.title}</span>
              <span className="block text-sm text-muted">{area.hint}</span>
            </span>
            <span aria-hidden className="text-muted">
              ›
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
