import { z } from "zod"
import { router, authedProcedure, adminProcedure } from "../trpc"
import { prisma } from "@/lib/prisma"
import {
  emailSchema,
  phoneSchema,
  requiredText,
  shortTextSchema,
  customFieldValuesSchema,
} from "../validation"
import { resolveFieldValues } from "../custom-fields"
import { CustomEntityType } from "@/generated/prisma/client"

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
          // V33: кастомные поля контакта — в порядке, заданном админом.
          customFields: {
            orderBy: { field: { order: "asc" } },
            include: { field: true },
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
        fields: customFieldValuesSchema.optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { fields, ...data } = input
      const rows = fields
        ? await resolveFieldValues(CustomEntityType.CONTACT, fields)
        : []
      return prisma.$transaction(async (tx) => {
        const contact = await tx.contact.create({ data })
        if (rows.length > 0) {
          await tx.contactFieldValue.createMany({
            data: rows.map((row) => ({ ...row, contactId: contact.id })),
          })
        }
        return contact
      })
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
        // Семантика «полной замены» — как у сделок и компаний (V32/V33).
        fields: customFieldValuesSchema.optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, fields, ...data } = input
      const rows = fields
        ? await resolveFieldValues(CustomEntityType.CONTACT, fields)
        : null
      return prisma.$transaction(async (tx) => {
        const contact = await tx.contact.update({ where: { id }, data })
        if (rows) {
          await tx.contactFieldValue.deleteMany({ where: { contactId: id } })
          if (rows.length > 0) {
            await tx.contactFieldValue.createMany({
              data: rows.map((row) => ({ ...row, contactId: id })),
            })
          }
        }
        return contact
      })
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.contact.delete({ where: { id: input.id } })
    }),
})
