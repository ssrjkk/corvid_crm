import { beforeAll, describe, expect, it } from "vitest"
import { makeCaller, resetDb, seedStages } from "../helpers"

const admin = makeCaller("ADMIN")
const manager = makeCaller("MANAGER")
const viewer = makeCaller("VIEWER")

let companyId: string
let dealId: string
let contactId: string

beforeAll(async () => {
  await resetDb()
  await seedStages()
  const company = await admin.companies.create({ name: "ООО Агрегатор" })
  companyId = company.id
  const deal = await admin.deals.create({ title: "Сделка агрегатора", companyId })
  dealId = deal.id
  const contact = await admin.contacts.create({ firstName: "Мария", companyId })
  contactId = contact.id
  // Активности по обоим путям: к контакту компании и к её сделке.
  await admin.activities.create({ type: "NOTE", content: "Заметка у контакта", contactId })
  await admin.activities.create({ type: "CALL", content: "Звонок по сделке", dealId })
})

describe("companies.getById — агрегация активностей", () => {
  it("собирает активности и от контактов компании, и от её сделок", async () => {
    const found = await admin.companies.getById({ id: companyId })
    expect(found).not.toBeNull()
    expect(found!.contacts.some((c) => c.id === contactId)).toBe(true)
    expect(found!.deals.some((d) => d.id === dealId)).toBe(true)
    const contents = found!.activities.map((a) => a.content)
    expect(contents).toContain("Заметка у контакта")
    expect(contents).toContain("Звонок по сделке")
  })

  it("несуществующая компания — null", async () => {
    expect(await admin.companies.getById({ id: "no-such" })).toBeNull()
  })
})

describe("contacts.update", () => {
  it("меняет поля", async () => {
    const updated = await admin.contacts.update({
      id: contactId,
      firstName: "Мария-2",
      position: "CTO",
    })
    expect(updated.firstName).toBe("Мария-2")
    expect(updated.position).toBe("CTO")
  })

  it("открепляет компанию через null companyId", async () => {
    const detached = await admin.contacts.update({ id: contactId, companyId: null })
    expect(detached.companyId).toBeNull()
  })

  it("VIEWER не может обновлять", async () => {
    await expect(viewer.contacts.update({ id: contactId, firstName: "Хакер" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    })
  })
})

describe("contacts.delete — только ADMIN", () => {
  it("MANAGER не может, ADMIN может", async () => {
    const temp = await admin.contacts.create({ firstName: "Временный" })
    await expect(manager.contacts.delete({ id: temp.id })).rejects.toMatchObject({
      code: "FORBIDDEN",
    })
    await expect(admin.contacts.delete({ id: temp.id })).resolves.toBeDefined()
    expect(await admin.contacts.getById({ id: temp.id })).toBeNull()
  })
})

describe("activities.getAll + delete", () => {
  it("лента читается любым залогиненным и отсортирована от новых к старым", async () => {
    const list = await viewer.activities.getAll()
    expect(list.length).toBeGreaterThanOrEqual(2)
    const times = list.map((a) => new Date(a.createdAt).getTime())
    expect(times).toEqual([...times].sort((a, b) => b - a))
  })

  it("delete — только ADMIN", async () => {
    const act = await admin.activities.create({ content: "На удаление" })
    await expect(manager.activities.delete({ id: act.id })).rejects.toMatchObject({
      code: "FORBIDDEN",
    })
    await expect(admin.activities.delete({ id: act.id })).resolves.toBeDefined()
  })
})

describe("projects.getAll / getById / update (даты)", () => {
  let projectId: string

  it("create + getAll с счётчиком задач; getById с задачами и сделкой", async () => {
    const deal2 = await admin.deals.create({ title: "Сделка проекта getAll" })
    const project = await admin.projects.create({
      name: "Проект getAll",
      dealId: deal2.id,
      deadline: "2026-12-31",
    })
    projectId = project.id
    await admin.tasks.create({ title: "Задача проекта", projectId: project.id, dealId: deal2.id })

    const list = await viewer.projects.getAll()
    const mine = list.find((p) => p.id === projectId)
    expect(mine?._count.tasks).toBe(1)

    const found = await admin.projects.getById({ id: projectId })
    expect(found?.deal.title).toBe("Сделка проекта getAll")
    expect(found?.tasks.map((t) => t.title)).toContain("Задача проекта")
  })

  it("update парсит строку в дату и умеет очищать через null", async () => {
    const updated = await admin.projects.update({
      id: projectId,
      startDate: "2026-01-10",
      deadline: null,
    })
    expect(updated.startDate).toBeInstanceOf(Date)
    expect(updated.deadline).toBeNull()
  })

  it("VIEWER не может менять проект", async () => {
    await expect(
      viewer.projects.updateStatus({ id: projectId, status: "COMPLETED" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" })
  })
})
