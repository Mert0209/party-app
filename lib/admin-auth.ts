import { cookies } from "next/headers";
import { ADMIN_COOKIE } from "@/lib/supabase-admin";

/**
 * Prüft das Admin-Cookie. Der Wert ist das Passwort selbst — das
 * Cookie ist httpOnly, also für JavaScript im Browser unsichtbar,
 * und der Vergleich passiert ausschließlich auf dem Server.
 *
 * Für eine Geburtstagsfeier ist das angemessen. Für alles, woran
 * echter Schaden hängt, gehört hier eine signierte Session hin.
 */
export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  const value = store.get(ADMIN_COOKIE)?.value;
  const expected = process.env.ADMIN_PASSWORD;

  return Boolean(expected) && value === expected;
}
