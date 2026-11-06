# Corvid CRM

Гибкая CRM-система для фриланса и управления проектами.

## Технологии

- [Next.js 16](https://nextjs.org/) - React фреймворк
- [TypeScript](https://www.typescriptlang.org/) - типизация
- [Tailwind CSS v4](https://tailwindcss.com/) - стилизация
- [shadcn/ui](https://ui.shadcn.com/) - UI компоненты
- [tRPC](https://trpc.io/) - типизированный API
- [Prisma](https://www.prisma.io/) - ORM
- [SQLite](https://www.sqlite.org/) - база данных
- [Better Auth](https://www.better-auth.com/) - аутентификация

## Возможности

- **Счета** - выставление счетов с позициями работ, статусы (черновик → выставлен → оплачен), печать/PDF, контроль просрочек
- **Дашборд** - воронка продаж, выручка по месяцам, задачи на сегодня и просроченные
- **Сделки** - карточки сделок, фильтры, смена статуса, экспорт в CSV
- **Воронка** - Kanban-доска сделок с drag-and-drop
- **Контакты** - база клиентов, карточки с историей взаимодействий и сделками
- **Компании** - управление компаниями-клиентами, связанные сделки и контакты
- **Проекты** - привязка к сделкам, задачи, сроки и статусы
- **Задачи** - список с фильтрами и Kanban-доска с drag-and-drop
- **Активности** - звонки, письма, встречи, заметки и история по сделкам
- **Календарь** - задачи и дедлайны проектов по дням
- **Поиск** - глобальный поиск и навигация по Cmd/Ctrl+K
- **Экспорт** - CSV для сделок, контактов, компаний, проектов и задач

## Роли

| Роль | Права |
| --- | --- |
| `ADMIN` | Полный доступ, включая удаление |
| `MANAGER` | Создание и редактирование, без удаления |
| `VIEWER` | Только чтение и экспорт |

Роль хранится в базе данных и проверяется на сервере для каждого запроса, поэтому изменения применяются без повторного входа.

## Демо-аккаунты

| Email | Пароль | Роль |
| --- | --- | --- |
| `test@corvid.local` | `Password123!` | ADMIN |
| `manager@corvid.local` | `Password123!` | MANAGER |
| `viewer@corvid.local` | `Password123!` | VIEWER |

## Запуск

```bash
npm install
npx prisma db push
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000)

Сборка и запуск production-версии:

```bash
npm run build
npm run start
```

---

**Автор:** ssrjkk · © 2026 Corvid CRM

## Тесты

```bash
npm test          # Vitest: unit + интеграционные тесты tRPC-роутеров (тестовая БД test.db)
npm run test:watch
npm run e2e       # Playwright E2E против запущенного npm run start (dev.db, test@corvid.dev / Test12345!)
```
CI: `.github/workflows/ci.yml` — тесты + линт + сборка на каждый push.
