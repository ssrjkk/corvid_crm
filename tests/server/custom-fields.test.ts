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

/**
 * V33: тот же контракт для компаний и контактов. Определения полей создаются
 * под свою сущность; values отдельными таблицами с FK-каскадом.
 */
describe("customFields: компании (V33)", () => {
  let floorFieldId: string

  beforeAll(async () => {
    const admin = makeCaller("ADMIN")
    floorFieldId = (
      await admin.customFields.create({
        entityType: "COMPANY",
        label: "Этаж офиса",
        type: "NUMBER",
      })
    ).id
  })

  it("create сохраняет значения, getById читает с определением", async () => {
    const admin = makeCaller("ADMIN")
    const company = await admin.companies.create({
      name: "ООО Кастомные поля",
      fields: [{ fieldId: floorFieldId, value: "7,5" }],
    })
    const loaded = await admin.companies.getById({ id: company.id })
    const floor = loaded?.customFields.find((v) => v.fieldId === floorFieldId)
    expect(floor?.value).toBe("7.5")
    expect(floor?.field.label).toBe("Этаж офиса")
  })

  it("MANAGER может писать значения, но не определения", async () => {
    const manager = makeCaller("MANAGER")
    await expect(
      manager.customFields.create({ entityType: "COMPANY", label: "Чужое", type: "TEXT" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" })
    const company = await manager.companies.create({
      name: "ООО Менеджерская",
      fields: [{ fieldId: floorFieldId, value: "3" }],
    })
    const loaded = await manager.companies.getById({ id: company.id })
    expect(loaded?.customFields).toHaveLength(1)
  })

  it("update заменяет значения полностью, без fields — не трогает", async () => {
    const admin = makeCaller("ADMIN")
    const company = await admin.companies.create({
      name: "ООО Замена",
      fields: [{ fieldId: floorFieldId, value: "1" }],
    })
    await admin.companies.update({ id: company.id, fields: [{ fieldId: floorFieldId, value: "9" }] })
    let loaded = await admin.companies.getById({ id: company.id })
    expect(loaded?.customFields.map((v) => v.value)).toEqual(["9"])
    await admin.companies.update({ id: company.id, name: "ООО Замена-2" })
    loaded = await admin.companies.getById({ id: company.id })
    expect(loaded?.customFields.map((v) => v.value)).toEqual(["9"])
  })

  it("чужой fieldId (поле сделки) отклоняется, каскад работает", async () => {
    const admin = makeCaller("ADMIN")
    await expect(
      admin.companies.create({
        name: "ООО Чужие поля",
        fields: [{ fieldId: areaFieldId, value: "1" }],
      })
    ).rejects.toThrow(/Неизвестное поле/)
    const before = await prisma.companyFieldValue.count()
    const company = await admin.companies.create({
      name: "ООО Каскад",
      fields: [{ fieldId: floorFieldId, value: "2" }],
    })
    expect(await prisma.companyFieldValue.count()).toBe(before + 1)
    await admin.companies.delete({ id: company.id })
    expect(await prisma.companyFieldValue.count()).toBe(before)
  })
})

describe("customFields: контакты (V33)", () => {
  let birthdayFieldId: string

  beforeAll(async () => {
    const admin = makeCaller("ADMIN")
    birthdayFieldId = (
      await admin.customFields.create({
        entityType: "CONTACT",
        label: "День рождения",
        type: "DATE",
      })
    ).id
  })

  it("create + getById: дата хранится как ввёл пользователь", async () => {
    const admin = makeCaller("ADMIN")
    const contact = await admin.contacts.create({
      firstName: "Анна",
      lastName: "Керн",
      fields: [{ fieldId: birthdayFieldId, value: "1990-02-11" }],
    })
    const loaded = await admin.contacts.getById({ id: contact.id })
    const birthday = loaded?.customFields.find((v) => v.fieldId === birthdayFieldId)
    expect(birthday?.value).toBe("1990-02-11")
    expect(birthday?.field.type).toBe("DATE")
  })

  it("битая дата откатывает контакт целиком", async () => {
    const admin = makeCaller("ADMIN")
    const before = await prisma.contact.count()
    await expect(
      admin.contacts.create({
        firstName: "Битая дата",
        fields: [{ fieldId: birthdayFieldId, value: "не дата" }],
      })
    ).rejects.toThrow(/Некорректная дата/)
    expect(await prisma.contact.count()).toBe(before)
  })

  it("fields: [] очищает значения", async () => {
    const admin = makeCaller("ADMIN")
    const contact = await admin.contacts.create({
      firstName: "С полями",
      fields: [{ fieldId: birthdayFieldId, value: "1980-01-01" }],
    })
    await admin.contacts.update({ id: contact.id, fields: [] })
    const loaded = await admin.contacts.getById({ id: contact.id })
    expect(loaded?.customFields).toHaveLength(0)
  })
})
