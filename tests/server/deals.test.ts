import { beforeAll, describe, expect, it } from "vitest"
import { makeCaller, resetDb, seedCompany, seedStages } from "../helpers"

let stages: Awaited<ReturnType<typeof seedStages>>
let companyId: string

beforeAll(async () => {
  await resetDb()
  stages = await seedStages()
  companyId = (await seedCompany()).id
})

describe("deals.create", () => {
  it("без этапа сделка попадает на первый этап воронки", async () => {
    const caller = makeCaller("ADMIN")
    const deal = await caller.deals.create({ title: "Сделка без этапа" })
    expect(deal.stageId).toBe(stages[0].id)
  })

  it("явный этап сохраняется", async () => {
    const caller = makeCaller("ADMIN")
    const deal = await caller.deals.create({
      title: "Сделка с этапом",
      value: 100000,
      companyId,
      stageId: stages[1].id,
    })
    expect(deal.stageId).toBe(stages[1].id)
    expect(Number(deal.value)).toBe(100000)
    expect(deal.company?.name).toBe("ООО Тест")
  })
})

describe("deals.updateStatus", () => {
  it("WON фиксирует закрытие, LOST тоже, OPEN сбрасывает", async () => {
    const caller = makeCaller("ADMIN")
    const deal = await caller.deals.create({ title: "Статусная" })

    const won = await caller.deals.updateStatus({ id: deal.id, status: "WON" })
    expect(won.status).toBe("WON")
    expect(won.closedAt).not.toBeNull()

    const reopened = await caller.deals.updateStatus({ id: deal.id, status: "OPEN" })
    expect(reopened.status).toBe("OPEN")
    expect(reopened.closedAt).toBeNull()
  })
})

describe("deals.getById", () => {
  it("возвращает сделку со связями, 404-логика через null", async () => {
    const caller = makeCaller("ADMIN")
    const deal = await caller.deals.create({ title: "Связанная" })
    const found = await caller.deals.getById({ id: deal.id })
    expect(found?.title).toBe("Связанная")
    expect(Array.isArray(found?.tasks)).toBe(true)
    expect(Array.isArray(found?.activities)).toBe(true)

    const missing = await caller.deals.getById({ id: "no-such-id" })
    expect(missing).toBeNull()
  })
})

describe("pipeline.getStages", () => {
  it("этапы отсортированы по order", async () => {
    const caller = makeCaller("VIEWER")
    const list = await caller.pipeline.getStages()
    expect(list.map((s) => s.name)).toEqual([
      "Новая",
      "Переговоры",
      "Договор",
      "Выиграна",
      "Проиграна",
    ])
  })
})
