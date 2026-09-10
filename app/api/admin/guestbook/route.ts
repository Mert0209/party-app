import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAdmin } from "@/lib/admin-auth";

/** Die Gästebuch-Texte sind für anon nicht lesbar. Dieser Weg über
 *  den Secret-Key ist der einzige, sie zu sehen. */
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("guestbook")
    .select("id, message, author, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entries: data ?? [] });
}
