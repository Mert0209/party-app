import { createClient } from "@supabase/supabase-js";

/**
 * NUR in Server-Routen importieren. Der Secret-Key umgeht RLS
 * vollständig — landet er im Browser-Bundle, darf jeder Gast alles.
 * Deshalb steht die Variable auch ohne NEXT_PUBLIC_ in der Umgebung.
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export const ADMIN_COOKIE = "party_admin";
