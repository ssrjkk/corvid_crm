<div align="center">

![Corvid CRM](public/corvid-logo.svg)

# Corvid CRM

**CRM для фриланса, которую не стыдно открыть при заказчике: сделки, счета, клиенты, задачи и аналитика — в одном месте.**

[![CI](https://github.com/ssrjkk/corvid_crm/actions/workflows/ci.yml/badge.svg)](https://github.com/ssrjkk/corvid_crm/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-7c5cff.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-129%20vitest%20%2B%2019%20e2e-10b981)](https://github.com/ssrjkk/corvid_crm/actions)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4)](https://tailwindcss.com)

</div>

---

Тёмная «чернильная» база + один фиолетовый акцент (отлив воронова пера), типографика Manrope + Inter с кириллицей, светлая и тёмная темы из oklch-токенов. Сдержанность уровня Linear — ноль каруселей и градиентных баннеров.

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
| ⚙️ **Настройки** | этапы воронки: названия, цвета, порядок drag-and-drop |
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

## Качество: 129 vitest + 19 e2e, всё зелёное

```bash
npm test        # Vitest: 129 тестов — вся чистая логика + ВСЕ 11 tRPC-роутеров на изолированной test.db, матрица ролей, русские тосты, money-арифметика, гонка номеров счетов, сводка дашборда, ротация бэкапов, мультивалютные сводки
npm run lint    # ESLint: 0 ошибок, 0 варнингов
npm run build   # Next.js 16 production-сборка: prerender ловит то, что dev прощает
npm run e2e     # Playwright (14): setup-логины (админ + VIEWER), лендинг, 307-защита, неверный пароль→тост, security-заголовки и CSP, счета, печать, read-only матрица VIEWER
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
- **Аудит зависимостей**: продакшен-дерево `dependencies` без известных уязвимостей (см. SKILL.md про dev-цепочки).

## Деплой

Подходит для Vercel/собственного сервера. Для продакшена с доступом с нескольких устройств переведи БД на PostgreSQL (`prisma/schema.prisma` → `provider = "postgresql"`, миграции те же). Локальный SQLite удобен для личного использования на одном ПК.

Обязательные переменные окружения: `DATABASE_URL`, `BETTER_AUTH_SECRET` (≥32 символов, `npx auth secret`), `BETTER_AUTH_URL` — точный адрес, по которому открывается приложение: better-auth отбивает запросы с чужим `Origin` (403 INVALID_ORIGIN).

Порядок выкладки: `npm run db:backup` → `npx prisma migrate deploy` → `npm run build` → старт сервера. Миграции применяются до старта, бэкап — до миграций (sqlite-файл возвращается на место при откате). Схема без миграции не пройдёт и CI: `npm run db:check` (exit 2 = дрейф).

## Лицензия

[MIT](LICENSE) © 2026 [Sergey Sitnikov (ssrjkk)](https://github.com/ssrjkk)
