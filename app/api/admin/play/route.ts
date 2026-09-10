import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAdmin } from "@/lib/admin-auth";

/** Setzt einen Song auf "läuft gerade". Der Trigger in der Datenbank
 *  schiebt den vorherigen automatisch auf "played". */
export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { songId } = await request.json();

  const { error } = await supabaseAdmin
    .from("songs")
    .update({ status: "playing" })
    .eq("id", songId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
