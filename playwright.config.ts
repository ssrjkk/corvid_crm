import { defineConfig } from "@playwright/test"

/**
 * E2E-тесты гоняются против ЗАПУЩЕННОГО сервера (npm run start на :3000)
 * и реального dev.db. Демо-аккаунт: test@corvid.dev / Test12345!.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
  },
})
