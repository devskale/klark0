import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { getUser, getTeamForUser, getAppSetting } from "@/lib/db/queries";
import { SWRConfig } from "swr";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "dok.so",
  description: "Digitales Vergabeaudit",
};

export const viewport: Viewport = {
  maximumScale: 1,
};

const manrope = Manrope({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="de"
      className={`bg-white dark:bg-gray-950 text-black dark:text-white ${manrope.className}`}>
      <body className="min-h-[100dvh] bg-gray-50">
        <SWRConfig
          value={{
            fallback: {
              "/api/user": getUser(),
              "/api/team": getTeamForUser(),
              "/api/settings": getTeamForUser().then((team) =>
                team ? getAppSetting(team.id, "general") : null
              ),
            },
          }}>
          {children}
        </SWRConfig>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
