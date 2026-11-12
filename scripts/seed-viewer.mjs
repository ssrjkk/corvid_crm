import Database from "better-sqlite3"
import { hashPassword } from "better-auth/crypto"
import { readFileSync } from "node:fs"

/**
 * Сеан демонстрационного VIEWER-аккаунта с ИЗВЕСТНЫМ паролем в dev-БД.
 *
 * Зачем: e2e-проверка роли VIEWER (read-only UI) требует залогиниться,
 * но sign-up API не может «пересадить» пароль существующему аккаунту
 * (422 USER_EXISTS), а пароли исторических демо-аккаунтов неизвестны.
 * Хеш пишем напрямую через better-auth/crypto (тот же формат salt:hash,
 * что у credential-аккаунтов better-auth).
 *
 * Использование: npm run db:seed-roles
 * Идемпотентно: существующий пользователь — обновляется пароль и роль.
 */
const DB_URL =
  process.env.DATABASE_URL ??
  readFileSync(".env", "utf8").match(/^DATABASE_URL="?([^"\r\n]+)"?/m)?.[1] ??
  "file:./dev.db"
const DB_PATH = DB_URL.replace(/^file:/, "").trim()

const VIEWER = {
  name: "Тест Зритель",
  email: "viewer@corvid.dev",
  password: "Test12345!",
  role: "VIEWER",
}

const now = () => new Date().toISOString().replace("Z", "+00:00")
const genId = () => crypto.randomUUID().replace(/-/g, "")

async function main() {
  const passwordHash = await hashPassword(VIEWER.password)
  const db = new Database(DB_PATH)

  const existing = db.prepare("SELECT id FROM user WHERE email = ?").get(VIEWER.email)
  const stamp = now()

  let userId
  if (existing) {
    userId = existing.id
    db.prepare("UPDATE user SET name = ?, role = ?, updatedAt = ? WHERE id = ?").run(
      VIEWER.name,
      VIEWER.role,
      stamp,
      userId
    )
    console.log(`updated: ${VIEWER.email}`)
  } else {
    userId = genId()
    db.prepare(
      "INSERT INTO user (id, name, email, emailVerified, image, role, createdAt, updatedAt) VALUES (?, ?, ?, 0, NULL, ?, ?, ?)"
    ).run(userId, VIEWER.name, VIEWER.email, VIEWER.role, stamp, stamp)
    console.log(`created: ${VIEWER.email}`)
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

  db.close()
  console.log("seed ok")
}

main().catch((error) => {
  console.error("seed failed:", error instanceof Error ? error.message : error)
  process.exit(1)
})
