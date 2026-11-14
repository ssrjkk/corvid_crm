import Database from "better-sqlite3"
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
} from "node:fs"
import { join, resolve } from "node:path"
import { pathToFileURL } from "node:url"

/**
 * WAL-безопасный бэкап SQLite (V27 «Ресурсы»).
 *
 * Наивное копирование dev.db при живом WAL теряет последние транзакции —
 * они сидят в dev.db-wal, а не в основном файле. Здесь перед копированием
 * выполняется `PRAGMA wal_checkpoint(TRUNCATE)`: wal сливается в основной
 * файл и обрезается, после чего основной файл самодостаточен и его копия —
 * консистентный снапшот. Корректность копии доказывается `PRAGMA quick_check`
 * НА КОПИИ (не на оригинале).
 *
 * Использование: npm run db:backup
 * Переменные: DATABASE_URL (как у prisma), BACKUP_KEEP (сколько хранить, 10).
 */

const DB_URL =
  process.env.DATABASE_URL ??
  readFileSync(".env", "utf8").match(/^DATABASE_URL="?([^"\r\n]+)"?/m)?.[1] ??
  "file:./dev.db"
const DB_PATH = DB_URL.replace(/^file:/, "").trim()

const BACKUP_DIR = "backups"
const DEFAULT_KEEP = 10

/** Имя файла бэкапа: corvid-YYYYMMDD-HHmmss.db (сортируется лексикографически). */
export function backupFileName(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0")
  const stamp =
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  return `corvid-${stamp}.db`
}

/**
 * Чистая ротация: из списка имён возвращает те, что надо УДАЛИТЬ,
 * чтобы осталось `keep` самых свежих (лексикографический порядок имён
 * = хронологический благодаря формату таймстампа). Соответствие шаблону
 * не проверяет — вызывающая сторона уже отфильтровала свои файлы.
 */
export function selectBackupsToDelete(files, keep) {
  const sorted = [...files].sort().reverse() // свежие первыми
  return sorted.slice(Math.max(0, keep))
}

function main() {
  if (!existsSync(DB_PATH)) {
    console.error(`База не найдена: ${DB_PATH} (DATABASE_URL=${DB_URL})`)
    process.exit(1)
  }
  mkdirSync(BACKUP_DIR, { recursive: true })

  // 1. Чекпоинт: слить wal в основной файл и обрезать его.
  const db = new Database(DB_PATH)
  let checkpointed
  try {
    const result = db.pragma("wal_checkpoint(TRUNCATE)")
    checkpointed = result[0]?.checkpointed ?? 0
  } finally {
    db.close()
  }

  // 2. Копия снапшота.
  const name = backupFileName()
  const target = join(BACKUP_DIR, name)
  copyFileSync(DB_PATH, target)

  // 3. Доказательство целостности КОПИИ.
  const check = new Database(target, { readonly: true })
  let integrity
  try {
    integrity = check.pragma("quick_check", { simple: true })
  } finally {
    check.close()
  }
  // better-sqlite3 оставляет рядом с копией сайдкары wal-режима — убираем,
  // чтобы в backups/ лежал ровно один самодостаточный файл.
  for (const suffix of ["-wal", "-shm"]) {
    const side = target + suffix
    if (existsSync(side)) unlinkSync(side)
  }
  if (integrity !== "ok") {
    unlinkSync(target)
    console.error(`Копия не прошла quick_check (${integrity}) — удалена, бэкап НЕ создан`)
    process.exit(1)
  }

  // 4. Ротация: оставить BACKUP_KEEP самых свежих.
  const keep = Number.parseInt(process.env.BACKUP_KEEP ?? "", 10) || DEFAULT_KEEP
  const files = readdirSync(BACKUP_DIR).filter((f) => /^corvid-\d{8}-\d{6}\.db$/.test(f))
  const stale = selectBackupsToDelete(files, keep)
  for (const f of stale) unlinkSync(join(BACKUP_DIR, f))

  const size = statSync(target).size
  console.log(
    `Бэкап создан: ${target} (${(size / 1024).toFixed(1)} KB, чекпоинт записал ${checkpointed} кадр(ов) wal)` +
      (stale.length ? `; удалено старых: ${stale.length}` : "")
  )
}

// Запуск только при прямом вызове (vitest импортирует модуль ради чистых функций).
const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
if (isMain) main()
