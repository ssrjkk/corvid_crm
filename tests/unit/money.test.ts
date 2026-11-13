import { describe, expect, it } from "vitest"
import { invoiceTotal, lineTotal, roundMoney } from "@/lib/money"

/**
 * V26 «Целостность»: вся денежная арифметика — через @/lib/money,
 * с приведением к копейкам. Флоат-артефакты (0.1 × 3 = 0.30000000000000004)
 * не должны попадать в сводки, строки счёта и экспорт.
 */
describe("roundMoney", () => {
  it("убирает флоат-артефакты", () => {
    expect(roundMoney(0.1 * 3)).toBe(0.3)
    expect(roundMoney(0.1 + 0.2)).toBe(0.3)
    expect(roundMoney(2.675 * 1000)).toBe(2675)
  })

  it("округляет до копеек", () => {
    expect(roundMoney(1234.567)).toBe(1234.57)
    expect(roundMoney(10)).toBe(10)
  })
})

describe("lineTotal", () => {
  it("qty × price без артефактов", () => {
    expect(lineTotal({ qty: 0.1, price: 3 })).toBe(0.3)
    expect(lineTotal({ qty: 3, price: 3333.33 })).toBe(9999.99)
    expect(lineTotal({ qty: 1.5, price: 19.99 })).toBe(29.99)
  })
})

describe("invoiceTotal", () => {
  it("итого = сумма строк, приведённых к копейкам (инвариант печати)", () => {
    const items = [
      { qty: 0.1, price: 3 },
      { qty: 0.2, price: 0.1 },
    ]
    const total = invoiceTotal(items)
    // Сырая арифметика дала бы 0.32000000000000006.
    expect(total).toBe(0.32)
    const sumOfLines = items.reduce((s, item) => s + lineTotal(item), 0)
    expect(total).toBe(sumOfLines)
  })

  it("большие суммы стабильны", () => {
    const items = [
      { qty: 2, price: 50000 },
      { qty: 1, price: 30000.33 },
    ]
    expect(invoiceTotal(items)).toBe(130000.33)
  })

  it("пустой счёт = 0", () => {
    expect(invoiceTotal([])).toBe(0)
  })
})
