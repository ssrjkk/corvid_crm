import { beforeAll, describe, expect, it } from "vitest"
import { makeCaller, resetDb } from "../helpers"

/**
 * V29 «Валюты»: сервер нормализует коды ("usd" → "USD") и отклоняет
 * не-коды с русским сообщением (zod-регресс V25). Раньше z.string()
 * принимал любую строку — она уходила в БД, а сводки складывали
 * разные валюты как числа.
 */
beforeAll(async () => {
  await resetDb()
})

describe("нормализация валюты в роутерах", () => {
  it("deals.create сохраняет код в верхнем регистре", async () => {
    const caller = makeCaller("ADMIN")
    const deal = await caller.deals.create({ title: "USD-сделка", value: 100, currency: "usd" })
    expect(deal.currency).toBe("USD")
  })

  it("invoices.create сохраняет код в верхнем регистре", async () => {
    const caller = makeCaller("ADMIN")
    const invoice = await caller.invoices.create({
      items: [{ name: "Работы", qty: 1, price: 100 }],
      currency: "eur",
    })
    expect(invoice.currency).toBe("EUR")
  })

  it("не-коды отклоняются с русским сообщением", async () => {
    const caller = makeCaller("ADMIN")
    await expect(caller.deals.create({ title: "Кириллица", currency: "РУБ" })).rejects.toThrow(
      /Валюта/
    )
    await expect(caller.deals.create({ title: "Слишком длинно", currency: "RUB4" })).rejects.toThrow(
      /Валюта/
    )
    await expect(
      caller.invoices.create({ items: [{ name: "Работы", qty: 1, price: 1 }], currency: "US" })
    ).rejects.toThrow(/Валюта/)
  })

  it("валюта по умолчанию — RUB", async () => {
    const caller = makeCaller("ADMIN")
    const deal = await caller.deals.create({ title: "Без валюты", value: 1 })
    expect(deal.currency).toBe("RUB")
  })
})
