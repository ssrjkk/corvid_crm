import { expect, test } from "@playwright/test"

/**
 * Auth-setup для роли VIEWER: один логин на весь сьют → e2e/.auth-viewer.json.
 * Аккаунт создаётся `npm run db:seed-roles` (см. scripts/seed-viewer.mjs).
 * Два логина на сьют (setup + setup-viewer) укладываются в rate-limit
 * better-auth (3 запроса к /sign-in* за 10 секунд).
 */
test("вход демо-зрителя (VIEWER)", async ({ page }) => {
  await page.goto("/sign-in")
  await page.getByPlaceholder("Email").fill("viewer@corvid.dev")
  await page.getByPlaceholder("Пароль").fill("Test12345!")
  await page.getByRole("button", { name: "Войти" }).click()
  await page.waitForURL("**/dashboard")
  await expect(page.getByRole("heading", { name: "Дашборд" })).toBeVisible()
  await page.context().storageState({ path: "e2e/.auth-viewer.json" })
})
