import { expect, test, type Page } from "@playwright/test"

async function expectNoPageOverflow(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1)
}

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
    // Регресс V25: better-auth ошибки локализованы (было "Invalid email or password").
    await expect(page.getByText("Неверная почта или пароль")).toBeVisible()
    await expect(page).toHaveURL(/\/sign-in/)
  })

  test("security-заголовки отдаются сервером (регресс V22)", async ({ request }) => {
    const res = await request.get("/")
    expect(res.headers()["x-frame-options"]).toBe("DENY")
    expect(res.headers()["x-content-type-options"]).toBe("nosniff")
    expect(res.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin")
    expect(res.headers()["permissions-policy"]).toContain("camera=()")
    expect(res.headers()["content-security-policy"]).toContain("default-src 'self'")
  })

  test("404 — брендированная страница с семантическим h1", async ({ page }) => {
    await page.goto("/this-page-does-not-exist")
    await expect(page.getByRole("heading", { level: 1, name: "Страница не найдена" })).toBeVisible()
    await expect(page.getByRole("link", { name: "К дашборду" })).toBeVisible()
  })

  test("визитка: OG-мета и robots.txt отдаются (регресс V30)", async ({ request }) => {
    const home = await request.get("/")
    const html = await home.text()
    expect(html).toContain('property="og:title"')
    expect(html).toContain('property="og:image"')
    expect(html).toContain('name="twitter:card"')

    // OG-изображение рендерится next/og в статический маршрут.
    const og = await request.get("/opengraph-image")
    expect(og.status()).toBe(200)
    expect(og.headers()["content-type"]).toContain("image/png")

    // Приватная зона закрыта от индексации, лендинг открыт.
    const robots = await request.get("/robots.txt")
    expect(robots.status()).toBe(200)
    const robotsText = await robots.text()
    expect(robotsText).toContain("Disallow: /dashboard")
    expect(robotsText).toContain("Disallow: /sign-in")
    expect(robotsText).not.toContain("Disallow: /$")
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

test.describe("Мобильная оболочка (360px)", () => {
  test.use({ viewport: { width: 360, height: 800 } })

  test("контент не сжат, меню открывается и закрывается после перехода", async ({ page }) => {
    await page.goto("/dashboard")

    // Регресс: раньше сайдбар 256px оставался в потоке и сжимал контент до ~100px.
    await expect(page.locator("aside")).toBeHidden()
    const mainBox = await page.getByRole("main").boundingBox()
    expect(mainBox?.width ?? 0).toBeGreaterThan(320)

    await page.getByRole("button", { name: "Открыть меню" }).click()
    const dialog = page.getByRole("dialog", { name: "Навигация" })
    await expect(dialog).toBeVisible()

    await dialog.getByRole("link", { name: "Сделки", exact: true }).click()
    await expect(page).toHaveURL(/\/deals$/)
    await expect(dialog).toBeHidden()
  })

  test("длинные названия компаний и контактов не ломают ширину", async ({ page }) => {
    const longCompany =
      "ООО «Северо-Западная промышленно-производственная интеграционная компания»"
    const longContact = "Оченьдлиннофамильная-Сверхдлинная"

    await page.goto("/companies")
    await page.getByRole("button", { name: "Добавить компанию" }).click()
    const companyDialog = page.getByRole("dialog", { name: "Добавить компанию" })
    await companyDialog.getByLabel("Название *").fill(longCompany)
    await companyDialog.getByLabel("Email").fill("long.company@example-production-domain.test")
    await companyDialog.getByLabel("Сайт").fill("https://example-production-domain.test/very/long/path")
    await companyDialog.getByRole("button", { name: "Создать" }).click()
    await expect(page.getByText("Компания создана")).toBeVisible()

    await expectNoPageOverflow(page)
    await page.getByRole("link", { name: longCompany }).first().click()
    await expect(page.getByRole("heading", { level: 1, name: longCompany })).toBeVisible()
    await expect(page.getByLabel("Назад")).toBeVisible()
    await expectNoPageOverflow(page)

    await page.goto("/contacts")
    await page.getByRole("button", { name: "Добавить контакт" }).click()
    const contactDialog = page.getByRole("dialog", { name: "Добавить контакт" })
    await contactDialog.getByLabel("Имя *").fill("Анна-Мария")
    await contactDialog.getByLabel("Фамилия").fill(longContact)
    await contactDialog.getByLabel("Email").fill("anna.maria@example-production-domain.test")
    await contactDialog.getByRole("button", { name: "Создать" }).click()
    await expect(page.getByText("Контакт создан")).toBeVisible()

    await expectNoPageOverflow(page)
    await page.getByRole("link", { name: `Анна-Мария ${longContact}` }).first().click()
    await expect(page.getByRole("heading", { level: 1 })).toContainText(longContact)
    await expect(page.getByLabel("Назад")).toBeVisible()
    await expectNoPageOverflow(page)
  })
})
