import { z } from "zod"
import { router, publicProcedure, adminProcedure } from "../trpc"
import { prisma } from "@/lib/prisma"
import { ActivityType } from "@/generated/prisma"

export const activitiesRouter = router({
  getAll: publicProcedure.query(async () => {
    return prisma.activity.findMany({
      include: {
        deal: true,
        contact: true,
        user: true,
      },
      orderBy: { createdAt: "desc" },
    })
  }),

  create: publicProcedure
    .input(
      z.object({
        type: z.nativeEnum(ActivityType).default(ActivityType.NOTE),
        title: z.string().optional(),
        content: z.string().min(1),
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
