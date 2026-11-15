import { z } from "zod"
import { router, authedProcedure, adminProcedure } from "../trpc"
import { prisma } from "@/lib/prisma"
import { ProjectStatus } from "@/generated/prisma/client"
import {
  optionalNullableDateStringSchema,
  optionalDateStringSchema,
  optionalText,
  requiredText,
} from "../validation"

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
        name: requiredText("название проекта"),
        description: optionalText(),
        dealId: z.string().min(1),
        startDate: optionalDateStringSchema,
        deadline: optionalDateStringSchema,
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
        name: requiredText("название проекта").optional(),
        description: optionalText(),
        status: z.nativeEnum(ProjectStatus).optional(),
        startDate: optionalNullableDateStringSchema,
        deadline: optionalNullableDateStringSchema,
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
