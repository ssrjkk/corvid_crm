import { expect, test } from "@playwright/test"

test.describe("Публичные страницы", () => {
  test("лендинг показывает бренд, кнопки и авторство", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Corvid")
    await expect(page.getByText("© 2026 ssrjkk · Corvid CRM")).toBeVisible()
  })

  test("защищённый маршрут без сессии отправляет на вход", async ({ page }) => {
    await page.goto("/dashboard")
    await expect(page).toHaveURL(/\/sign-in/)
  })
})

test.describe("Авторизованная зона", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("вход по форме открывает дашборд с данными", async ({ page }) => {
    await page.goto("/sign-in")
    await page.getByPlaceholder("Email").fill("test@corvid.dev")
    await page.getByPlaceholder("Пароль").fill("Test12345!")
    await page.getByRole("button", { name: "Войти" }).click()
    await page.waitForURL("**/dashboard")
    await expect(page.getByRole("heading", { name: "Дашборд" })).toBeVisible()
    await expect(page.getByText("На сумму")).toBeVisible()
  })

  test("счета: список с INV-0001 и переход к печатной форме", async ({ page }) => {
    await page.goto("/sign-in")
    await page.getByPlaceholder("Email").fill("test@corvid.dev")
    await page.getByPlaceholder("Пароль").fill("Test12345!")
    await page.getByRole("button", { name: "Войти" }).click()
    await page.waitForURL("**/dashboard")

    await page.goto("/invoices")
    await expect(page.getByRole("heading", { name: "Счета" })).toBeVisible()
    const invoiceLink = page.getByText("INV-0001").first()
    if (await invoiceLink.isVisible()) {
      await invoiceLink.click()
      await expect(page.getByText("Позиции счёта")).toBeVisible()
      await expect(page.getByText("Итого к оплате")).toBeVisible()
    }
  })

  test("печать счёта: в print-медиа скрывается сайдбар", async ({ page }) => {
    await page.goto("/sign-in")
    await page.getByPlaceholder("Email").fill("test@corvid.dev")
    await page.getByPlaceholder("Пароль").fill("Test12345!")
    await page.getByRole("button", { name: "Войти" }).click()
    await page.waitForURL("**/dashboard")

    await page.goto("/invoices")
    const invoiceLink = page.getByText("INV-0001").first()
    await invoiceLink.click()
    await expect(page.getByText("Позиции счёта")).toBeVisible()

    await page.emulateMedia({ media: "print" })
    const asideDisplay = await page.locator("aside").evaluate(
      (el) => getComputedStyle(el).display
    )
    expect(asideDisplay).toBe("none")
  })
})
