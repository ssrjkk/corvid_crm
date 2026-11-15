import { beforeAll, describe, expect, it } from "vitest"
import { makeCaller, resetDb } from "../helpers"
import {
  addressSchema,
  emailSchema,
  hexColorSchema,
  invoiceItemSchema,
  invoiceItemsSchema,
  moneySchema,
  optionalNullableDateStringSchema,
  optionalText,
  phoneSchema,
  requiredText,
  tagsSchema,
  titleSchema,
  dateStringSchema,
} from "@/server/validation"

/**
 * V31 «ВВОД»: переиспользуемые схемы валидации.
 * Юнит — поведение схем; интеграция — роутеры реально их применяют
 * (makeCaller гоняет запрос через весь input-парсер tRPC).
 */

describe("validation: заголовки и тексты", () => {
  it("whitespace-only заголовок отклоняется («Укажите название»)", () => {
    const result = titleSchema.safeParse("   ")
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0]?.message).toBe("Укажите название")
  })

  it("заголовок обрезает пробелы по краям", () => {
    expect(titleSchema.parse("  Внедрение аналитики  ")).toBe("Внедрение аналитики")
  })

  it("200 символов проходят, 201 отклоняется", () => {
    expect(titleSchema.safeParse("А".repeat(200)).success).toBe(true)
    expect(titleSchema.safeParse("А".repeat(201)).success).toBe(false)
  })

  it("requiredText подставляет имя поля в оба сообщения", () => {
    const schema = requiredText("название компании")
    const bad = schema.safeParse("   ")
    expect(bad.success).toBe(false)
    if (!bad.success) expect(bad.error.issues[0]?.message).toBe("Укажите название компании")
    const long = schema.safeParse("Б".repeat(201))
    expect(long.success).toBe(false)
    if (!long.success) expect(long.error.issues[0]?.message).toBe("Название компании — до 200 символов")
  })

  it("опциональный текст: undefined ок, 2001 символ отклоняется", () => {
    const schema = optionalText()
    expect(schema.safeParse(undefined).success).toBe(true)
    expect(schema.safeParse("Т".repeat(2000)).success).toBe(true)
    expect(schema.safeParse("Т".repeat(2001)).success).toBe(false)
  })

  it("опциональная обнуляемая дата: null ок (снять дату), мусор отклоняется", () => {
    const schema = optionalNullableDateStringSchema
    expect(schema.safeParse(null).success).toBe(true)
    expect(schema.safeParse(undefined).success).toBe(true)
    expect(schema.safeParse("не дата").success).toBe(false)
  })
})

describe("validation: деньги", () => {
  it("0 проходит, отрицательная отклоняется", () => {
    expect(moneySchema.safeParse(0).success).toBe(true)
    expect(moneySchema.safeParse(-1).success).toBe(false)
  })

  it("верхняя граница: 1e12 проходит, больше отклоняется", () => {
    expect(moneySchema.safeParse(1_000_000_000_000).success).toBe(true)
    expect(moneySchema.safeParse(1_000_000_000_001).success).toBe(false)
  })

  it("NaN отклоняется (zod v4: NaN — не число)", () => {
    expect(moneySchema.safeParse(Number.NaN).success).toBe(false)
  })
})

describe("validation: даты, email, контакты", () => {
  it("валидная дата-строка проходит, мусор отклоняется", () => {
    expect(dateStringSchema.safeParse("2026-11-17").success).toBe(true)
    expect(dateStringSchema.safeParse("2026-11-17T10:00").success).toBe(true)
    expect(dateStringSchema.safeParse("не дата").success).toBe(false)
    expect(dateStringSchema.safeParse("").success).toBe(false)
  })

  it("email: обрезает пробелы, пустая строка допустима, мусор отклоняется", () => {
    expect(emailSchema.parse("  a@b.ru  ")).toBe("a@b.ru")
    expect(emailSchema.safeParse("").success).toBe(true)
    expect(emailSchema.safeParse(undefined).success).toBe(true)
    expect(emailSchema.safeParse("bogus").success).toBe(false)
  })

  it("телефон до 64 символов ок, свыше отклоняется", () => {
    expect(phoneSchema.safeParse("+7 999 000-00-00").success).toBe(true)
    expect(phoneSchema.safeParse("9".repeat(65)).success).toBe(false)
  })

  it("адрес до 300 символов ок, свыше отклоняется", () => {
    expect(addressSchema.safeParse("Москва, ул. Лесная, 7").success).toBe(true)
    expect(addressSchema.safeParse("А".repeat(301)).success).toBe(false)
  })

  it("теги: 500 ок, 501 отклоняется", () => {
    expect(tagsSchema.safeParse("к".repeat(500)).success).toBe(true)
    expect(tagsSchema.safeParse("к".repeat(501)).success).toBe(false)
  })
})

describe("validation: воронка и счета", () => {
  it("цвет этапа: #RRGGBB ок, не-hex и 3-символьный отклоняются", () => {
    expect(hexColorSchema.parse("#7c5cff")).toBe("#7c5cff")
    expect(hexColorSchema.safeParse("#fff").success).toBe(false)
    expect(hexColorSchema.safeParse("red").success).toBe(false)
  })

  it("позиция счёта: qty > 0 и лимит количества", () => {
    expect(invoiceItemSchema.safeParse({ name: "Позиция" }).success).toBe(true)
    expect(invoiceItemSchema.safeParse({ name: "Позиция", qty: 0 }).success).toBe(false)
    expect(invoiceItemSchema.safeParse({ name: "Позиция", qty: 1_000_001 }).success).toBe(false)
    expect(invoiceItemSchema.safeParse({ name: "Позиция", price: -5 }).success).toBe(false)
  })

  it("позиции счёта: пустой список и больше 100 отклоняются", () => {
    expect(invoiceItemsSchema.safeParse([]).success).toBe(false)
    expect(
      invoiceItemsSchema.safeParse(Array.from({ length: 101 }, () => ({ name: "Позиция" })))
        .success
    ).toBe(false)
    expect(
      invoiceItemsSchema.safeParse(Array.from({ length: 100 }, () => ({ name: "Позиция" })))
        .success
    ).toBe(true)
  })
})

describe("validation: роутеры применяют схемы", () => {
  beforeAll(async () => {
    await resetDb()
  })

  it("deals.create отклоняет whitespace-заголовок с русским тостом", async () => {
    const caller = makeCaller("ADMIN")
    await expect(caller.deals.create({ title: "   " })).rejects.toThrow(/Укажите/)
  })

  it("deals.create отклоняет отрицательную сумму", async () => {
    const caller = makeCaller("ADMIN")
    await expect(caller.deals.create({ title: "Сделка", value: -100 })).rejects.toThrow(
      /отрицательной/
    )
  })

  it("deals.create обрезает пробелы и сохраняет чистый заголовок", async () => {
    const caller = makeCaller("ADMIN")
    const deal = await caller.deals.create({ title: "  Чистая сделка  " })
    expect(deal.title).toBe("Чистая сделка")
  })

  it("deals.create отклоняет заголовок длиннее 200 символов", async () => {
    const caller = makeCaller("ADMIN")
    await expect(caller.deals.create({ title: "Д".repeat(201) })).rejects.toThrow(/до 200/)
  })

  it("tasks.create отклоняет мусорную дату до new Date()", async () => {
    const caller = makeCaller("ADMIN")
    await expect(
      caller.tasks.create({ title: "Задача", dueDate: "завчера" })
    ).rejects.toThrow(/Некорректная дата/)
  })

  it("pipeline.createStage отклоняет не-hex цвет даже у админа", async () => {
    const caller = makeCaller("ADMIN")
    await expect(
      caller.pipeline.createStage({ name: "Этап", color: "red" })
    ).rejects.toThrow(/#RRGGBB/)
  })

  it("activities.create отклоняет whitespace-содержание", async () => {
    const caller = makeCaller("ADMIN")
    await expect(caller.activities.create({ content: "   " })).rejects.toThrow(/Укажите/)
  })

  it("invoices.create отклоняет счёт без позиций", async () => {
    const caller = makeCaller("ADMIN")
    await expect(caller.invoices.create({ items: [] })).rejects.toThrow(/позицию/)
  })
})
