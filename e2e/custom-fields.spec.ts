import { expect, test } from "@playwright/test"

/**
 * Регресс V33 «Кастомные поля компаний и контактов» на полном круге UI:
 * админ заводит поле в Настройках → заполняет его в диалоге сделки →
 * значение читается на карточке сделки → всё удаляется (без сирот в dev.db).
 *
 * Самоочистка: try/finally удаляет сделку(и) и поле даже при падении ассертов —
 * dev.db остаётся таким, каким был до прогона. Удаления идут прямым мутациям
 * без confirm-диалога (админ-действия, подтверждение не предусмотрено).
 * Логинов нет — сессия из setup-проекта (storageState), rate-limit не трогаем.
 *
 * Гонки V35 (исправлены):
 * 1) списки грузятся асинхронно, isVisible() во время «Загрузка…» возвращает
 *    false и очистка молча пропускала удаление → ждём маркер ЗАГРУЖЕННОГО
 *    списка (empty-state или карточка — до загрузки их не существует);
 * 2) «Загрузка…» встречается и у этапов, и у полей → все ожидания скоупятся
 *    карточкой «Поля (Сделки)»;
 * 3) удаление левых сделок идёт циклом по .first() — ретраи и прерванные
 *    прошлые прогоны само-вычищаются.
 */
const FIELD_LABEL = "E2E Площадь"
const DEAL_TITLE = "E2E Кастомные поля"
const FIELDS_EMPTY = "Полей пока нет — сделка собирается из базовых свойств"

function dealCard(page: import("@playwright/test").Page) {
  return page.locator('[data-slot="card"]').filter({ hasText: DEAL_TITLE })
}

async function deleteDeals(page: import("@playwright/test").Page) {
  const cards = dealCard(page)
  // Маркер загрузки: список пуст (empty-state) или отрисована хотя бы одна
  // карточка (включая демо-сделки) — до загрузки ни того, ни другого нет.
  const anyCard = page.locator('[data-slot="card"]').first()
  await expect(page.getByText("Нет сделок по выбранным фильтрам").or(anyCard)).toBeVisible({
    timeout: 15_000,
  })
  while (await cards.count()) {
    const before = await cards.count()
    await cards.first().getByRole("button", { name: "Удалить" }).click()
    await expect(cards).toHaveCount(before - 1)
  }
}

async function deleteField(page: import("@playwright/test").Page) {
  const fieldsCard = page.locator('[data-slot="card"]').filter({ hasText: "Поля (Сделки)" })
  const removeField = fieldsCard.getByRole("button", { name: `Удалить ${FIELD_LABEL}` })
  // Маркер загрузки: empty-state полей или строка любого загруженного поля
  // (у строки есть кнопка «Изменить …»).
  const anyFieldRow = fieldsCard.getByRole("button", { name: /^Изменить / }).first()
  await expect(fieldsCard.getByText(FIELDS_EMPTY).or(anyFieldRow)).toBeVisible({
    timeout: 15_000,
  })
  if (await removeField.count()) {
    await removeField.click()
    await expect(removeField).toHaveCount(0)
  }
}

test.describe("Кастомные поля: полный круг через UI", () => {
  test("поле создаётся, значение попадает в сделку и читается на карточке, удаление чистит всё", async ({
    page,
  }) => {
    try {
      // 1. Чиним исход, если прошлый прогон упал до очистки.
      await page.goto("/deals")
      await deleteDeals(page)
      await page.goto("/settings")
      await deleteField(page)

      // 2. Создаём поле типа Число: имя → селектор типа (показывает «Текст») → «Число».
      await page.locator("#field-name").fill(FIELD_LABEL)
      const typeForm = page.locator("form").filter({ hasText: "Добавить поле" })
      await typeForm.getByRole("combobox").click()
      await page.getByRole("option", { name: "Число" }).click()
      await page.getByRole("button", { name: "Добавить поле" }).click()
      await expect(page.getByText("Поля (Сделки): 1")).toBeVisible()
      await expect(page.getByRole("button", { name: `Удалить ${FIELD_LABEL}` })).toBeVisible()

      // 3. Сделка с заполненным кастомным полем.
      await page.goto("/deals")
      await page.getByRole("button", { name: "Новая сделка" }).click()
      await page.locator("#title").fill(DEAL_TITLE)
      // Числовой input в браузере принимает только точку; на карточке ждём ru-формат «64,5».
      await page.getByLabel(FIELD_LABEL).fill("64.5")
      await page.getByRole("button", { name: "Создать", exact: true }).click()
      await expect(page.getByText("Сделка создана")).toBeVisible()

      // 4. Карточка сделки показывает поле с отформатированным значением.
      const cards = dealCard(page)
      await cards.first().getByRole("link", { name: DEAL_TITLE }).click()
      await expect(page.getByText(FIELD_LABEL)).toBeVisible()
      await expect(page.getByText("64,5")).toBeVisible()
    } finally {
      // 5. Очистка: все следы прогона (включая осиротевшие с прошлых попыток).
      await page.goto("/deals")
      await deleteDeals(page)
      await page.goto("/settings")
      await deleteField(page)
    }
  })
})
