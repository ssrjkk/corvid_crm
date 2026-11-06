import { beforeAll, describe, expect, it } from "vitest"
import { makeCaller, resetDb, seedStages } from "../helpers"

let dealId: string

beforeAll(async () => {
  await resetDb()
  await seedStages()
  const admin = makeCaller("ADMIN")
  const deal = await admin.deals.create({ title: "Сделка с задачами" })
  dealId = deal.id
})

describe("tasks.create + updateStatus", () => {
  it("задача привязывается к сделке; DONE фиксирует completedAt", async () => {
    const caller = makeCaller("ADMIN")
    const task = await caller.tasks.create({
      title: "Собрать требования",
      priority: "HIGH",
      dealId,
    })
    expect(task.status).toBe("TODO")
    expect(task.completedAt).toBeNull()

    const done = await caller.tasks.updateStatus({ id: task.id, status: "DONE" })
    expect(done.status).toBe("DONE")
    expect(done.completedAt).not.toBeNull()

    const reopened = await caller.tasks.updateStatus({ id: task.id, status: "IN_PROGRESS" })
    expect(reopened.completedAt).toBeNull()
  })

  it("задача с дедлайном сохраняет дату", async () => {
    const caller = makeCaller("ADMIN")
    const due = "2026-12-01"
    const task = await caller.tasks.create({
      title: "Со сроком",
      dueDate: due,
      dealId,
    })
    expect(task.dueDate).toBeTruthy()
    expect(new Date(task.dueDate as unknown as string).toISOString()).toContain("2026-12")
  })
})

describe("tasks.getAll", () => {
  it("возвращает задачи со сделками", async () => {
    const caller = makeCaller("VIEWER")
    const list = await caller.tasks.getAll()
    expect(list.length).toBeGreaterThan(0)
    const withDeal = list.find((t) => t.dealId === dealId)
    expect(withDeal).toBeDefined()
  })
})
