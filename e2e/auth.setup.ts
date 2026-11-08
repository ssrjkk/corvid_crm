import { expect, test } from "@playwright/test"

/**
 * Auth-setup: единственный логин на весь сьют. Сохраняет сессию в e2e/.auth.json
 * (gitignored). Причина: дефолтный rate-limit better-auth — max 3 запроса
 * к /sign-in* за 10 секунд; 4 отдельных логина в пачке упирались в 429.
 */
test("вход тестового юзера", async ({ page }) => {
  await page.goto("/sign-in")
  await page.getByPlaceholder("Email").fill("test@corvid.dev")
  await page.getByPlaceholder("Пароль").fill("Test12345!")
  await page.getByRole("button", { name: "Войти" }).click()
  await page.waitForURL("**/dashboard")
  await expect(page.getByRole("heading", { name: "Дашборд" })).toBeVisible()
  await page.context().storageState({ path: "e2e/.auth.json" })
})
