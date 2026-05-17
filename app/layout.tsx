import "./globals.css";
import { Nav } from "@/components/Nav";

export const metadata = {
  title: "2K LAB — NBA 2K Builds, Badges, Codes & Live Stats",
  description:
    "Build optimizer, badge tier list, active locker codes, move list, NBA player database, scenario trainer, and live NBA stats with predicted 2K rating changes.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover" as const,
  themeColor: "#0A0A0B",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main className="mx-auto max-w-7xl px-4 pb-24 pt-4 md:px-6 md:pt-6">
          {children}
        </main>
        <footer className="mx-auto max-w-7xl border-t border-line px-4 py-6 text-[11px] text-muted md:px-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              Data pipeline:{" "}
              <span className="text-ink">Fivetran SDK</span> →{" "}
              <span className="text-ink">MDLS (Iceberg)</span> →{" "}
              <span className="text-ink">Snowflake-on-Iceberg</span> →{" "}
              <span className="text-ink">dbt</span> →{" "}
              <span className="text-ink">Next.js</span>
            </div>
            <div>
              Sources: balldontlie · NBA Stats · 2KRatings · Reddit · ESPN ·
              Locker code feeds · Patch notes
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
