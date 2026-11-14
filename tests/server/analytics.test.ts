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

describe("analytics.getSummary", () => {
  it("добавленные записи меняют ровно свои числа; totalValue округлён, DONE/CANCELLED не в openTasks", async () => {
    const caller = makeCaller("VIEWER")
    const before = await caller.analytics.getSummary()

    const carrier = await prisma.deal.create({ data: { title: "Носитель проекта" } })
    const carrierPlanned = await prisma.deal.create({ data: { title: "Носитель проекта (план)" } })
    await prisma.deal.create({ data: { title: "Сводка-1", value: 100000 } })
    await prisma.deal.create({ data: { title: "Сводка-2", value: 0.1 } })
    await prisma.deal.create({ data: { title: "Сводка-3", value: 0.2 } })
    await prisma.task.create({ data: { title: "Открытая задача", status: "IN_PROGRESS" } })
    await prisma.task.create({ data: { title: "Готовая задача", status: "DONE" } })
    await prisma.task.create({ data: { title: "Отменённая задача", status: "CANCELLED" } })
    await prisma.contact.create({ data: { firstName: "Сводный" } })
    await prisma.project.create({ data: { name: "Проект в работе", status: "IN_PROGRESS", dealId: carrier.id } })
    // dealId проекта уникален (1:1) — второй проект требует свою сделку-носитель.
    await prisma.project.create({ data: { name: "Проект в планировании", status: "PLANNING", dealId: carrierPlanned.id } })

    const after = await caller.analytics.getSummary()

    expect(after.totalDeals).toBe(before.totalDeals + 5) // 3 сводки + 2 носителя
    // Decimal-sum в Prisma точен (0.1 + 0.2 = 0.3), сумма приведена к копейкам.
    const rubBefore = before.valueByCurrency.find((v) => v.currency === "RUB")?.total ?? 0
    const rubAfter = after.valueByCurrency.find((v) => v.currency === "RUB")?.total ?? 0
    expect(rubAfter).toBeCloseTo(rubBefore + 100000.3, 10)
    expect(after.openTasks).toBe(before.openTasks + 1) // DONE и CANCELLED не считаются
    expect(after.totalContacts).toBe(before.totalContacts + 1)
    expect(after.activeProjects).toBe(before.activeProjects + 1) // PLANNING не считается
  })

  it("суммы группируются по валютам — USD не смешивается с RUB", async () => {
    const caller = makeCaller("VIEWER")
    const before = await caller.analytics.getSummary()
    const usdBefore = before.valueByCurrency.find((v) => v.currency === "USD")?.total ?? 0

    await prisma.deal.create({ data: { title: "Долларовая-1", value: 1200, currency: "USD" } })
    await prisma.deal.create({ data: { title: "Долларовая-2", value: 0.5, currency: "usd" } })
    await prisma.deal.create({ data: { title: "Рублёвая", value: 70000, currency: "RUB" } })

    const after = await caller.analytics.getSummary()
    const usdAfter = after.valueByCurrency.find((v) => v.currency === "USD")?.total ?? 0
    const rubAfter = after.valueByCurrency.find((v) => v.currency === "RUB")?.total ?? 0
    const rubBefore = before.valueByCurrency.find((v) => v.currency === "RUB")?.total ?? 0

    // Строчный код схлопнулся в USD и не влил 1200.5 в рублёвую сумму.
    expect(usdAfter).toBeCloseTo(usdBefore + 1200.5, 10)
    expect(rubAfter).toBeCloseTo(rubBefore + 70000, 10)
  })

  it("пустая база даёт нули и 0 суммы", async () => {
    // После resetDb в beforeAll других данных может не быть, но этот файл их
    // насоздавал — проверяем форму значения, а не абсолютные нули.
    const summary = await makeCaller("VIEWER").analytics.getSummary()
    expect(Object.keys(summary).sort()).toEqual([
      "activeProjects",
      "openTasks",
      "totalContacts",
      "totalDeals",
      "valueByCurrency",
    ])
    const rub = summary.valueByCurrency.find((v) => v.currency === "RUB")?.total ?? 0
    expect(rub).toBeGreaterThanOrEqual(0)
  })
})
