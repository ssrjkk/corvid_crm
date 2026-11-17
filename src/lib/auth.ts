import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { prisma } from "./prisma"

// Параноидально, но честно: дефолтный секрет только для dev.
// В production без явного секрета сессии можно подделать — падаем сразу,
// а не раздаём forgeable-куки. Локально секрет лежит в .env (gitignored),
// в CI — BETTER_AUTH_SECRET=ci-secret.
if (!process.env.BETTER_AUTH_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("BETTER_AUTH_SECRET обязателен в production (см. README)")
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
  },
  secret: process.env.BETTER_AUTH_SECRET || "corvid-crm-secret-key-change-in-production",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  /**
   * V33 «Универсальность»: доверяем запросу его СВОЕГО origin (Host) — вход
   * работает с любого адреса, на котором открыто приложение. Чужие origins
   * по-прежнему отклоняются: список строится из Host самого запроса, поэтому
   * атакующий не может протащить свой origin (CSRF-защита не ослаблена).
   * Явно заданный BETTER_AUTH_URL продолжает работать как раньше.
   */
  trustedOrigins: (request) => {
    const host = request?.headers.get("host")
    if (!host) return []
    const proto =
      request?.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "http"
    return [`${proto}://${host}`]
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
  },
})
