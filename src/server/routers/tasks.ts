import { z } from "zod"
import { router, authedProcedure, adminProcedure } from "../trpc"
import { prisma } from "@/lib/prisma"
import { TaskStatus, Priority } from "@/generated/prisma/client"
import type { Prisma } from "@/generated/prisma/client"

export const tasksRouter = router({
  getAll: authedProcedure.query(async () => {
    return prisma.task.findMany({
      include: {
        deal: true,
        project: true,
        assignee: true,
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    })
  }),

  getById: authedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return prisma.task.findUnique({
        where: { id: input.id },
        include: {
          deal: true,
          project: true,
          assignee: true,
        },
      })
    }),

  create: authedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        dueDate: z.string().optional(),
        priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
        dealId: z.string().optional(),
        projectId: z.string().optional(),
        assigneeId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return prisma.task.create({
        data: {
          ...input,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
        },
      })
    }),

  update: authedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        status: z.nativeEnum(TaskStatus).optional(),
        priority: z.nativeEnum(Priority).optional(),
        dueDate: z.string().optional().nullable(),
        assigneeId: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, dueDate, status, ...rest } = input
      const data: Prisma.TaskUncheckedUpdateInput = { ...rest }
      if (dueDate !== undefined) {
        data.dueDate = dueDate ? new Date(dueDate) : null
      }
      if (status !== undefined) {
        data.status = status
        data.completedAt = status === TaskStatus.DONE ? new Date() : null
      }
      return prisma.task.update({
        where: { id },
        data,
      })
    }),

  updateStatus: authedProcedure
    .input(z.object({ id: z.string(), status: z.nativeEnum(TaskStatus) }))
    .mutation(async ({ input }) => {
      return prisma.task.update({
        where: { id: input.id },
        data: {
          status: input.status,
          completedAt: input.status === TaskStatus.DONE ? new Date() : null,
        },
      })
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.task.delete({ where: { id: input.id } })
    }),
})
