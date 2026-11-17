import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Brand, BrandMark } from "@/components/layout/brand"

/**
 * Визитка Corvid (V30.1): ноль фейка. Ни одной выдуманной сущности —
 * вместо нарисованного «мок-канбана» с придуманными компаниями три
 * реальных скриншота приложения (public/screenshots, сняты с демо-данных;
 * пересъёмка: node scripts/screenshots.mjs при запущенном npm run start).
 * Никаких свечений, чипов с точками, бенто-сеток с иконками и каруселей:
 * структура по паттернам Linear — липкая навигация, герой с настоящим
 * UI продукта, проверяемые цифры вместо выдуманного social proof.
 */

const stats = [
  { value: "188", label: "тестов Vitest" },
  { value: "20", label: "сценариев Playwright" },
  { value: "0", label: "serious a11y-нарушений (axe-core)" },
  { value: "0", label: "уязвимостей в prod-зависимостях" },
] // Синхронизировать с README.md при изменении количества тестов.

const engineering = [
  {
    title: "a11y-гейт",
    text: "axe-core на ключевых страницах: serious и critical нарушения красят сборку.",
  },
  {
    title: "Безопасность по умолчанию",
    text: "CSP со SRI-хешами, security-заголовки, fail-closed секрет — закреплено e2e-тестами.",
  },
  {
    title: "Деньги в копейках",
    text: "0.1 + 0.2 = 0.3: арифметика через единый модуль, без флоат-мусора в суммах.",
  },
  {
    title: "Данные не теряются",
    text: "WAL-журнал, индексы на всех внешних ключах, бэкапы с проверкой целостности копии.",
  },
] as const

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Липкая навигация: бренд, якоря, GitHub, вход */}
      <nav
        aria-label="Основная навигация"
        className="bg-background/80 border-border/60 sticky top-0 z-40 border-b backdrop-blur-md"
      >
        <div className="container mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <Brand size={28} />
          <div className="hidden items-center gap-6 md:flex">
            <Link
              href="#product"
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              Продукт
            </Link>
            <Link
              href="#engineering"
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              Инженерия
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/ssrjkk/corvid_crm"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground hidden px-2 text-sm transition-colors sm:inline"
            >
              GitHub
            </a>
            <Button size="sm" nativeButton={false} render={<Link href="/sign-in" />}>
              Войти
            </Button>
          </div>
        </div>
      </nav>

      <main>
        {/* Герой: заголовок, одна строка сути, два CTA, реальный интерфейс */}
        <header className="container mx-auto max-w-7xl px-6 pb-20 pt-24 text-center">
          <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-700 flex flex-col items-center">
            <h1 className="text-5xl font-bold tracking-tight">Corvid — CRM для фриланса</h1>
            <p className="text-muted-foreground mt-5 max-w-xl text-lg">
              Сделки, счета, задачи и клиенты — в одном окне, на своём сервере.
              Open-source.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button size="lg" nativeButton={false} render={<Link href="/sign-in" />}>
                Войти
              </Button>
              <Button
                size="lg"
                variant="outline"
                nativeButton={false}
                render={
                  <a
                    href="https://github.com/ssrjkk/corvid_crm"
                    rel="noopener noreferrer"
                  />
                }
              >
                GitHub
              </Button>
            </div>
            <p className="text-muted-foreground mt-8 font-mono text-xs">
              Next.js 16 · Tailwind v4 · Prisma · tRPC · Playwright
            </p>
          </div>

          {/* Настоящая воронка: скриншот приложения, не мокап */}
          <div className="reveal-up mx-auto mt-16 max-w-6xl">
            <div className="bg-card shadow-xs overflow-hidden rounded-xl border">
              <Image
                src="/screenshots/pipeline.png"
                alt="Скриншот воронки сделок Corvid: этапы Новая, Переговоры, Договор, Выиграна с карточками сделок и суммами"
                width={2880}
                height={1928}
                priority
                className="h-auto w-full"
              />
            </div>
          </div>
        </header>

        {/* Цифры вместо выдуманного social proof: всё проверяется CI */}
        <section
          aria-label="Качество в цифрах"
          className="container mx-auto max-w-7xl px-6 py-16"
        >
          <div className="reveal-up grid grid-cols-2 gap-8 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="text-3xl font-bold tabular-nums">{stat.value}</p>
                <p className="text-muted-foreground mt-1 text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Продукт: два экрана — счёт и дашборд. Скриншоты, не мокапы */}
        <section id="product" className="container mx-auto max-w-7xl px-6 py-16">
          <div className="reveal-up max-w-2xl">
            <p className="text-primary text-xs font-medium uppercase tracking-wider">
              Продукт
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              От звонка до оплаты
            </h2>
            <p className="text-muted-foreground mt-3 text-lg">
              Скриншоты ниже — не мокапы: это реальный интерфейс Corvid.
            </p>
          </div>

          <div className="reveal-up mt-16 grid items-center gap-10 lg:grid-cols-2">
            <div>
              <h3 className="text-2xl font-bold tracking-tight">Счета с печатной формой</h3>
              <p className="text-muted-foreground mt-3">
                Счёт INV-0001 и «Печать / PDF» одним кликом: позиции, итого, статус
                оплаты. Копейки считает целочисленный модуль — 0.1 + 0.2 ровно 0.3.
              </p>
            </div>
            <div className="bg-card shadow-xs overflow-hidden rounded-xl border">
              <Image
                src="/screenshots/invoice.png"
                alt="Скриншот счёта INV-0001 в Corvid: клиент ООО Аврора, позиция «Разработка CRM — этап 1», итого 45 000 ₽, статус Оплачен"
                width={2880}
                height={1800}
                className="h-auto w-full"
              />
            </div>
          </div>

          <div className="reveal-up mt-20 grid items-center gap-10 lg:grid-cols-2">
            <div className="bg-card shadow-xs overflow-hidden rounded-xl border lg:order-2">
              <Image
                src="/screenshots/dashboard.png"
                alt="Скриншот дашборда Corvid: сводка сделок и задач, воронка продаж и график выручки по месяцам"
                width={2880}
                height={1800}
                className="h-auto w-full"
              />
            </div>
            <div className="lg:order-1">
              <h3 className="text-2xl font-bold tracking-tight">Сводка и выручка</h3>
              <p className="text-muted-foreground mt-3">
                Воронка продаж, выручка по месяцам, просроченные задачи наверху.
                Мультивалютность: в каждой сводке своя строка — суммы не смешиваются.
              </p>
            </div>
          </div>

          <div className="reveal-up mt-20 max-w-3xl">
            <h3 className="text-2xl font-bold tracking-tight">Роли и права</h3>
            <p className="text-muted-foreground mt-3">
              Админ, менеджер, наблюдатель. Права проверяет сервер, а не только
              кнопка в интерфейсе: наблюдатель не удалит ничего даже прямым
              запросом к API.
            </p>
          </div>
        </section>

        {/* Инженерия: чем именно сделан продукт */}
        <section id="engineering" className="container mx-auto max-w-7xl px-6 py-16">
          <div className="reveal-up max-w-2xl">
            <p className="text-primary text-xs font-medium uppercase tracking-wider">
              Инженерия
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Сделано серьёзно
            </h2>
            <p className="text-muted-foreground mt-3 text-lg">
              Гейты, которые красят CI при любом нарушении.
            </p>
          </div>
          <div className="reveal-up mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {engineering.map((item) => (
              <div key={item.title}>
                <h3 className="text-sm font-semibold">{item.title}</h3>
                <p className="text-muted-foreground mt-2 text-sm">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Финальный CTA */}
        <section className="container mx-auto max-w-7xl px-6 py-24 text-center">
          <div className="reveal-up mx-auto max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Наведите порядок в своей воронке
            </h2>
            <p className="text-muted-foreground mt-4 text-lg">
              Открытая CRM: поднимите у себя за вечер — или загляните в демо.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button size="lg" nativeButton={false} render={<Link href="/sign-in" />}>
                Войти
              </Button>
              <Button
                size="lg"
                variant="outline"
                nativeButton={false}
                render={
                  <a
                    href="https://github.com/ssrjkk/corvid_crm"
                    rel="noopener noreferrer"
                  />
                }
              >
                GitHub
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-border/60 border-t">
        <div className="container mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-10 sm:flex-row">
          <div className="flex items-center gap-3">
            <BrandMark size={24} />
            <p className="text-muted-foreground text-sm">© 2026 ssrjkk · Corvid CRM</p>
          </div>
          <div className="text-muted-foreground flex items-center gap-6 text-sm">
            <Link href="#product" className="hover:text-foreground transition-colors">
              Продукт
            </Link>
            <Link href="#engineering" className="hover:text-foreground transition-colors">
              Инженерия
            </Link>
            <a
              href="https://github.com/ssrjkk/corvid_crm"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              GitHub
            </a>
            <Link href="/sign-in" className="hover:text-foreground transition-colors">
              Вход
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
