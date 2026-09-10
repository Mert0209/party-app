import { createClient } from "@supabase/supabase-js";

// Beide Werte sind absichtlich öffentlich (NEXT_PUBLIC_) — der anon-Key
// ist dafür gebaut, im Browser zu stehen. Was er darf, regelt RLS.
// Der Service-Role-Key gehört NIE hierhin, nur in Server-Routen.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
