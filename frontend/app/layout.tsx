import type { Metadata, Viewport } from "next";
import { Hubot_Sans, Mona_Sans } from "next/font/google";
import localFont from "next/font/local";
import NavHeader from "@/components/NavHeader";
import Footer from "@/components/Footer";
import Preloader from "@/components/Preloader";
import SmoothScroll from "@/components/SmoothScroll";
import RouteChrome from "@/components/RouteChrome";
import DemoBar from "@/components/DemoBar";
import "./globals.css";

const f1 = localFont({
  src: "../public/fonts/Formula1-Regular.woff2",
  variable: "--font-f1",
  weight: "400",
  display: "swap",
});

const hubot = Hubot_Sans({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-hubot",
  display: "swap",
});

const mona = Mona_Sans({
  subsets: ["latin"],
  variable: "--font-mona",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "DreamF1", template: "%s · DreamF1" },
  description:
    "Call the podium before FP1, follow every lap of the 2026 season, and beat your friends on Sunday.",
  openGraph: {
    title: "DreamF1",
    description: "F1 predictions for private friend groups, scored on real 2026 results.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0c0e",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${f1.variable} ${hubot.variable} ${mona.variable}`}>
      <body className="flex min-h-dvh flex-col antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-70 focus:bg-text-primary focus:px-4 focus:py-2 focus:text-surface-0"
        >
          Skip to content
        </a>
        <Preloader />
        <SmoothScroll />
        <RouteChrome>
          <DemoBar />
          <NavHeader />
        </RouteChrome>
        <main id="main" className="flex-1">
          {children}
        </main>
        <RouteChrome>
          <Footer />
        </RouteChrome>
      </body>
    </html>
  );
}
