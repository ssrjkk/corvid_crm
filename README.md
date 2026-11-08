<div align="center">

![Corvid CRM](public/corvid-logo.svg)

# Corvid CRM

**Гибкая CRM для фриланса и проектов — сделки, счета, клиенты, задачи и аналитика в одном месте.**

[![CI](https://github.com/ssrjkk/crm_ssrjkk/actions/workflows/ci.yml/badge.svg)](https://github.com/ssrjkk/crm_ssrjkk/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-7c5cff.svg)](LICENSE)
[![Author](https://img.shields.io/badge/Author-ssrjkk-7c5cff.svg)](https://github.com/ssrjkk)
![Next.js](https://img.shields.io/badge/Next.js%2016-black)
![Tests](https://img.shields.io/badge/tests-59%20%2B%20E2E-10b981)

</div>

---

Дизайн, который не стыдно открыть при заказчике: тёмная «чернильная» база, фирменный
фиолетовый акцент, типографика Manrope + Inter, светлая и тёмная темы.

## ✨ Возможности

| Модуль | Что умеет |
|---|---|
| 📊 **Дашборд** | воронка продаж, выручка по месяцам, задачи на сегодня и просрочки |
| 🎯 **Воронка** | Kanban с drag-and-drop; перенос в «Выиграна»/«Проиграна» закрывает сделку |
| 🤝 **Сделки** | карточки с задачами, активностями, тегами; CSV; фильтры |
| 🧾 **Счета** | позиции работ, автонумерация INV-0001…, статусы, печать/PDF, просрочки |
| 👥 **Клиенты** | компании и контакты, **CSV-импорт и экспорт** |
| ✅ **Задачи** | список + доска по статусам, приоритеты, дедлайны |
| 📅 **Календарь** | задачи и дедлайны проектов по месяцам |
| 📁 **Проекты** | привязка к сделкам 1:1, статусы |
| 💬 **Активности** | история звонков, писем, встреч по каждой сделке |
| ⚙️ **Настройки** | свои этапы воронки: названия, цвета, порядок |
| 🔎 **⌘K** | командная палитра: навигация и глобальный поиск |
| 🌓 **Темы** | светлая и тёмная, переключатель в сайдбаре |
| 👤 **Роли** | ADMIN / MANAGER / VIEWER — зритель только читает |

## 🚀 Быстрый старт

```bash
git clone https://github.com/ssrjkk/crm_ssrjkk.git
cd crm_ssrjkk
npm install

# .env
#   DATABASE_URL="file:./dev.db"
#   BETTER_AUTH_SECRET="свой-секрет"
#   BETTER_AUTH_URL="http://localhost:3000"

npx prisma migrate dev
npm run dev          # → http://localhost:3000
```

Первый зарегистрированный через `/sign-up` аккаунт — ваш. Демо-аккаунт в dev-базе:
`test@corvid.dev` / `Test12345!`

## 🧪 Качество

```bash
npm test             # Vitest: unit + интеграционные тесты tRPC-роутеров (тестовая БД)
npm run test:watch
npm run e2e          # Playwright E2E (нужен запущенный npm run start; print-медиа включён)
npm run lint
npm run build
```

- **59 тестов** Vitest: чистая логика (CSV RFC 4180 + защита от CSV-инъекций, деньги, даты) + все ключевые
  роутеры на изолированной тестовой БД, включая матрицу ролей
- **Playwright E2E (setup + 6)**: лендинг, защита маршрутов, неверный пароль→тост, вход, счета, скрытие сайдбара при печати
- **CI**: `.github/workflows/ci.yml` — тесты + линт + сборка на каждый push

## 🏗️ Стек

Next.js 16 (App Router, Cache Components, Partial Prerender) · React 19 · TypeScript ·
Tailwind CSS v4 (oklch-токены) · tRPC v11 + TanStack Query · Prisma 7 + SQLite ·
Better Auth (email/пароль + роли) · recharts · dnd-kit · next-themes.

Дизайн-система проекта живёт в `.agents/skills/corvid-design/SKILL.md` — токены,
типографика, грабли Next 16 и чек-листы проверок подхватываются агентами автоматически.

## 📦 Деплой

Подходит для Vercel/собственного сервера. Для продакшена с доступом с нескольких
устройств переведите БД на PostgreSQL (`prisma/schema.prisma` → `provider = "postgresql"`,
миграции те же). Локальный SQLite удобен для личного использования на одном ПК.

## 📄 Лицензия

[MIT](LICENSE) © 2026 [Sergey Sitnikov (ssrjkk)](https://github.com/ssrjkk)
