import { router, authedProcedure } from "../trpc"
import { prisma } from "@/lib/prisma"
import { roundMoney } from "@/lib/money"

export const analyticsRouter = router({
  /**
   * Сводка дашборда (V27 «Ресурсы»): 5 чисел одним запросом.
   * Раньше клиент тянул deals.getAll (полные связи: owner, tasks+assignee,
   * activities, project) + tasks.getAll + contacts.getAll + projects.getAll —
   * четыре тяжёлых выборки только ради count/суммы. Здесь — count/aggregate,
   * никаких связей. Новые виджеты дашборда — так же: аналитические запросы, не getAll.
   */
  getSummary: authedProcedure.query(async () => {
    const [totalDeals, valueAgg, openTasks, totalContacts, activeProjects] = await Promise.all([
      prisma.deal.count(),
      prisma.deal.aggregate({ _sum: { value: true } }),
      prisma.task.count({ where: { status: { notIn: ["DONE", "CANCELLED"] } } }),
      prisma.contact.count(),
      prisma.project.count({ where: { status: "IN_PROGRESS" } }),
    ])
    return {
      totalDeals,
      totalValue: roundMoney(Number(valueAgg._sum.value ?? 0)),
      openTasks,
      totalContacts,
      activeProjects,
    }
  }),

  getFunnel: authedProcedure.query(async () => {
    const stages = await prisma.pipelineStage.findMany({
      include: { _count: { select: { deals: true } } },
      orderBy: { order: "asc" },
    })
    return stages.map((s) => ({ name: s.name, count: s._count.deals, color: s.color }))
  }),

  getRevenueByMonth: authedProcedure.query(async () => {
    const deals = await prisma.deal.findMany({
      where: { status: "WON", closedAt: { not: null } },
      select: { value: true, closedAt: true },
    })
    const map = new Map<string, number>()
    for (const d of deals) {
      if (!d.closedAt) continue
      const key = d.closedAt.toISOString().slice(0, 7)
      map.set(key, (map.get(key) || 0) + Number(d.value || 0))
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, total]) => ({ month, total }))
  }),

  getTaskWidgets: authedProcedure.query(async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const tasks = await prisma.task.findMany({
      where: { status: { in: ["TODO", "IN_PROGRESS", "REVIEW"] } },
      include: { deal: true, project: true },
      orderBy: { dueDate: "asc" },
    })

    const todayTasks = tasks.filter((t) => t.dueDate && t.dueDate >= today && t.dueDate < tomorrow)
    const overdueTasks = tasks.filter((t) => t.dueDate && t.dueDate < today)
    return { todayTasks, overdueTasks }
  }),
})
