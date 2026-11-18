import type { Metadata } from "next";
import { Unbounded, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { TRPCProvider } from "@/lib/trpc/provider";
import { Toaster } from "@/components/ui/sonner";

/**
 * Айдентика «ворон на бумаге» (V35, единый с docs/index.html): Unbounded —
 * заголовки и вордмарк (характерный, с кириллицей), IBM Plex Sans — текст UI
 * (инженерный гротеск), IBM Plex Mono — цифры, код и kbd. Все три — с
 * кириллическим подмножеством: Geist Mono держал только latin, кириллица в
 * mono выпадала в системный fallback. next/font скачивает файлы на билде —
 * внешний CDN не нужен (CSP connect-src 'self' остаётся честным).
 */
const unbounded = Unbounded({
  variable: "--font-display",
  subsets: ["latin", "cyrillic"],
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
});

/**
 * Визитка (V30): полные метаданные + OG/Twitter-карточка. OG-изображение
 * подключается файлом `opengraph-image.tsx` (конвенция Next) и наследуется
 * всеми маршрутами. metadataBase обязателен для абсолютных og:image URL;
 * публичный домен подставляется через NEXT_PUBLIC_SITE_URL (нет домена —
 * локалфолбэк, OG-мета всё равно валидна для тестов и превью).
 */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Corvid — CRM для фриланса",
    template: "%s · Corvid CRM",
  },
  description:
    "Сделки, проекты, задачи и клиенты — в одном месте. Kanban-воронка, счета и печатная форма, аналитика и роли для фрилансера.",
  keywords: [
    "CRM",
    "фриланс",
    "воронка сделок",
    "Kanban",
    "счета",
    "инвойсы",
    "задачи",
    "проекты",
  ],
  authors: [{ name: "ssrjkk" }],
  creator: "ssrjkk",
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: "/",
    siteName: "Corvid CRM",
    title: "Corvid — CRM для фриланса",
    description: "Сделки, проекты, задачи и клиенты — в одном месте.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Corvid — CRM для фриланса",
    description: "Сделки, проекты, задачи и клиенты — в одном месте.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      suppressHydrationWarning
      className={`${unbounded.variable} ${plexSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TRPCProvider>
            {children}
            <Toaster />
          </TRPCProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
