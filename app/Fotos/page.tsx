import PhotoUpload from "@/components/PhotoUpload";
import PhotoGrid from "@/components/PhotoGrid";

export default function FotosPage() {
  return (
    <main className="pt-10">
      <h1 className="font-display text-3xl leading-tight font-extrabold tracking-tight">
        Fotowand
      </h1>
      <p className="mt-2 mb-6 text-muted">
        Alles, was hier landet, sehen alle. Und ich behalte es.
      </p>

      <PhotoUpload />
      <PhotoGrid />
    </main>
  );
}
