import { execSync } from "node:child_process"

/**
 * Готовит отдельную тестовую БД до запуска воркеров:
 * чистый файл + все миграции. PRODUCT dev.db не трогается никогда.
 */
export default function globalSetup() {
  process.env.DATABASE_URL = "file:./test.db"
  execSync("npx prisma migrate deploy", {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
  })
}
