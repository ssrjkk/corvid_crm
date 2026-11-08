import { z } from "zod"
import { router, authedProcedure, adminProcedure } from "../trpc"
import { prisma } from "@/lib/prisma"

export const companiesRouter = router({
  getAll: authedProcedure.query(async () => {
    return prisma.company.findMany({
      include: {
        _count: { select: { contacts: true, deals: true } },
      },
      orderBy: { createdAt: "desc" },
    })
  }),

  getById: authedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const company = await prisma.company.findUnique({
        where: { id: input.id },
        include: {
          contacts: { orderBy: { createdAt: "desc" } },
          deals: {
            include: { stage: true, contact: true },
            orderBy: { createdAt: "desc" },
          },
        },
      })
      if (!company) return null

      // Activity has no direct company relation, so collect all activity
      // that belongs to the company's contacts or deals.
      const activities = await prisma.activity.findMany({
        where: {
          OR: [
            { contact: { companyId: input.id } },
            { deal: { companyId: input.id } },
          ],
        },
        include: { deal: true, contact: true, user: true },
        orderBy: { createdAt: "desc" },
      })

      return { ...company, activities }
    }),

  create: authedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email().optional().or(z.literal("")),
        phone: z.string().optional(),
        website: z.string().optional(),
        address: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return prisma.company.create({ data: input })
    }),

  update: authedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional().or(z.literal("")),
        phone: z.string().optional(),
        website: z.string().optional(),
        address: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input
      return prisma.company.update({ where: { id }, data })
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.company.delete({ where: { id: input.id } })
    }),
})
