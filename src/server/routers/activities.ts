import { z } from "zod"
import { router, authedProcedure, adminProcedure } from "../trpc"
import { prisma } from "@/lib/prisma"
import { ActivityType } from "@/generated/prisma/client"
import { LIMITS, optionalText, requiredText } from "../validation"

export const activitiesRouter = router({
  getAll: authedProcedure.query(async () => {
    return prisma.activity.findMany({
      include: {
        deal: true,
        contact: true,
        user: true,
      },
      orderBy: { createdAt: "desc" },
    })
  }),

  create: authedProcedure
    .input(
      z.object({
        type: z.nativeEnum(ActivityType).default(ActivityType.NOTE),
        title: optionalText(LIMITS.title),
        content: requiredText("содержание"),
        dealId: z.string().optional(),
        contactId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return prisma.activity.create({ data: input })
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.activity.delete({ where: { id: input.id } })
    }),
})
