import { SITE_NAME } from '@/lib/brand';
import type { Metadata, Viewport } from "next";
import { Source_Sans_3, Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
/* Order matters: tokens declare, the brand re-points, components read, the app
   overrides. Do not sort. */
import "@mond-design-system/tokens/styles.css";
import "./tokens/brand-blume.css";
import "@mond-design-system/react/styles.css";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { QueryProvider } from "@/components/QueryProvider";
import { ToastProvider } from "@/components/mds";
import { getSiteUrl } from "@/lib/config";
import styles from "./layout.module.css";

const sourceSans = Source_Sans_3({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
});

/* The logo wordmark's face; the inline SVG in BrandLogo reads --font-logo. */
const spaceGrotesk = Space_Grotesk({
  variable: "--font-logo",
  subsets: ["latin"],
  weight: ["300", "400"],
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#614051" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a2e" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: "Poetry by Desmond Blume",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: SITE_NAME,
  },
  icons: {
    apple: "/icons/apple-touch-icon.svg",
  },
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The font variable belongs on <html>: globals.css declares --font-sans on
    // :root, and a var() is substituted on the element that declares it. Held on
    // <body>, --font-inter would be undefined at :root, which would make
    // --font-sans invalid and drop the whole site to the browser default.
    <html lang="en" suppressHydrationWarning className={`${sourceSans.variable} ${spaceGrotesk.variable}`}>
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
      <body className={styles.body}>
        <a
          href="#main-content"
          className={`sr-only focus:not-sr-only ${styles.skipLink}`}
        >
          Skip to main content
        </a>
        <ThemeProvider>
          <QueryProvider>
            <ToastProvider regionLabel="Notifications" dismissLabel="Dismiss:">
              {children}
            </ToastProvider>
          </QueryProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
