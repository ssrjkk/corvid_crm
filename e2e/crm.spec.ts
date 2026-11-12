import { expect, test } from "@playwright/test"

test.describe("Публичные страницы и гость", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("лендинг показывает бренд, кнопки и авторство", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Corvid")
    await expect(page.getByText("© 2026 ssrjkk · Corvid CRM")).toBeVisible()
  })

  test("защищённый маршрут без сессии отправляет на вход", async ({ page }) => {
    await page.goto("/dashboard")
    await expect(page).toHaveURL(/\/sign-in/)
  })

  test("неверный пароль показывает тост и остаётся на входе (без alert)", async ({ page }) => {
    await page.goto("/sign-in")
    await page.getByPlaceholder("Email").fill("test@corvid.dev")
    await page.getByPlaceholder("Пароль").fill("WrongPass123!")
    await page.getByRole("button", { name: "Войти" }).click()
    await expect(page.getByText("Invalid email or password")).toBeVisible()
    await expect(page).toHaveURL(/\/sign-in/)
  })

  test("security-заголовки отдаются сервером (регресс V22)", async ({ request }) => {
    const res = await request.get("http://localhost:3000/")
    expect(res.headers()["x-frame-options"]).toBe("DENY")
    expect(res.headers()["x-content-type-options"]).toBe("nosniff")
    expect(res.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin")
    expect(res.headers()["permissions-policy"]).toContain("camera=()")
    expect(res.headers()["content-security-policy"]).toContain("default-src 'self'")
  })
})

test.describe("Авторизованная зона (сессия из setup-проекта, один логин на сьют)", () => {
  test("дашборд открывается с данными", async ({ page }) => {
    await page.goto("/dashboard")
    await expect(page.getByRole("heading", { name: "Дашборд" })).toBeVisible()
    await expect(page.getByText("На сумму")).toBeVisible()
  })

  test("счета: список с INV-0001 и переход к печатной форме", async ({ page }) => {
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

  test("CSP не ломает приложение: гидрация, tRPC, графики без нарушений политики", async ({ page }) => {
    const violations: string[] = []
    page.on("console", (msg) => {
      if (msg.type() === "error" && /Content Security Policy|Refused to/i.test(msg.text())) {
        violations.push(msg.text())
      }
    })

    // Дашборд: данные «На сумму» приходят клиентским tRPC-запросом,
    // графики recharts — чистый клиентский рендер. Если CSP режет скрипты —
    // оба признака отсутствуют и тест падает.
    await page.goto("/dashboard")
    await expect(page.getByText("На сумму")).toBeVisible()
    await expect(page.locator("svg.recharts-surface").first()).toBeVisible()

    // Лендинг (статический prerender) — тоже без нарушений
    await page.goto("/")
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Corvid")

    expect(violations).toEqual([])
  })
})
