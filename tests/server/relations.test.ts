import { beforeAll, describe, expect, it } from "vitest"
import { makeCaller, resetDb, seedCompany, seedStages } from "../helpers"

let companyId: string
let dealId: string

beforeAll(async () => {
  await resetDb()
  await seedStages()
  companyId = (await seedCompany()).id
  const admin = makeCaller("ADMIN")
  const deal = await admin.deals.create({ title: "Сделка для связей", companyId })
  dealId = deal.id
})

describe("companies", () => {
  it("create + getById + getAll", async () => {
    const admin = makeCaller("ADMIN")
    const company = await admin.companies.create({
      name: "ООО Рога",
      email: "roga@example.com",
      phone: "+7 900 000-00-00",
    })
    expect(company.name).toBe("ООО Рога")

    const found = await admin.companies.getById({ id: company.id })
    expect(found?.email).toBe("roga@example.com")
    const list = await makeCaller("VIEWER").companies.getAll()
    expect(list.some((c) => c.id === company.id)).toBe(true)
  })

  it("update меняет поля", async () => {
    const admin = makeCaller("ADMIN")
    const company = await admin.companies.create({ name: "Старое имя" })
    const updated = await admin.companies.update({ id: company.id, name: "Новое имя" })
    expect(updated.name).toBe("Новое имя")
  })

  it("delete — только ADMIN", async () => {
    const admin = makeCaller("ADMIN")
    const manager = makeCaller("MANAGER")
    const company = await admin.companies.create({ name: "На удаление" })
    await expect(manager.companies.delete({ id: company.id })).rejects.toMatchObject({
      code: "FORBIDDEN",
    })
    await expect(admin.companies.delete({ id: company.id })).resolves.toBeDefined()
  })
})

describe("contacts", () => {
  it("create с компанией и getById возвращает связи", async () => {
    const admin = makeCaller("ADMIN")
    const contact = await admin.contacts.create({
      firstName: "Иван",
      lastName: "Петров",
      email: "ivan@example.com",
      companyId,
    })
    const found = await admin.contacts.getById({ id: contact.id })
    expect(found?.firstName).toBe("Иван")
    expect(found?.company?.name).toBe("ООО Тест")
  })
})

describe("activities", () => {
  it("create привязывается к сделке и попадает в ленту сделки", async () => {
    const admin = makeCaller("ADMIN")
    const activity = await admin.activities.create({
      type: "CALL",
      title: "Звонок",
      content: "Обсудили сроки",
      dealId,
    })
    expect(activity.type).toBe("CALL")

    const deal = await admin.deals.getById({ id: dealId })
    expect(deal?.activities.some((a) => a.id === activity.id)).toBe(true)
  })
})

describe("projects", () => {
  it("create привязан к сделке; одна сделка — один проект", async () => {
    const admin = makeCaller("ADMIN")
    const project = await admin.projects.create({
      name: "Внедрение CRM",
      dealId,
      deadline: "2026-12-31",
    })
    expect(project.dealId).toBe(dealId)

    // dealId уникален — второй проект по той же сделке должен упасть
    await expect(
      admin.projects.create({ name: "Дубликат", dealId })
    ).rejects.toBeDefined()
  })

  it("updateStatus меняет статус проекта", async () => {
    const admin = makeCaller("ADMIN")
    const deal2 = await admin.deals.create({ title: "Сделка проекта 2" })
    const project = await admin.projects.create({ name: "Проект 2", dealId: deal2.id })
    const updated = await admin.projects.updateStatus({
      id: project.id,
      status: "IN_PROGRESS",
    })
    expect(updated.status).toBe("IN_PROGRESS")
  })

  it("delete — только ADMIN", async () => {
    const admin = makeCaller("ADMIN")
    const viewer = makeCaller("VIEWER")
    const deal3 = await admin.deals.create({ title: "Сделка проекта 3" })
    const project = await admin.projects.create({ name: "Проект 3", dealId: deal3.id })
    await expect(viewer.projects.delete({ id: project.id })).rejects.toMatchObject({
      code: "FORBIDDEN",
    })
  })
})

describe("deals.updateStage (логика drag-and-drop)", () => {
  it("перемещение в «Выиграна» закрывает сделку, в «Новая» — возвращает в работу", async () => {
    const admin = makeCaller("ADMIN")
    const stages = await admin.pipeline.getStages()
    const won = stages.find((s) => s.name === "Выиграна")!
    const fresh = stages.find((s) => s.name === "Новая")!

    const deal = await admin.deals.create({ title: "Дрг-н-дроп" })
    const closed = await admin.deals.updateStage({ id: deal.id, stageId: won.id })
    expect(closed.status).toBe("WON")
    expect(closed.closedAt).not.toBeNull()

    const reopened = await admin.deals.updateStage({ id: deal.id, stageId: fresh.id })
    expect(reopened.status).toBe("OPEN")
    expect(reopened.closedAt).toBeNull()
  })
})
