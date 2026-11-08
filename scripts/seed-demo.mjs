/**
 * Создаёт демо-аккаунт для локальной разработки / e2e через публичный API sign-up.
 * Ноль зависимостей (чистый node), идемпотентен: существующий юзер — не ошибка.
 *
 * Использование:
 *   npm run dev            # или npm run start (нужен запущенный сервер)
 *   npm run db:seed-demo
 *
 * Fresh clone:
 *   npx prisma migrate dev
 *   npm run dev            # в другом терминале
 *   npm run db:seed-demo
 *
 * Переменные окружения:
 *   BASE_URL — адрес сервера (по умолчанию http://localhost:3000)
 */
const BASE_URL = process.env.BASE_URL || "http://localhost:3000"

const DEMO = {
  name: "Тест Корвидов",
  email: "test@corvid.dev",
  password: "Test12345!",
}

async function main() {
  const res = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // better-auth проверяет origin: без него отвечает 403 даже на валидный запрос.
      Origin: BASE_URL,
    },
    body: JSON.stringify(DEMO),
  })

  if (res.ok) {
    console.log(`created: ${DEMO.email}`)
    return
  }

  let body = {}
  try {
    body = await res.json()
  } catch {
    body = { raw: await res.text().catch(() => "") }
  }
  const code = typeof body === "object" && body !== null ? body.code : undefined

  if (res.status === 422 && typeof code === "string" && code.includes("EXISTS")) {
    console.log(`exists: ${DEMO.email} (пропускаем)`)
    return
  }

  console.error(`seed failed: HTTP ${res.status}`, JSON.stringify(body).slice(0, 300))
  process.exit(1)
}

main().catch((error) => {
  console.error("seed failed:", error instanceof Error ? error.message : error)
  process.exit(1)
})
