import { z } from "zod"
import { router, authedProcedure, adminProcedure } from "../trpc"
import { prisma } from "@/lib/prisma"
import { currencySchema, defaultCurrencySchema } from "../currency"

export const dealsRouter = router({
  getAll: authedProcedure.query(async () => {
    return prisma.deal.findMany({
      include: {
        stage: true,
        company: true,
        contact: true,
        owner: true,
        _count: {
          select: { tasks: true, activities: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })
  }),

  getById: authedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return prisma.deal.findUnique({
        where: { id: input.id },
        include: {
          stage: true,
          company: true,
          contact: true,
          owner: true,
          tasks: {
            include: { assignee: true },
            orderBy: { createdAt: "desc" },
          },
          activities: {
            include: { user: true, contact: true },
            orderBy: { createdAt: "desc" },
          },
          project: true,
        },
      })
    }),

  create: authedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        value: z.number().optional(),
        currency: defaultCurrencySchema,
        companyId: z.string().optional(),
        contactId: z.string().optional(),
        stageId: z.string().optional(),
        tags: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      let stageId = input.stageId
      if (!stageId) {
        // Put new deals on the first pipeline stage so they show up on the board.
        const firstStage = await prisma.pipelineStage.findFirst({ orderBy: { order: "asc" } })
        stageId = firstStage?.id
      }
      return prisma.deal.create({
        data: { ...input, stageId },
        include: {
          stage: true,
          company: true,
          contact: true,
        },
      })
    }),

  update: authedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        value: z.number().optional(),
        currency: currencySchema.optional(),
        companyId: z.string().optional().nullable(),
        contactId: z.string().optional().nullable(),
        stageId: z.string().optional().nullable(),
        tags: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input
      return prisma.deal.update({
        where: { id },
        data,
      })
    }),

  updateStage: authedProcedure
    .input(z.object({ id: z.string(), stageId: z.string() }))
    .mutation(async ({ input }) => {
      const stage = await prisma.pipelineStage.findUnique({ where: { id: input.stageId } })
      const status = stage?.name === "Выиграна" ? "WON" : stage?.name === "Проиграна" ? "LOST" : "OPEN"
      return prisma.deal.update({
        where: { id: input.id },
        data: {
          stageId: input.stageId,
          status,
          closedAt: status === "OPEN" ? null : new Date(),
        },
      })
    }),

  updateStatus: authedProcedure
    .input(z.object({ id: z.string(), status: z.enum(["OPEN", "WON", "LOST"]) }))
    .mutation(async ({ input }) => {
      return prisma.deal.update({
        where: { id: input.id },
        data: {
          status: input.status,
          closedAt: input.status !== "OPEN" ? new Date() : null,
        },
      })
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.deal.delete({ where: { id: input.id } })
    }),
})
