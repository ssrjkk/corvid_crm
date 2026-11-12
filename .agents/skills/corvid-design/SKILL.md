---
name: corvid-design
description: Дизайн-система и UI-стандарты CRM Corvid (Next.js 16, Tailwind v4, shadcn/Base UI, oklch-токены, тёмная тема). Использовать при ЛЮБОЙ работе над интерфейсом, вёрсткой, компонентами, темами, шрифтами, цветами или новыми страницами/виджетами Corvid — даже если пользователь просто говорит «сделай красиво», «стильно», «улучши UI», «добавь экран».
---

# Corvid Design System

Corvid — CRM для фриланса. Бренд: ворон → строгая «чернильная» база, один фиолетовый акцент
(отлив оперения), много воздуха, минимум бордеров, Linear-подобная сдержанность.
Стек: Next.js 16 (App Router, Cache Components), Tailwind v4, shadcn-токены + Base UI,
Inter (latin+cyrillic), recharts, sonner, next-themes.

## Токены — единственный источник стиля

Никогда не хардкодь цвета вне `globals.css`. Все цвета — семантические oklch-токены
(`--background`, `--primary`, `--sidebar-*`, `--chart-*` …). Компоненты ссылаются на токены
через утилиты Tailwind (`bg-primary`, `text-muted-foreground`, `fill="var(--chart-1)"`).

Фирменный акцент — фиолетовый ~hue 285. Светлая и тёмная темы описаны в `:root` / `.dark`.
Добавляя новый цвет (например, статус), добавляй токен в ОБЕ темы, а в компоненте используй
только его.

## Типографика

- Пара шрифтов: **Inter** (`--font-inter`, subsets latin+cyrillic) — тело текста,
  **Manrope** (`--font-manrope`, weights 500-800, cyrillic) — заголовки и бренд.
  В `@theme inline`: `--font-sans: var(--font-inter)`, `--font-heading: var(--font-manrope)`.
  НЕ называть переменную шрифта `--font-sans` в layout.tsx — цикл = serif-фолбэк
  (эта ошибка уже была).
- Заголовки h1-h4 получают `font-heading` + `letter-spacing: -0.02em` +
  `text-wrap: balance` автоматически из `@layer base` в globals.css. Параграфы —
  `text-wrap: pretty`. `CardTitle` — div, поэтому `font-heading` прописан в нём
  самом (card.tsx). Абзацы со шрифтом-брендом: `<span className="font-heading">`.
- Иерархия: h1 `text-3xl font-bold tracking-tight`, h2 `text-xl font-semibold`,
  подписи `text-sm text-muted-foreground`. Крупнее — только на лендинге (`text-4xl/5xl`).
- Деньги и числа в таблицах: `tabular-nums`. Клавиши/технические подписи: `font-mono`
  (Geist Mono, уже подключён). Денежный формат — `formatMoney` из `@/lib/labels`.

## Макет и ритм

- Контейнер контента: `container mx-auto max-w-7xl p-6`. Вертикальные блоки — `space-y-6`,
  сетки карточек — `grid gap-4 md:grid-cols-2 lg:grid-cols-4`.
- Карточки: shadcn `Card` без изменений обводки; тени не наращивать — глубину даёт
  разница фонов (`bg-background` vs `bg-card`).
- Скругления через радиус-токены (`rounded-lg/xl`), не через произвольные значения.
- Иконки: `lucide-react`, размер `h-4 w-4` в строках, `h-5 w-5` в заголовках карточек.

## Сайдбар

Тёмный «чернильный» сайдбар в обеих темах (токены `--sidebar*`). Структура: бренд →
командная палитра (⌘K) → группы навигации с заголовками-надписями (`text-xs uppercase
tracking-wider text-sidebar-foreground/50`): «ОБЗОР» (Дашборд), «ПРОДАЖИ» (Воронка,
Сделки, Счета), «КЛИЕНТЫ» (Контакты, Компании, Активности), «РАБОТА» (Задачи,
Доска задач, Календарь, Проекты), «СИСТЕМА» (Настройки). Активный пункт —
`bg-sidebar-primary text-sidebar-primary-foreground`, ховер — `bg-sidebar-accent`.
Внизу — пользователь (почта из `authClient.useSession()`) + переключатель темы + выход.

## Тёмная тема

next-themes подключён в `layout.tsx` (`attribute="class"`, `defaultTheme="system"`,
`enableSystem`), на `<html>` — `suppressHydrationWarning`. Переключатель — клиентский
компонент с `mounted`-проверкой (без неё — hydration mismatch). Тосты sonner —
`theme` из `useTheme`. Recharts-цвета — только `var(--chart-1..5)`, не hex.

## Статусы и бейджи

Семантика цвета фиксируется один раз в `@/lib/labels.ts` (или рядом с бейджами):
выиграно/успех — изумрудный, проигрыш/ошибка — красный (destructive), в работе —
фиолетовый (primary), ожидание — янтарный, нейтральное — secondary. Бейдж = мягкий
тонированный фон + текст того же тона (`bg-emerald-500/15 text-emerald-600 dark:text-emerald-400`),
не сплошная заливка. Пустые состояния: `text-sm text-muted-foreground` по центру,
одним предложением, без иконок-заглушек. Рендер — только через `<StatusBadge kind
status>` из `@/components/status-badge`, цвета/лейблы — только из `@/lib/labels.ts`
(`dealBadge`, `invoiceBadge`, `projectBadge`, `taskBadge`, `priorityToneClass`).
Дублировать маппинг в страницах запрещено.

## Принятые исключения (не «чинить», зафиксировано)

- hex в `pipeline.ts`-сидах и `settings/page.tsx` (`useState` цвета): данные пользователя,
  `<input type=color>` принимает только hex; рендер идёт через токен-фолбэк
  (`bg-muted-foreground` + условный `style`).
- `text-amber-700 dark:text-amber-300` поверх `bg-chart-4/20`: янтарь-текст для
  контраста (`--chart-4` слишком светлый для текста).
- `text-[10px]`, `w-72`, `min-h-28`, `max-h-[85vh]/[360px]`: плотность kanban/календаря
  и диалогов, не типографика (заголовки групп — строго `text-xs`).
- CSV-экспорт: сырые числа без `formatMoney`, лейблы из `@/lib/labels.ts` (канон с ё:
  `Завершён`, `Отменён`).
- `Select items={{...}}` + явные `<SelectItem>` — штатный API Base UI
  (`SelectRoot.d.ts`: `items?: Record<string, ReactNode> | [...]`), доказан
  функционально: выбор «Выиграна» фильтрует список 3→1. Не удалять.
- Ошибки auth-форм: только `toast.error` (sonner глобален), нативный `alert()` запрещён.
- `--destructive` светлой темы затемнён до `oklch(0.5 0.205 29)` (контраст 5.06:1,
  a11y-требование для `text-xs`); тёмная тема без изменений.
- Счётчик активных фильтров (`<Badge>{activeCount}</Badge>` в FilterSheet) — сплошной
  `default`-вариант: это нотификационный бейдж-счётчик, а не статус; конвенция мессенджеров.

## Данные и графы

- Графики recharts: сетка `strokeDasharray="3 3"` + `var(--border)`, оси `fontSize={12}`
  и `tick={{ fill: "var(--muted-foreground)" }}`, без вертикальных линий сетки там, где
  хватает горизонтальных. Кривые — `strokeWidth={2}`, скругление `radius` у Bar.
- ОБЯЗАТЕЛЬНО `isAnimationActive={false}` на `<Bar>` и `<Line>`: в recharts v3
  mount-анимация «зависает» от нулевых размеров, если rAF не тикает (фоновая вкладка) —
  бары/линии не отрисовываются вовсе (issue recharts#7377). Для дашборда мгновенный
  рендер и так правильнее. CSS-переменные в `fill`/`stroke` (`var(--chart-1)`) — валидны.
- Формат валюты: `125 000 ₽` (пробел-разделитель, символ после числа).

## Лендинг

Тёмный герой с радиальным фиолетовым свечением (`bg-[radial-gradient(...)]` поверх
`bg-background`), крупный заголовок `text-5xl font-bold tracking-tight`, одна строка
описания, три кнопки (primary / outline / ghost). Никаких каруселей и градиентных
баннеров из 2010-х.

## Грабли Next.js 16 (Cache Components) — проверено на этом проекте

1. `usePathname`/`useSearchParams` в клиентском компоненте вне `<Suspense>` = падение
   prerender-а. Паттерн: вынести хук в узкий клиентский компонент и обернуть в
   `<Suspense fallback={...идентичный по разметке...}>` — фолбэк без активного состояния,
   подсветка применяется после гидрации, сдвига нет.
2. `useRouter` — безопасен, Suspense не нужен.
3. Динамические маршруты `[id]` — серверная страница с `await params` + `Suspense`
   вокруг async-лоадера (см. `src/app/(dashboard)/deals/[id]/page.tsx`).
4. После правок UI всегда `npm run build` перед сдачей — prerender ловит то, что dev
   прощает. Фолбэки Suspense должны выглядеть как итоговый блок, а не «spinner в пустоте».

## Чек-лист перед сдачей UI-правок

- [ ] Нет хардкод-цветов вне токенов (grep `#[0-9a-f]{3,6}` в `src/` — только легаси-логотипы)
- [ ] Обе темы проверены скриншотом (переключатель в сайдбаре)
- [ ] `npm run build` зелёный
- [ ] Кириллица рендерится Inter'ом (не Times)
- [ ] Пустые состояния и состояния загрузки выглядят аккуратно и в тон макету
- [ ] Все icon-only кнопки и поля без видимого лейбла имеют `aria-label` (grep `size="icon"` + ручной обход)

## Тестирование (обязательно перед сдачей)

Проект покрыт Vitest (87 тестов, 17 файлов: labels/formatMoney/formatDate/cn + маппинги бейджей/приоритета + рендер StatusBadge + CSV-экспорт/инъекции/импорт (importCsvRows) + fail-closed секрет + NaN-guard + матрица прав permissionsFor) + Playwright E2E (18: setup-логины админ+viewer, лендинг, 307-защита, неверный пароль→тост, security-заголовки + CSP-гидрация, счета, печать, read-only матрица VIEWER, a11y-аудит axe-core ×5). Запуск: `npm test`, `npm run test:watch`, `npm run e2e` (нужен запущенный `npm run start` на :3000; демо: `npm run db:seed-demo` — админ + зритель, оба Test12345!), отдельный a11y-проект: `npx playwright test --project=a11y`. E2E включает print-медиа тест (при emulateMedia(print) aside скрыт), security-заголовки тест (X-Frame-Options/nosniff/Referrer-Policy/Permissions-Policy/CSP из next.config headers()) и CSP-детектор (нарушения CSP → ошибки консоли → тест падает). Конфиг: проекты `setup`/`setup-viewer` (по одному логину, storage → gitignored `e2e/.auth*.json`) + проекты `crm`/`viewer`/`a11y` с зависимостями, `retries: 1` как страховка; в CI webServer поднимает сервер сам (`CI=true`). Причина: дефолтный rate-limit better-auth — max 3 запроса к /sign-in* за 10 секунд (после перехода на 2 логина сьют идёт 18/18 за ~20с). Грабли: `testMatch` анкеровать `/…/auth\.setup\.ts$/` — без якоря `auth\.setup\.ts` совпадает и с `viewer-auth.setup.ts` (общий хвост), проекты задваивают логины и ловят 429.

- `tests/unit/` — чистая логика: `formatMoney`, `formatDate`, `cn` (tailwind-merge).
- `e2e/crm.spec.ts` — Playwright: лендинг+авторство, 307-защита, вход, счета, печать.
- `tests/server/` — интеграционные тесты tRPC-роутеров через `createCallerFactory`
  на ОТДЕЛЬНОЙ тестовой БД (`file:./test.db`, миграции в `tests/global-setup.ts`).
  Контекст собирается вручную в `makeCaller(role)`: "ADMIN" | "MANAGER" | "VIEWER" | "ANON".
- dev.db из тестов не трогается никогда; `test.db` в .gitignore.
- Правила: новый мутационный роутер = тест на создание + роли (VIEWER писать не может,
  delete — только ADMIN) + граничные значения; новый lib-модуль = unit-тест;
  новый маппинг статус→цвет/лейбл = unit-тест в `labels.test.ts` (без теста не сдавать);
  фикс видимой ошибки = e2e-регресс (как неверный пароль→тост, security-заголовки);
  фантом-зависимости запрещены: пакет `cn` удалён, `cn()` — только из `@/lib/utils`
  (после удаления возврат `from "cn"` роняет build — так и задумано).
- Матрица прав: сервер и UI-гейт обязаны совпадать. `delete` всех сущностей —
  `adminProcedure` (регресс V22: invoices.delete был authedProcedure → VIEWER мог
  удалять счета; починено + тест). UI-гейты — только через `usePermissions()`:
  `permissionsFor(role)` (чистая функция, тестируется) → `canWrite` (ADMIN+MANAGER),
  `canDelete` (ADMIN). Админ-only процедуры на сервере = гейт `canDelete` в UI
  (settings-этапы — adminProcedure, поэтому кнопки этапов скрыты от MANAGER).
- Паранойя: CSV-инъекции нейтрализуются префиксом `'` (CWE-1236, тест в `csv.test.ts`);
  секрет только из окружения — в production без `BETTER_AUTH_SECRET` процесс падает
  сразу (тест в `auth-secret.test.ts`), `.env`/`dev.db`/`test.db`/`e2e/.auth*.json` в gitignore.
  Демо-доступ на чистой БД: `npm run db:seed-demo` — сеет ОБА аккаунта (test@corvid.dev
  ADMIN + viewer@corvid.dev VIEWER, оба Test12345!) ПРЯМО В БД через `better-auth/crypto`
  (формат salt:hash сверен логином 200), идемпотентно, без запущенного сервера —
  работает и в CI (sign-up API не умеет пересаживать пароль существующему аккаунту).
  Глобальные границы: `app/error.tsx` (краш сегмента → брендированная карточка с reset),
  `app/global-error.tsx` (краш root-layout, свой <html>), `app/not-found.tsx` (404).
  SQLite-надёжность: `prisma.ts` выставляет `journal_mode=WAL` (персистентно, один раз)
  + `timeout: 5000` (busy_timeout) в адаптере. a11y: e2e-проект `a11y` (axe-core 4,
  WCAG 2 A/AA, гейт serious+critical = 0: лендинг, вход, 404, дашборд, счета) —
  19 e2e всего: 2 setup + 8 crm + 4 viewer + 5 a11y.
- Нюансы: vitest exclude e2e/** (иначе подберёт Playwright-спеки); Next 16 не типчекает tests/ (исключены из tsconfig — их проверяет Vitest);
  аудит зависимостей (`npm audit`, Dependabot) закрыт по факту, а не игнорированием:
  транзитивный minimatch принудительно ^11.0.1 через `overrides` для eslint,
  @eslint/config-array, @typescript-eslint/typescript-estree, @ts-morph/common
  (копия 3.1.5 под eslint-config-next вне уязвимого диапазона и не трогается),
  shadcn-CLI — в devDependencies, поэтому deepmerge 4.3.1 (CVE-2026-93753, патча нет)
  живёт только в dev-графе; алерт закрыт как tolerable risk с причиной.
  Мажорные апгрейды ради dev-цепочек не делаются (ломающие изменения), фиксируется здесь;
  SQLite не любит параллельные записи → `fileParallelism: false` в vitest.config.ts;
  WAL в prisma.ts убирает взаимоблокировку читателей/писателя на файле БД;
  `Date.now()` в клиентских компонентах запрещён при prerender — паттерн
  `useState(null) + useEffect` с eslint-комментарием; mount-флаг — `useSyncExternalStore`.
- CSP (V23): nonce-вариант НЕсовместим со статикой/PPR (доки Next — все страницы
  стали бы динамическими), принят documented fallback: CSP в next.config + experimental
  `sri` (integrity-хеши на внешних чанках) + `'unsafe-inline'` в script-src — inline
  скрипты гидрации Next остаются inline (проверено пробой HTML: 11 штук), React
  экранирует вывод, `dangerouslySetInnerHTML` в src нет. `style-src 'self' 'unsafe-inline'`
  — recharts/sonner ставят style-атрибуты. Dev-режим добавляет `'unsafe-eval'` (React dev).
- БД: FK-индексы на всех foreign-key колонках (миграция `add_fk_indexes`, 16 CREATE INDEX);
  Session/Account userId — для better-auth. Новые FK-поля = индекс в схеме.

## Чек-лист «все виды проверок» перед сдачей работы

- [ ] `npm test` — все тесты зелёные (unit + server/роли)
- [ ] `npm run lint` — 0 ошибок
- [ ] `npx tsc --noEmit` — 0 ошибок типов (tsconfig не включает tests/ — их валидирует Vitest)
- [ ] `npm audit` — уязвимости только в dev-цепочках (vitest/tinypool, shadcn/ts-morph, eslint/typescript-eslint); продакшен-дерево dependencies чистое
- [ ] `npm run build` — production-сборка проходит (prerender ловит client-хуки)
- [ ] `npm run e2e` на свежем `npm run start` (старые серверы → chunk-mismatch)
- [ ] E2E-смоук в браузере: дашборд, воронка, счета открываются, шрифты/тема на месте
- [ ] Обе темы + кириллица визуально
