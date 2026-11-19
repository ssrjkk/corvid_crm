import { defineConfig } from "@playwright/test"

/**
 * E2E-тесты гоняются против ЗАПУЩЕННОГО сервера (npm run start на :3000)
 * и реального dev.db. Демо-аккаунт: test@corvid.dev / Test12345!.
 *
 * Порт можно переопределить E2E_PORT (локально :3000 бывает занят другим
 * проектом) — сервер тогда поднимается на том же порту, что и baseURL.
 *
 * Проект setup: один логин на весь сьют → e2e/.auth.json (gitignored).
 * Причина: дефолтный rate-limit better-auth — max 3 запроса к /sign-in*
 * за 10 секунд; 4 отдельных логина в пачке упирались в 429 (доказано:
 * 5 быстрых POST → 403,403,403,429,429). retries: 1 оставлен как страховка
 * от настоящего окруженческого флейка.
 */
const e2ePort = Number(process.env.E2E_PORT ?? 3000)

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  retries: 1,
  // В CI Playwright сам поднимает сервер (env CI=true ставится в ci.yml).
  // Локально — ручная гигиена: свежий npm run build → свежий npm run start
  // (старый сервер со старой сборкой даёт chunk-mismatch, reuse тут опасен).
  ...(process.env.CI
    ? {
        webServer: {
          command: `npm run start -- -p ${e2ePort}`,
          port: e2ePort,
          timeout: 120_000,
          reuseExistingServer: false,
        },
      }
    : {}),
  projects: [
    {
      // Анкер нужен: без него regex совпадает и с viewer-auth.setup.ts
      // (общий хвост) — проекты задваивают логины и упираются в rate-limit.
      name: "setup",
      testMatch: /(^|[\\/])auth\.setup\.ts$/,
    },
    {
      name: "crm",
      testMatch: /(^|[\\/])crm\.spec\.ts$/,
      dependencies: ["setup"],
      use: {
        storageState: "e2e/.auth.json",
      },
    },
    {
      // Регресс кастомных полей (V33): полный круг «поле → сделка → удаление».
      // Тоже одна сессия из setup — своих логинов у спека нет.
      name: "fields",
      testMatch: /(^|[\\/])custom-fields\.spec\.ts$/,
      dependencies: ["setup"],
      use: {
        storageState: "e2e/.auth.json",
      },
    },
    {
      name: "setup-viewer",
      testMatch: /(^|[\\/])viewer-auth\.setup\.ts$/,
    },
    {
      name: "viewer",
      testMatch: /(^|[\\/])viewer\.spec\.ts$/,
      dependencies: ["setup-viewer"],
      use: {
        storageState: "e2e/.auth-viewer.json",
      },
    },
    {
      // a11y-аудит: гостевые страницы через test.use, авторизованные —
      // сессия админа из setup-проекта.
      name: "a11y",
      testMatch: /(^|[\\/])a11y\.spec\.ts$/,
      dependencies: ["setup"],
      use: {
        storageState: "e2e/.auth.json",
      },
    },
  ],
  use: {
    baseURL: `http://localhost:${e2ePort}`,
    headless: true,
  },
})
