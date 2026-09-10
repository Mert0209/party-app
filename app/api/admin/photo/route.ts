import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAdmin } from "@/lib/admin-auth";

/**
 * Löscht ein Foto. Wichtig: beides. Nur die Datenbankzeile zu
 * entfernen würde das Bild aus der Ansicht nehmen, die Datei läge
 * aber weiter im öffentlichen Bucket und wäre per URL abrufbar.
 */
export async function DELETE(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { id, storagePath } = await request.json();

  const removed = await supabaseAdmin.storage
    .from("photos")
    .remove([storagePath]);

  if (removed.error) {
    return NextResponse.json({ error: removed.error.message }, { status: 500 });
  }

  const { error } = await supabaseAdmin.from("photos").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
