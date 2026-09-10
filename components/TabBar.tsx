"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// /admin fehlt hier absichtlich — die Seite ist nur für dich und
// braucht keinen Eintrag, den 40 Gäste antippen können.
const TABS = [
  { href: "/", label: "Start", icon: "✦" },
  { href: "/musik", label: "Musik", icon: "♫" },
  { href: "/fotos", label: "Fotos", icon: "◉" },
  { href: "/gaestebuch", label: "Für Mert", icon: "✉" },
];

export default function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-ink-line bg-ink/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex w-full max-w-md">
        {TABS.map((tab) => {
          const active =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);

          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                // min-h-14: Daumenfläche, nicht Designer-Fläche.
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs ${
                  active ? "text-amber" : "text-muted"
                }`}
              >
                <span aria-hidden className="text-lg leading-none">
                  {tab.icon}
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
