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
  }

  db.close()
  console.log("seed ok")
}

main().catch((error) => {
  console.error("seed failed:", error instanceof Error ? error.message : error)
  process.exit(1)
})
