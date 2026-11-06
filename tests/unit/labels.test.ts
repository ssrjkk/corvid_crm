import { describe, expect, it } from "vitest"
import { formatDate, formatMoney } from "@/lib/labels"
import { cn } from "@/lib/utils"

describe("formatMoney", () => {
  it("форматирует 0 без значения", () => {
    expect(formatMoney(null)).toBe("0 RUB")
    expect(formatMoney(undefined)).toBe("0 RUB")
    expect(formatMoney(0)).toBe("0 RUB")
  })

  it("форматирует сумму с разделителями", () => {
    expect(formatMoney(125000)).toMatch(/125[\s\u00A0]000 RUB/)
  })

  it("поддерживает дробные суммы и другие валюты", () => {
    expect(formatMoney(99.5, "USD")).toMatch(/99,5 USD/)
  })

  it("принимает строковое значение (как из Decimal)", () => {
    expect(formatMoney("450000")).toMatch(/450[\s\u00A0]000 RUB/)
  })
})

describe("formatDate", () => {
  it("пустое значение — прочерк", () => {
    expect(formatDate(null)).toBe("—")
    expect(formatDate(undefined)).toBe("—")
  })

  it("форматирует дату в ru-локали dd.mm.yyyy", () => {
    expect(formatDate(new Date("2026-11-06T12:00:00Z"))).toBe("06.11.2026")
  })

  it("принимает строку", () => {
    expect(formatDate("2026-01-15T00:00:00Z")).toBe("15.01.2026")
  })
})

describe("cn", () => {
  it("склеивает классы и игнорирует ложные значения", () => {
    expect(cn("a", false && "b", undefined, "c")).toBe("a c")
  })

  it("поздние классы побеждают по конфликтам (tailwind-merge)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4")
  })
})
