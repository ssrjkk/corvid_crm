import { describe, expect, it } from "vitest"
import { CURRENCY_CODE, normalizeCurrencyCode, sumByCurrency } from "@/lib/currency"

/**
 * V29 «Валюты»: сводки не смешивают валюты — рубли и доллары складываются
 * только внутри своей валюты. Группировка + копейки (правило V26) + стабильный
 * порядок (основная валюта первой).
 */
describe("normalizeCurrencyCode", () => {
  it("приводит код к верхнему регистру", () => {
    expect(normalizeCurrencyCode("usd")).toBe("USD")
    expect(normalizeCurrencyCode("RUB")).toBe("RUB")
  })
})

describe("CURRENCY_CODE", () => {
  it("ровно три латинские буквы", () => {
    expect(CURRENCY_CODE.test("RUB")).toBe(true)
    expect(CURRENCY_CODE.test("usd")).toBe(true)
    expect(CURRENCY_CODE.test("РУБ")).toBe(false) // кириллица
    expect(CURRENCY_CODE.test("US")).toBe(false)
    expect(CURRENCY_CODE.test("RUB4")).toBe(false)
    expect(CURRENCY_CODE.test("")).toBe(false)
  })
})

describe("sumByCurrency", () => {
  it("группирует по валютам, не складывая их вместе", () => {
    const totals = sumByCurrency([
      { amount: 100000, currency: "RUB" },
      { amount: 1200, currency: "USD" },
      { amount: 50000, currency: "RUB" },
    ])
    expect(totals).toEqual([
      { currency: "RUB", total: 150000 },
      { currency: "USD", total: 1200 },
    ])
  })

  it("сумма приводится к копейкам (нет флоат-артефактов)", () => {
    const totals = sumByCurrency([
      { amount: 0.1, currency: "USD" },
      { amount: 0.2, currency: "USD" },
    ])
    expect(totals).toEqual([{ currency: "USD", total: 0.3 }])
  })

  it("сортировка: по убыванию суммы, при равенстве — по коду", () => {
    const totals = sumByCurrency([
      { amount: 1, currency: "EUR" },
      { amount: 5, currency: "USD" },
      { amount: 5, currency: "AUD" },
    ])
    expect(totals.map((t) => t.currency)).toEqual(["AUD", "USD", "EUR"])
  })

  it("строчные коды схлопываются в одну валюту", () => {
    const totals = sumByCurrency([
      { amount: 10, currency: "usd" },
      { amount: 20, currency: "USD" },
    ])
    expect(totals).toEqual([{ currency: "USD", total: 30 }])
  })

  it("пустой вход — пустой итог", () => {
    expect(sumByCurrency([])).toEqual([])
  })
})
