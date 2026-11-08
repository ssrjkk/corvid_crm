import { z } from "zod"
import { router, authedProcedure, adminProcedure } from "../trpc"
import { prisma } from "@/lib/prisma"
import { ProjectStatus } from "@/generated/prisma"

export const projectsRouter = router({
  getAll: authedProcedure.query(async () => {
    return prisma.project.findMany({
      include: {
        deal: true,
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: "desc" },
    })
  }),

  getById: authedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return prisma.project.findUnique({
        where: { id: input.id },
        include: {
          deal: { include: { company: true, contact: true } },
          tasks: { include: { assignee: true }, orderBy: { createdAt: "desc" } },
        },
      })
    }),

  create: authedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        dealId: z.string().min(1),
        startDate: z.string().optional(),
        deadline: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return prisma.project.create({
        data: {
          ...input,
          startDate: input.startDate ? new Date(input.startDate) : null,
          deadline: input.deadline ? new Date(input.deadline) : null,
        },
      })
    }),

  update: authedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        status: z.nativeEnum(ProjectStatus).optional(),
        startDate: z.string().optional().nullable(),
        deadline: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, startDate, deadline, ...rest } = input
      return prisma.project.update({
        where: { id },
        data: {
          ...rest,
          startDate: startDate ? new Date(startDate) : startDate === null ? null : undefined,
          deadline: deadline ? new Date(deadline) : deadline === null ? null : undefined,
        },
      })
    }),

  updateStatus: authedProcedure
    .input(z.object({ id: z.string(), status: z.nativeEnum(ProjectStatus) }))
    .mutation(async ({ input }) => {
      return prisma.project.update({
        where: { id: input.id },
        data: { status: input.status },
      })
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.project.delete({ where: { id: input.id } })
    }),
})
