import { defineConfig } from "@playwright/test"

/**
 * E2E-тесты гоняются против ЗАПУЩЕННОГО сервера (npm run start на :3000)
 * и реального dev.db. Демо-аккаунт: test@corvid.dev / Test12345!.
 *
 * Проект setup: один логин на весь сьют → e2e/.auth.json (gitignored).
 * Причина: дефолтный rate-limit better-auth — max 3 запроса к /sign-in*
 * за 10 секунд; 4 отдельных логина в пачке упирались в 429 (доказано:
 * 5 быстрых POST → 403,403,403,429,429). retries: 1 оставлен как страховка
 * от настоящего окруженческого флейка.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  retries: 1,
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "crm",
      testMatch: /crm\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        storageState: "e2e/.auth.json",
      },
    },
  ],
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
  },
})
