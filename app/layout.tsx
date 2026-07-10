import type { Metadata, Viewport } from "next";
import { Crimson_Text, Source_Sans_3 } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/Toast";
import { getSiteUrl } from "@/lib/config";

const crimsonText = Crimson_Text({
  variable: "--font-crimson",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#614051" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a2e" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "Blumenous Poetry",
  description: "Poetry by Desmond Blume",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Poetree",
  },
  icons: {
    apple: "/icons/apple-touch-icon.svg",
  },
  openGraph: {
    siteName: "Blumenous Poetry",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const stored = localStorage.getItem('theme');
                  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  const theme = stored || (prefersDark ? 'dark' : 'light');
                  document.documentElement.setAttribute('data-theme', theme);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${crimsonText.variable} ${sourceSans.variable} antialiased`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 md:focus:left-[calc(var(--sidebar-current-width)+1rem)] focus:z-50 focus:px-4 focus:py-2 focus:bg-surface focus:text-primary focus:border focus:border-border focus:rounded focus:shadow-lg focus:transition-[left] focus:duration-300"
        >
          Skip to main content
        </a>
        <ThemeProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
