import type { Metadata } from "next";
import { Inter, Manrope, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { TRPCProvider } from "@/lib/trpc/provider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      className={`${inter.variable} ${manrope.variable} ${geistMono.variable} h-full antialiased`}
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
