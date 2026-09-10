import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import TabBar from "@/components/TabBar";
import NameGate from "@/components/NameGate";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Merts Geburtstag",
  description: "Musik wünschen, Fotos teilen, was hinterlassen.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Merts Geburtstag",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#1b1024",
  // Ohne das läuft der Inhalt auf dem iPhone unter den Notch.
  viewportFit: "cover",
  // Kein user-scalable: false — das sperrt Leute aus, die schlecht sehen.
  initialScale: 1,
  width: "device-width",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className={`${bricolage.variable} ${inter.variable}`}>
      <body>
        <NameGate>
          <div className="screen mx-auto w-full max-w-md px-5">{children}</div>
          <TabBar />
        </NameGate>
      </body>
    </html>
  );
}
