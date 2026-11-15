import { beforeAll, describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { makeCaller, resetDb } from "../helpers"

/**
 * V32 «Универсальность»: кастомные поля сделки.
 * Роли (определения — только админ), типизация значений на сервере
 * (число/дата/вариант из списка), транзакционность («полусделки» нет),
 * замена значений при update, каскадное удаление.
 */

let areaFieldId: string
let typeFieldId: string

beforeAll(async () => {
  await resetDb()
  const admin = makeCaller("ADMIN")
  areaFieldId = (
    await admin.customFields.create({ entityType: "DEAL", label: "Площадь, м²", type: "NUMBER" })
  ).id
  typeFieldId = (
    await admin.customFields.create({
      entityType: "DEAL",
      label: "Тип объекта",
      type: "SELECT",
      options: ["Квартира", "Дом"],
    })
  ).id
})

describe("customFields: определения", () => {
  it("SELECT без вариантов отклоняется", async () => {
    const admin = makeCaller("ADMIN")
    await expect(
      admin.customFields.create({ entityType: "DEAL", label: "Без вариантов", type: "SELECT" })
    ).rejects.toThrow(/вариант/)
  })

  it("дубликат названия поля отклоняется по-русски", async () => {
    const admin = makeCaller("ADMIN")
    await expect(
      admin.customFields.create({ entityType: "DEAL", label: "Площадь, м²", type: "TEXT" })
    ).rejects.toThrow(/таким названием/)
  })

  it("MANAGER и VIEWER не правят определения (FORBIDDEN), но читают", async () => {
    const manager = makeCaller("MANAGER")
    await expect(manager.customFields.create({ entityType: "DEAL", label: "X", type: "TEXT" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    })
    const viewer = makeCaller("VIEWER")
    await expect(viewer.customFields.delete({ id: areaFieldId })).rejects.toMatchObject({
      code: "FORBIDDEN",
    })
    const list = await viewer.customFields.getAll({ entityType: "DEAL" })
    expect(list).toHaveLength(2)
  })

  it("reorder отдаёт поля в переданном порядке", async () => {
    const admin = makeCaller("ADMIN")
    const reordered = await admin.customFields.reorder({ ids: [typeFieldId, areaFieldId] })
    expect(reordered.map((f) => f.id)).toEqual([typeFieldId, areaFieldId])
    await admin.customFields.reorder({ ids: [areaFieldId, typeFieldId] })
  })

  it("переименование в дубликат отклоняется", async () => {
    const admin = makeCaller("ADMIN")
    await expect(admin.customFields.update({ id: typeFieldId, label: "Площадь, м²" })).rejects.toThrow(
      /таким названием/
    )
  })
})

describe("deals.create с кастомными полями", () => {
  it("значения сохраняются и читаются в getById с определением", async () => {
    const admin = makeCaller("ADMIN")
    const deal = await admin.deals.create({
      title: "Квартира на Лесной",
      fields: [
        { fieldId: areaFieldId, value: " 64,5 " },
        { fieldId: typeFieldId, value: "Квартира" },
      ],
    })
    const loaded = await admin.deals.getById({ id: deal.id })
    expect(loaded?.customFields).toHaveLength(2)
    const area = loaded?.customFields.find((v) => v.fieldId === areaFieldId)
    expect(area?.value).toBe("64.5")
    expect(area?.field.label).toBe("Площадь, м²")
    expect(area?.field.type).toBe("NUMBER")
  })

  it("пустые значения пропускаются, а не сохраняются пробелами", async () => {
    const admin = makeCaller("ADMIN")
    const deal = await admin.deals.create({
      title: "Сделка без полей",
      fields: [{ fieldId: areaFieldId, value: "   " }],
    })
    const loaded = await admin.deals.getById({ id: deal.id })
    expect(loaded?.customFields).toHaveLength(0)
  })

  it("невалидное значение откатывает сделку целиком (нет «полусделки»)", async () => {
    const admin = makeCaller("ADMIN")
    const before = await prisma.deal.count()
    await expect(
      admin.deals.create({
        title: "Битая площадь",
        fields: [{ fieldId: areaFieldId, value: "не число" }],
      })
    ).rejects.toThrow(/Введите число/)
    expect(await prisma.deal.count()).toBe(before)
  })

  it("неизвестный/чужой fieldId отклоняется", async () => {
    const admin = makeCaller("ADMIN")
    await expect(
      admin.deals.create({ title: "Мусорное поле", fields: [{ fieldId: "nope", value: "1" }] })
    ).rejects.toThrow(/Неизвестное поле/)
  })
})

describe("deals.update с кастомными полями", () => {
  it("полная замена: массив меняет значения, [] очищает", async () => {
    const admin = makeCaller("ADMIN")
    const deal = await admin.deals.create({
      title: "Дом с участком",
      fields: [
        { fieldId: areaFieldId, value: "100" },
        { fieldId: typeFieldId, value: "Дом" },
      ],
    })
    await admin.deals.update({
      id: deal.id,
      fields: [{ fieldId: areaFieldId, value: "120,5" }],
    })
    let loaded = await admin.deals.getById({ id: deal.id })
    expect(loaded?.customFields.map((v) => `${v.fieldId}:${v.value}`)).toEqual([
      `${areaFieldId}:120.5`,
    ])

    await admin.deals.update({ id: deal.id, fields: [] })
    loaded = await admin.deals.getById({ id: deal.id })
    expect(loaded?.customFields).toHaveLength(0)
  })

  it("update без fields не трогает значения", async () => {
    const admin = makeCaller("ADMIN")
    const deal = await admin.deals.create({
      title: "Точечная правка",
      fields: [{ fieldId: areaFieldId, value: "55" }],
    })
    await admin.deals.update({ id: deal.id, title: "Точечная правка — переименована" })
    const loaded = await admin.deals.getById({ id: deal.id })
    expect(loaded?.customFields.map((v) => v.value)).toEqual(["55"])
  })

  it("сужение вариантов SELECT удаляет выпавшие значения", async () => {
    const admin = makeCaller("ADMIN")
    const deal = await admin.deals.create({
      title: "Квартира под сужение",
      fields: [{ fieldId: typeFieldId, value: "Квартира" }],
    })
    await admin.customFields.update({ id: typeFieldId, options: ["Дом"] })
    const loaded = await admin.deals.getById({ id: deal.id })
    expect(loaded?.customFields).toHaveLength(0)
    // возвращаем варианты, чтобы другие тесты не зависели от порядка
    await admin.customFields.update({ id: typeFieldId, options: ["Квартира", "Дом"] })
  })
})

describe("deals.delete каскадом убирает значения", () => {
  it("значения не переживают удаление сделки", async () => {
    const admin = makeCaller("ADMIN")
    const deal = await admin.deals.create({
      title: "Сделка под удаление",
      fields: [{ fieldId: areaFieldId, value: "1" }],
    })
    const before = await prisma.dealFieldValue.count()
    expect(before).toBeGreaterThan(0)
    await admin.deals.delete({ id: deal.id })
    expect(await prisma.dealFieldValue.count()).toBe(before - 1)
  })
})
