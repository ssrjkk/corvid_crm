import { z } from "zod"
import { router, authedProcedure, adminProcedure } from "../trpc"
import { prisma } from "@/lib/prisma"

export const contactsRouter = router({
  getAll: authedProcedure.query(async () => {
    return prisma.contact.findMany({
      include: {
        company: true,
        _count: { select: { deals: true, activities: true } },
      },
      orderBy: { createdAt: "desc" },
    })
  }),

  getById: authedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return prisma.contact.findUnique({
        where: { id: input.id },
        include: {
          company: true,
          deals: {
            include: { stage: true, company: true },
            orderBy: { createdAt: "desc" },
          },
          activities: {
            include: { user: true, deal: true },
            orderBy: { createdAt: "desc" },
          },
        },
      })
    }),

  create: authedProcedure
    .input(
      z.object({
        firstName: z.string().min(1),
        lastName: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        phone: z.string().optional(),
        companyId: z.string().optional(),
        position: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return prisma.contact.create({ data: input })
    }),

  update: authedProcedure
    .input(
      z.object({
        id: z.string(),
        firstName: z.string().min(1).optional(),
        lastName: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        phone: z.string().optional(),
        companyId: z.string().optional().nullable(),
        position: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input
      return prisma.contact.update({ where: { id }, data })
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.contact.delete({ where: { id: input.id } })
    }),
})
