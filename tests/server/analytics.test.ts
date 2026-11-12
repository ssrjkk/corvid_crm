import { beforeAll, describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { makeCaller, resetDb, seedStages } from "../helpers"

beforeAll(async () => {
  await resetDb()
})

describe("analytics.getFunnel", () => {
  it("этапы по порядку с количеством сделок и цветом", async () => {
    const stages = await seedStages()
    const admin = makeCaller("ADMIN")
    await admin.deals.create({ title: "Сделка A" }) // этап по умолчанию — первый
    await admin.deals.create({ title: "Сделка B" })
    await admin.deals.create({ title: "Сделка C", stageId: stages[1].id })

    const funnel = await makeCaller("VIEWER").analytics.getFunnel()
    expect(funnel.map((f) => f.name)).toEqual([
      "Новая",
      "Переговоры",
      "Договор",
      "Выиграна",
      "Проиграна",
    ])
    expect(funnel[0].count).toBe(2)
    expect(funnel[1].count).toBe(1)
    expect(funnel[4].count).toBe(0)
    expect(funnel[0].color).toBe("#94a3b8")
  })
})

describe("analytics.getRevenueByMonth", () => {
  it("суммирует только WON с датой закрытия, группирует по месяцам, сортирует по возрастанию", async () => {
    await prisma.deal.create({
      data: { title: "Январь", status: "WON", value: 100000, closedAt: new Date("2026-01-15T12:00:00Z") },
    })
    await prisma.deal.create({
      data: { title: "Февраль-1", status: "WON", value: 50000, closedAt: new Date("2026-02-20T12:00:00Z") },
    })
    await prisma.deal.create({
      data: { title: "Февраль-2", status: "WON", value: 25000, closedAt: new Date("2026-02-25T12:00:00Z") },
    })
    // Не должно попасть в выручку:
    await prisma.deal.create({ data: { title: "Открытая", status: "OPEN", value: 999999 } })
    await prisma.deal.create({ data: { title: "WON без даты закрытия", status: "WON", value: 777777 } })

    const revenue = await makeCaller("VIEWER").analytics.getRevenueByMonth()
    expect(revenue).toEqual([
      { month: "2026-01", total: 100000 },
      { month: "2026-02", total: 75000 },
    ])
  })
})

describe("analytics.getTaskWidgets", () => {
  it("корзины «сегодня» и «просрочено»: активные статусы, DONE не попадает", async () => {
    // Полдень текущего дня — внутри окна «сегодня» независимо от часового пояса.
    const todayNoon = new Date()
    todayNoon.setHours(12, 0, 0, 0)
    const yesterdayNoon = new Date(todayNoon)
    yesterdayNoon.setDate(yesterdayNoon.getDate() - 1)
    const tomorrowNoon = new Date(todayNoon)
    tomorrowNoon.setDate(tomorrowNoon.getDate() + 1)

    await prisma.task.create({ data: { title: "Задача на сегодня", dueDate: todayNoon, status: "TODO" } })
    await prisma.task.create({ data: { title: "Просрочка", dueDate: yesterdayNoon, status: "IN_PROGRESS" } })
    await prisma.task.create({ data: { title: "Завтрашняя", dueDate: tomorrowNoon, status: "TODO" } })
    await prisma.task.create({
      data: { title: "Закрытая просрочка", dueDate: yesterdayNoon, status: "DONE", completedAt: yesterdayNoon },
    })
    await prisma.task.create({ data: { title: "Без срока", status: "TODO" } })

    const { todayTasks, overdueTasks } = await makeCaller("VIEWER").analytics.getTaskWidgets()
    expect(todayTasks.map((t) => t.title)).toEqual(["Задача на сегодня"])
    expect(overdueTasks.map((t) => t.title)).toEqual(["Просрочка"])
  })
})
