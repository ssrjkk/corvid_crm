import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

/**
 * Автоматический a11y-аудит axe-core (WCAG 2 A/AA).
 * Гейт: serious+critical нарушения = 0. Moderate/low не блокируют,
 * но выводятся в лог — их видно при отладке.
 */
async function seriousViolations(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze()
  for (const v of results.violations.filter(
    (x) => x.impact === "moderate" || x.impact === "minor"
  )) {
    console.log(`[a11y:${v.impact}] ${v.id}: ${v.nodes.length} узлов`)
  }
  return results.violations.filter((v) => v.impact === "critical" || v.impact === "serious")
}

test.describe("a11y: гостевые страницы", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("лендинг без serious/critical нарушений", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Corvid")
    expect(await seriousViolations(page)).toEqual([])
  })

  test("вход без serious/critical нарушений", async ({ page }) => {
    await page.goto("/sign-in")
    await expect(page.getByPlaceholder("Email")).toBeVisible()
    expect(await seriousViolations(page)).toEqual([])
  })

  test("404 без serious/critical нарушений", async ({ page }) => {
    await page.goto("/no-such-page")
    await expect(page.getByText("Страница не найдена")).toBeVisible()
    expect(await seriousViolations(page)).toEqual([])
  })
})

test.describe("a11y: авторизованная зона", () => {
  test("дашборд без serious/critical нарушений", async ({ page }) => {
    await page.goto("/dashboard")
    await expect(page.getByRole("heading", { name: "Дашборд" })).toBeVisible()
    expect(await seriousViolations(page)).toEqual([])
  })

  test("счета без serious/critical нарушений", async ({ page }) => {
    await page.goto("/invoices")
    await expect(page.getByRole("heading", { name: "Счета" })).toBeVisible()
    expect(await seriousViolations(page)).toEqual([])
  })
})
