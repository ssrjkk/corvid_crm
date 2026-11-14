import Database from "better-sqlite3"
import { hashPassword } from "better-auth/crypto"
import { readFileSync } from "node:fs"

/**
 * Сеан демонстрационных аккаунтов ПРЯМО В dev-БД (идемпотентно).
 * Хеш через better-auth/crypto — тот же формат salt:hash, что у
 * credential-аккаунтов better-auth (сверено: sign-in 200).
 *
 * Зачем не через sign-up API: API не может пересадить пароль
 * существующему аккаунту (422 USER_EXISTS) и требует запущенный сервер
 * с правильным BETTER_AUTH_URL. Прямая запись работает и в CI.
 *
 * Использование: npm run db:seed-demo
 * Переменные: DATABASE_URL (по умолчанию из .env, иначе file:./dev.db)
 */
const DB_URL =
  process.env.DATABASE_URL ??
  readFileSync(".env", "utf8").match(/^DATABASE_URL="?([^"\r\n]+)"?/m)?.[1] ??
  "file:./dev.db"
const DB_PATH = DB_URL.replace(/^file:/, "").trim()

const DEMO = [
  { name: "Тест Корвидов", email: "test@corvid.dev", password: "Test12345!", role: "ADMIN" },
  { name: "Тест Зритель", email: "viewer@corvid.dev", password: "Test12345!", role: "VIEWER" },
]

const now = () => new Date().toISOString().replace("Z", "+00:00")
const genId = () => crypto.randomUUID().replace(/-/g, "")

async function main() {
  const db = new Database(DB_PATH)
  let adminUserId

  for (const demo of DEMO) {
    const passwordHash = await hashPassword(demo.password)
    const stamp = now()

    const existing = db.prepare("SELECT id FROM user WHERE email = ?").get(demo.email)
    let userId
    if (existing) {
      userId = existing.id
      db.prepare(
        "UPDATE user SET name = ?, role = ?, updatedAt = ? WHERE id = ?"
      ).run(demo.name, demo.role, stamp, userId)
      console.log(`updated: ${demo.email}`)
    } else {
      userId = genId()
      db.prepare(
        "INSERT INTO user (id, name, email, emailVerified, image, role, createdAt, updatedAt) VALUES (?, ?, ?, 0, NULL, ?, ?, ?)"
      ).run(userId, demo.name, demo.email, demo.role, stamp, stamp)
      console.log(`created: ${demo.email}`)
    }

    const account = db
      .prepare("SELECT id FROM account WHERE userId = ? AND providerId = 'credential'")
      .get(userId)
    if (account) {
      db.prepare("UPDATE account SET password = ? WHERE id = ?").run(passwordHash, account.id)
    } else {
      db.prepare(
        "INSERT INTO account (id, accountId, providerId, userId, password, createdAt, updatedAt) VALUES (?, ?, 'credential', ?, ?, ?, ?)"
      ).run(genId(), userId, userId, passwordHash, stamp, stamp)
    }
    if (demo.role === "ADMIN") adminUserId = userId
  }

  // Демо-ДАННЫЕ для e2e и дашборда (идемпотентно: сеются ТОЛЬКО в пустые таблицы,
  // существующие данные не трогаются). Зачем: e2e в CI гоняется против свежей
  // ci.db — раньше e2e молча полагался на данные, накопленные в локальном dev.db,
  // и падал на пустой базе (INV-0001 нет → клик по таймауту; воронка пуста →
  // recharts-svg не рендерится → CSP-тест падает).
  const STAGES = [
    { name: "Новая", order: 0, color: "#94a3b8" },
    { name: "Переговоры", order: 1, color: "#3b82f6" },
    { name: "Договор", order: 2, color: "#f59e0b" },
    { name: "Выиграна", order: 3, color: "#10b981" },
    { name: "Проиграна", order: 4, color: "#ef4444" },
  ]

  let firstStageId
  const stageCount = db.prepare("SELECT COUNT(*) AS c FROM PipelineStage").get().c
  if (stageCount === 0) {
    const insertStage = db.prepare(
      'INSERT INTO PipelineStage (id, name, "order", color, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)'
    )
    for (const stage of STAGES) {
      const id = genId()
      firstStageId ??= id
      insertStage.run(id, stage.name, stage.order, stage.color, now(), now())
    }
    console.log(`created: ${STAGES.length} этапов воронки`)
  } else {
    firstStageId = db.prepare('SELECT id FROM PipelineStage ORDER BY "order" ASC LIMIT 1').get()?.id
  }

  let demoDealId
  const dealCount = db.prepare("SELECT COUNT(*) AS c FROM Deal").get().c
  if (dealCount === 0 && firstStageId) {
    demoDealId = genId()
    db.prepare(
      "INSERT INTO Deal (id, title, value, currency, status, stageId, ownerId, createdAt, updatedAt) VALUES (?, ?, ?, 'RUB', 'OPEN', ?, ?, ?, ?)"
    ).run(demoDealId, "Демо-сайт для «Ромашка»", 150000, firstStageId, adminUserId, now(), now())
    console.log("created: демо-сделка")
  }

  const invoiceCount = db.prepare("SELECT COUNT(*) AS c FROM Invoice").get().c
  if (invoiceCount === 0) {
    const invoiceId = genId()
    db.prepare(
      "INSERT INTO Invoice (id, number, status, issueDate, currency, note, dealId, createdAt, updatedAt) VALUES (?, 'INV-0001', 'DRAFT', ?, 'RUB', ?, ?, ?, ?)"
    ).run(invoiceId, now(), "Демо-счёт для проверки печатной формы", demoDealId ?? null, now(), now())
    const insertItem = db.prepare(
      "INSERT INTO InvoiceItem (id, name, qty, price, position, invoiceId) VALUES (?, ?, ?, ?, ?, ?)"
    )
    insertItem.run(genId(), "Дизайн главной страницы", 1, 30000, 0, invoiceId)
    insertItem.run(genId(), "Вёрстка и валидация", 3, 10000, 1, invoiceId)
    console.log("created: INV-0001 с двумя позициями")
  }

  db.close()
  console.log("seed ok")
}

main().catch((error) => {
  console.error("seed failed:", error instanceof Error ? error.message : error)
  process.exit(1)
})
