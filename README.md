<div align="center">

![Corvid CRM](public/corvid-logo.svg)

# Corvid CRM

**CRM для фриланса, которую не стыдно открыть при заказчике: сделки, счета, клиенты, задачи и аналитика — в одном месте.**

[![CI](https://github.com/ssrjkk/corvid_crm/actions/workflows/ci.yml/badge.svg)](https://github.com/ssrjkk/corvid_crm/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-7c5cff.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-200%20vitest%20%2B%2022%20e2e-10b981)](https://github.com/ssrjkk/corvid_crm/actions)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4)](https://tailwindcss.com)

</div>

---

Тёплая «бумажная» база + чернильный текст и один petrol-акцент (отлив воронова пера), типографика Unbounded + IBM Plex Sans/Mono с кириллицей, светлая и тёмная темы из oklch-токенов. Сдержанность уровня Linear — ноль каруселей и градиентных баннеров.

## Что умеет

| Модуль | Коротко |
|---|---|
| 📊 **Дашборд** | воронка продаж, выручка по месяцам, задачи на сегодня и просрочки |
| 🎯 **Воронка** | Kanban с drag-and-drop; перенос в «Выиграна»/«Проиграна» закрывает сделку |
| 🤝 **Сделки** | карточки: задачи, активности, теги (через запятую), CSV-экспорт, фильтры |
| 🧾 **Счета** | позиции работ, автонумерация `INV-0001…`, статусы, просрочки, печать/PDF |
| 👥 **Клиенты** | контакты и компании, CSV-импорт и экспорт |
| ✅ **Задачи** | список + Kanban-доска по статусам, приоритеты, дедлайны |
| 📅 **Календарь** | задачи и дедлайны проектов по месяцам |
| 📁 **Проекты** | привязка к сделке 1:1 (уровень БД), статусы |
| 💬 **Активности** | звонки, письма, встречи, заметки — по сделкам, контактам, компаниям |
| ⚙️ **Настройки** | шаблоны бизнеса (этапы + поля в один клик), этапы воронки, кастомные поля |
| 🔎 **⌘K** | командная палитра: навигация + глобальный поиск по сделкам, контактам, счетам |
| 🌓 **Темы** | светлая и тёмная из oklch-токенов, переключатель в сайдбаре |
| 👤 **Роли** | ADMIN / MANAGER / VIEWER — зритель только читает (проверено матрицей тестов) |

## Быстрый старт

```bash
git clone https://github.com/ssrjkk/corvid_crm.git
cd corvid_crm
npm install

# .env — пример:
#   DATABASE_URL="file:./dev.db"
#   BETTER_AUTH_SECRET="сгенерируй: npx auth secret"
#   BETTER_AUTH_URL="http://localhost:3000"

npx prisma migrate dev
npm run dev          # → http://localhost:3000 (в другом терминале:)
npm run db:seed-demo # демо-аккаунты (test@corvid.dev / viewer@corvid.dev, оба Test12345!) + демо-данные: этапы воронки, сделка, счёт INV-0001 (идемпотентно, трогает только пустые таблицы)
```

Первый зарегистрированный через `/sign-up` пользователь получает роль ADMIN.
Для e2e нужны запущенный `npm run start` и демо-аккаунты: `npm run db:seed-demo`
сеет ОБА аккаунта идемпотентно (админ test@corvid.dev и зритель viewer@corvid.dev) — оба `Test12345!`.

## Качество: 200 vitest + 22 e2e, всё зелёное

```bash
npm test        # Vitest: 200 тестов — вся чистая логика + ВСЕ 13 tRPC-роутеров на изолированной test.db, матрица ролей, русские тосты, money-арифметика, гонка номеров счетов, сводка дашборда, ротация бэкапов, мультивалютные сводки, схемы ввода (V31), кастомные поля сделок (V32) и компаний/контактов (V33: общий resolver, FK-каскад, полная замена), шаблоны бизнеса (V36: роли, идемпотентность, порядок, ноль фейковых сущностей)
npm run lint    # ESLint: 0 ошибок, 0 варнингов
npm run build   # Next.js 16 production-сборка: prerender ловит то, что dev прощает
npm run e2e     # Playwright (22): setup-логины (админ + VIEWER), лендинг, OG-мета и robots.txt, 307-защита, неверный пароль→тост, security-заголовки и CSP, счета, печать, кастомные поля (полный круг), read-only матрица VIEWER, a11y настроек
npx playwright test --project=a11y  # axe-core a11y-аудит (5): WCAG 2 A/AA, serious/critical = 0 на лендинге, входе, 404, дашборде, счетах
```

- CI гоняет ВСЁ: drift guard (`npm run db:check` — схема обязана соответствовать миграциям, иначе красный) → test → lint → **build ДО e2e** (webServer в e2e стартует собранный `.next`) → полный e2e (Playwright сам поднимает сервер через webServer, `CI=true`); новый пуш отменяет устаревший прогон ветки.
- Один логин на роль в e2e (setup-проекты + shared storage): дефолтный rate-limit better-auth — max 3 запроса к `/sign-in*` за 10 секунд.
- CSV-инъекции нейтрализуются (`'`-префикс, CWE-1236), импорт ограничен 5 МБ.
- Без `BETTER_AUTH_SECRET` production-сборка падает сразу (fail-closed), а не раздаёт forgeable-сессии.
- Удаление любых сущностей — только ADMIN (проверено тестами на всех роутерах); security-заголовки (X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy) проверяются e2e-тестом.

## Данные и бэкапы

SQLite живёт в WAL-режиме (`journal_mode=WAL` — быстрые записи, читатели не блокируют писателя).
Следствие: наивное копирование `dev.db` при работающем приложении теряет последние транзакции —
они лежат в `dev.db-wal`, а не в основном файле.

```bash
npm run db:backup    # снапшот в backups/corvid-YYYYMMDD-HHmmss.db
```

Скрипт делает безопасно:

1. `PRAGMA wal_checkpoint(TRUNCATE)` — сливает wal в основной файл и обрезает его;
2. копирует файл в `backups/`;
3. **доказывает целостность копии** (`PRAGMA quick_check` на копии; битая копия удаляется, скрипт падает);
4. ротация: хранит `BACKUP_KEEP` (по умолчанию 10) свежих бэкапов, старые удаляет.

Восстановление: остановить сервер → заменить `dev.db` файлом из `backups/` → запустить.
`backups/` в git не попадает.

## Стек

Next.js 16 (App Router, Cache Components, Partial Prerender) · React 19 · TypeScript 5 · Tailwind CSS v4 (oklch-токены) · tRPC v11 + TanStack Query · Prisma 7 + SQLite · Better Auth (email/пароль + роли) · recharts · dnd-kit · next-themes · Vitest + Playwright.

Дизайн-система проекта живёт в [`.agents/skills/corvid-design/SKILL.md`](.agents/skills/corvid-design/SKILL.md) — токены, типографика, грабли Next 16 и чек-листы подхватываются агентами автоматически.

## Безопасность

- **Роли**: ADMIN / MANAGER / VIEWER; мутации — только MANAGER+ADMIN, удаление любой сущности — только ADMIN (серверные `adminProcedure` + UI-гейты `usePermissions`, проверены тестами на всех 11 роутерах и e2e под ролью VIEWER).
- **Заголовки** (проверяются e2e-тестом): `Content-Security-Policy` (script-src self, SRI-хеши на чанках — experimental `sri`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera/microphone/geolocation выключены).
- **Секрет**: без `BETTER_AUTH_SECRET` в production процесс падает при старте (fail-closed), поддельные сессии невозможны.
- **CSV**: инъекции формул (`= + - @ Tab CR`, CWE-1236) нейтрализуются префиксом `'`; импорт ограничен 5 МБ.
- **Русский интерфейс ошибок**: локаль zod (русская), читаемое сообщение вместо JSON от tRPC, маппинг кодов better-auth — сырые английские тексты до пользователя не доходят (проверено e2e).
- **Аудит зависимостей**: 0 critical. По состоянию на 18.11.2026 открыт один high без патча — picomatch ≤ 4.0.7 ([CVE-2026-112366](https://github.com/advisories/GHSA-fc5q-39xc-vjpf), «Patched versions: None»). Он живёт в dev-цепочке vite/vitest (в отчёте `--omit=dev` всплывает через `peerOptional` better-auth) и не попадает в рантайм: в собранном `.next` нет ни одного `require("picomatch")`, а ReDoS требует attacker-controlled glob — приложение такие шаблоны не парсит. Как только выйдет пропатченная версия, `overrides`/обновление закрывает алерт; до тех пор это документированный tolerable risk, а не «0 уязвимостей».

## Деплой

Подходит для Vercel/собственного сервера. Для продакшена с доступом с нескольких устройств переведи БД на PostgreSQL (`prisma/schema.prisma` → `provider = "postgresql"`, миграции те же). Локальный SQLite удобен для личного использования на одном ПК.

Обязательные переменные окружения: `DATABASE_URL`, `BETTER_AUTH_SECRET` (≥32 символов, `npx auth secret`), `BETTER_AUTH_URL` — точный адрес, по которому открывается приложение: better-auth отбивает запросы с чужим `Origin` (403 INVALID_ORIGIN).

Порядок выкладки: `npm run db:backup` → `npx prisma migrate deploy` → `npm run build` → старт сервера. Миграции применяются до старта, бэкап — до миграций (sqlite-файл возвращается на место при откате). Схема без миграции не пройдёт и CI: `npm run db:check` (exit 2 = дрейф).

## Лицензия

[MIT](LICENSE) © 2026 [Sergey Sitnikov (ssrjkk)](https://github.com/ssrjkk)
