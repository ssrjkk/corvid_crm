import { z } from "zod"
import { router, publicProcedure, adminProcedure } from "../trpc"
import { prisma } from "@/lib/prisma"

export const pipelineRouter = router({
  getStages: publicProcedure.query(async () => {
    return prisma.pipelineStage.findMany({
      include: {
        deals: {
          include: {
            company: true,
            contact: true,
          },
        },
      },
      orderBy: { order: "asc" },
    })
  }),

  createStage: adminProcedure
    .input(z.object({ name: z.string().min(1), order: z.number().default(0), color: z.string().optional() }))
    .mutation(async ({ input }) => {
      return prisma.pipelineStage.create({ data: input })
    }),

  updateStage: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        color: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input
      return prisma.pipelineStage.update({ where: { id }, data })
    }),

  /** Перестановка: передаётся полный порядок id этапов. */
  reorderStages: adminProcedure
    .input(z.object({ ids: z.array(z.string()).min(1) }))
    .mutation(async ({ input }) => {
      await prisma.$transaction(
        input.ids.map((id, index) =>
          prisma.pipelineStage.update({ where: { id }, data: { order: index } })
        )
      )
      return prisma.pipelineStage.findMany({ orderBy: { order: "asc" } })
    }),

  /** Удаление разрешено только для пустого этапа. */
  deleteStage: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    const dealsCount = await prisma.deal.count({ where: { stageId: input.id } })
    if (dealsCount > 0) {
      throw new Error(`На этапе ${dealsCount} сделок — сначала перенесите их`)
    }
    return prisma.pipelineStage.delete({ where: { id: input.id } })
  }),

  initDefault: adminProcedure.mutation(async () => {
    const count = await prisma.pipelineStage.count()
    if (count > 0) return { created: 0 }
    await prisma.pipelineStage.createMany({
      data: [
        { name: "Новая", order: 0, color: "#94a3b8" },
        { name: "Переговоры", order: 1, color: "#3b82f6" },
        { name: "Договор", order: 2, color: "#f59e0b" },
        { name: "Выиграна", order: 3, color: "#10b981" },
        { name: "Проиграна", order: 4, color: "#ef4444" },
      ],
    })
    return { created: 5 }
  }),
})
