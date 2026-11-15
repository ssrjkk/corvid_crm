import { z } from "zod"
import { router, authedProcedure, adminProcedure } from "../trpc"
import { prisma } from "@/lib/prisma"
import {
  addressSchema,
  emailSchema,
  phoneSchema,
  requiredText,
  optionalText,
  websiteSchema,
} from "../validation"

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
        name: requiredText("название компании"),
        email: emailSchema,
        phone: phoneSchema,
        website: websiteSchema,
        address: addressSchema,
        description: optionalText(),
      })
    )
    .mutation(async ({ input }) => {
      return prisma.company.create({ data: input })
    }),

  update: authedProcedure
    .input(
      z.object({
        id: z.string(),
        name: requiredText("название компании").optional(),
        email: emailSchema,
        phone: phoneSchema,
        website: websiteSchema,
        address: addressSchema,
        description: optionalText(),
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
