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
  customFieldValuesSchema,
} from "../validation"
import { resolveFieldValues } from "../custom-fields"
import { CustomEntityType } from "@/generated/prisma/client"

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
          // V33: кастомные поля компании — в порядке, заданном админом.
          customFields: {
            orderBy: { field: { order: "asc" } },
            include: { field: true },
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
        fields: customFieldValuesSchema.optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { fields, ...data } = input
      const rows = fields
        ? await resolveFieldValues(CustomEntityType.COMPANY, fields)
        : []
      return prisma.$transaction(async (tx) => {
        const company = await tx.company.create({ data })
        if (rows.length > 0) {
          await tx.companyFieldValue.createMany({
            data: rows.map((row) => ({ ...row, companyId: company.id })),
          })
        }
        return company
      })
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
        // Семантика «полной замены» — как у сделок (V32).
        fields: customFieldValuesSchema.optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, fields, ...data } = input
      const rows = fields
        ? await resolveFieldValues(CustomEntityType.COMPANY, fields)
        : null
      return prisma.$transaction(async (tx) => {
        const company = await tx.company.update({ where: { id }, data })
        if (rows) {
          await tx.companyFieldValue.deleteMany({ where: { companyId: id } })
          if (rows.length > 0) {
            await tx.companyFieldValue.createMany({
              data: rows.map((row) => ({ ...row, companyId: id })),
            })
          }
        }
        return company
      })
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.company.delete({ where: { id: input.id } })
    }),
})
