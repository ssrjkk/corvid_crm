import { z } from "zod"
import { router, authedProcedure, adminProcedure } from "../trpc"
import { prisma } from "@/lib/prisma"
import {
  emailSchema,
  phoneSchema,
  requiredText,
  shortTextSchema,
} from "../validation"

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
        firstName: requiredText("имя контакта"),
        lastName: shortTextSchema,
        email: emailSchema,
        phone: phoneSchema,
        companyId: z.string().optional(),
        position: shortTextSchema,
      })
    )
    .mutation(async ({ input }) => {
      return prisma.contact.create({ data: input })
    }),

  update: authedProcedure
    .input(
      z.object({
        id: z.string(),
        firstName: requiredText("имя контакта").optional(),
        lastName: shortTextSchema,
        email: emailSchema,
        phone: phoneSchema,
        companyId: z.string().optional().nullable(),
        position: shortTextSchema,
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
