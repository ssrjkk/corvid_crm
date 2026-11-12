import Database from "better-sqlite3"
import { PrismaClient } from "@/generated/prisma/client"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const rawUrl = process.env.DATABASE_URL || "file:./dev.db"
const dbFile = rawUrl.replace(/^file:/, "").trim()

/**
 * WAL — персистентное свойство файла БД: достаточно выставить один раз,
 * все последующие соединения (включая пул адаптера) наследуют его.
 * Читатели не блокируют писателя и наоборот — дашборд-опрос и мутации
 * не роняют друг друга. Файл может не существовать до миграций — не критично.
 */
try {
  const raw = new Database(dbFile)
  raw.pragma("journal_mode = WAL")
  raw.close()
} catch {
  // пропускаем:journal_mode выставится при следующей загрузке после migrate
}

// timeout — busy_timeout better-sqlite3: ждать блокировку до 5с вместо
// мгновенного SQLITE_BUSY.
const adapter = new PrismaBetterSqlite3({ url: rawUrl, timeout: 5000 })
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
