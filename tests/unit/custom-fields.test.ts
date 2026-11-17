import { describe, expect, it } from "vitest"
import { normalizeFieldValue } from "@/server/custom-fields"
import { customEntityTypeLabels, customFieldTypeLabels, fieldOptions, formatCustomValue } from "@/lib/custom-fields"
import type { CustomFieldDef } from "@/server/custom-fields"

/** V32 «Универсальность»: типизированные значения кастомных полей. */

const text: CustomFieldDef = { type: "TEXT", options: null }
const number: CustomFieldDef = { type: "NUMBER", options: null }
const date: CustomFieldDef = { type: "DATE", options: null }
const select: CustomFieldDef = { type: "SELECT", options: ["Квартира", "Дом", "Участок"] }

describe("normalizeFieldValue", () => {
  it("пустое значение → пустая строка (поле не заполнено)", () => {
    expect(normalizeFieldValue(text, "")).toBe("")
    expect(normalizeFieldValue(number, "   ")).toBe("")
  })

  it("TEXT обрезает пробелы", () => {
    expect(normalizeFieldValue(text, "  кирпич  ")).toBe("кирпич")
  })

  it("NUMBER: запятая — валидный разделитель, хранится канонично", () => {
    expect(normalizeFieldValue(number, "64,5")).toBe("64.5")
    expect(normalizeFieldValue(number, "1 200")).toBe("1200")
    expect(normalizeFieldValue(number, "-3")).toBe("-3")
  })

  it("NUMBER: мусор и бесконечность отклоняются по-русски", () => {
    expect(() => normalizeFieldValue(number, "abc")).toThrow(/Введите число/)
    expect(() => normalizeFieldValue(number, "1e13")).toThrow(/Слишком большое число/)
    expect(() => normalizeFieldValue(number, "1,0e999")).toThrow()
  })

  it("DATE: валидная строка проходит, мусор отклоняется", () => {
    expect(normalizeFieldValue(date, "2026-11-17")).toBe("2026-11-17")
    expect(() => normalizeFieldValue(date, "завчера")).toThrow(/Некорректная дата/)
  })

  it("SELECT: только точный вариант из списка", () => {
    expect(normalizeFieldValue(select, "Дом")).toBe("Дом")
    expect(normalizeFieldValue(select, " Дом ")).toBe("Дом")
    expect(() => normalizeFieldValue(select, "гараж")).toThrow(/вариант из списка/)
  })

  it("SELECT без вариантов не пропускает ничего", () => {
    expect(() => normalizeFieldValue({ type: "SELECT", options: null }, "Дом")).toThrow(
      /вариант из списка/
    )
  })
})

describe("fieldOptions (безопасное чтение Json)", () => {
  it("массив строк остаётся, мусор отфильтровывается", () => {
    expect(fieldOptions(["a", 1, null, "b"])).toEqual(["a", "b"])
    expect(fieldOptions("not-array")).toEqual([])
    expect(fieldOptions(null)).toEqual([])
  })
})

describe("customFieldTypeLabels", () => {
  it("все четыре типа подписаны по-русски", () => {
    expect(customFieldTypeLabels.TEXT).toBe("Текст")
    expect(customFieldTypeLabels.NUMBER).toBe("Число")
    expect(customFieldTypeLabels.DATE).toBe("Дата")
    expect(customFieldTypeLabels.SELECT).toBe("Список")
  })
})

describe("customEntityTypeLabels (V33)", () => {
  it("все три сущности подписаны по-русски", () => {
    expect(customEntityTypeLabels.DEAL).toBe("Сделки")
    expect(customEntityTypeLabels.COMPANY).toBe("Компании")
    expect(customEntityTypeLabels.CONTACT).toBe("Контакты")
  })
})

describe("formatCustomValue (детальные карточки)", () => {
  it("NUMBER — ru-формат с запятой", () => {
    expect(formatCustomValue("NUMBER", "64.5")).toBe("64,5")
    expect(formatCustomValue("NUMBER", "1200")).toBe("1\u00A0200")
  })

  it("DATE — formatDate; битое значение не даёт «Invalid Date»", () => {
    expect(formatCustomValue("DATE", "2026-11-17")).toBe("17.11.2026")
    expect(formatCustomValue("DATE", "мусор")).toBe("—")
  })

  it("TEXT и SELECT — как введено", () => {
    expect(formatCustomValue("TEXT", "кирпич")).toBe("кирпич")
    expect(formatCustomValue("SELECT", "Дом")).toBe("Дом")
  })
})
