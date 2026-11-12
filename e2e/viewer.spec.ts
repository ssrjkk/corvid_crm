import { expect, test } from "@playwright/test"

/**
 * Матрица прав в реальном UI под ролью VIEWER: читать можно всё,
 * писать и удалять нельзя. Серверную часть матрицы покрывают tests/server/*;
 * здесь проверяется, что UI-гейты (canWrite/canDelete) реально скрывают
 * недоступные действия.
 */
test.describe("Роль VIEWER: только чтение", () => {
  test("дашборд открывается с данными (чтение разрешено)", async ({ page }) => {
    await page.goto("/dashboard")
    await expect(page.getByRole("heading", { name: "Дашборд" })).toBeVisible()
    await expect(page.getByText("На сумму")).toBeVisible()
  })

  test("сделки: список читается, кнопка «Новая сделка» скрыта", async ({ page }) => {
    await page.goto("/deals")
    await expect(page.getByRole("heading", { name: "Сделки" })).toBeVisible()
    await expect(page.getByText("Новая сделка")).toHaveCount(0)
  })

  test("счета: список читается, кнопок удаления нет", async ({ page }) => {
    await page.goto("/invoices")
    await expect(page.getByRole("heading", { name: "Счета" })).toBeVisible()
    await expect(page.getByLabel(/^Удалить INV-/)).toHaveCount(0)
  })

  test("настройки: редактор этапов скрыт (ADMIN-only)", async ({ page }) => {
    await page.goto("/settings")
    await expect(page.getByRole("heading", { name: "Настройки" })).toBeVisible()
    await expect(page.getByText("Новый этап")).toHaveCount(0)
  })
})
