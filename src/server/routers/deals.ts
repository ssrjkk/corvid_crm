import { z } from "zod"
import { router, authedProcedure, adminProcedure } from "../trpc"
import { prisma } from "@/lib/prisma"
import { currencySchema, defaultCurrencySchema } from "../currency"
import {
  customFieldValuesSchema,
  moneySchema,
  optionalText,
  optionalNullableTagsSchema,
  tagsSchema,
  titleSchema,
} from "../validation"
import { normalizeFieldValue } from "../custom-fields"
import { fieldOptions } from "@/lib/custom-fields"
import { CustomEntityType } from "@/generated/prisma/client"

/**
 * V32: проверяет значения кастомных полей против их определений.
 * Неизвестный/чужой fieldId, неверный тип значения или вариант вне списка
 * отклоняются с русским сообщением — ДО записи в БД.
 */
async function resolveFieldValues(rawFields: { fieldId: string; value: string }[]) {
  const filled = rawFields.filter((f) => f.value.trim() !== "")
  if (filled.length === 0) return []
  const ids = Array.from(new Set(filled.map((f) => f.fieldId)))
  const defs = await prisma.customField.findMany({
    where: { id: { in: ids }, entityType: CustomEntityType.DEAL },
  })
  if (defs.length !== ids.length) {
    throw new Error("Неизвестное поле — обновите страницу")
  }
  const rows: { fieldId: string; value: string }[] = []
  for (const f of filled) {
    const def = defs.find((d) => d.id === f.fieldId)
    if (!def) continue
    const value = normalizeFieldValue(
      { type: def.type, options: fieldOptions(def.options) },
      f.value
    )
    rows.push({ fieldId: f.fieldId, value })
  }
  return rows
}

export const dealsRouter = router({
  getAll: authedProcedure.query(async () => {
    return prisma.deal.findMany({
      include: {
        stage: true,
        company: true,
        contact: true,
        owner: true,
        _count: {
          select: { tasks: true, activities: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })
  }),

  getById: authedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return prisma.deal.findUnique({
        where: { id: input.id },
        include: {
          stage: true,
          company: true,
          contact: true,
          owner: true,
          // Значения кастомных полей — в порядке, заданном админом.
          customFields: {
            orderBy: { field: { order: "asc" } },
            include: { field: true },
          },
          tasks: {
            include: { assignee: true },
            orderBy: { createdAt: "desc" },
          },
          activities: {
            include: { user: true, contact: true },
            orderBy: { createdAt: "desc" },
          },
          project: true,
        },
      })
    }),

  create: authedProcedure
    .input(
      z.object({
        title: titleSchema,
        description: optionalText(),
        value: moneySchema.optional(),
        currency: defaultCurrencySchema,
        companyId: z.string().optional(),
        contactId: z.string().optional(),
        stageId: z.string().optional(),
        tags: tagsSchema,
        fields: customFieldValuesSchema.optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { fields, ...data } = input
      let stageId = data.stageId
      if (!stageId) {
        // Put new deals on the first pipeline stage so they show up on the board.
        const firstStage = await prisma.pipelineStage.findFirst({ orderBy: { order: "asc" } })
        stageId = firstStage?.id
      }
      // Значения проверяются до записи; транзакция откатывает сделку целиком,
      // если хоть одно значение невалидно — «полусделка» невозможна.
      const rows = fields ? await resolveFieldValues(fields) : []
      return prisma.$transaction(async (tx) => {
        const deal = await tx.deal.create({
          data: { ...data, stageId },
          include: {
            stage: true,
            company: true,
            contact: true,
          },
        })
        if (rows.length > 0) {
          await tx.dealFieldValue.createMany({
            data: rows.map((row) => ({ ...row, dealId: deal.id })),
          })
        }
        return deal
      })
    }),

  update: authedProcedure
    .input(
      z.object({
        id: z.string(),
        title: titleSchema.optional(),
        description: optionalText(),
        value: moneySchema.optional(),
        currency: currencySchema.optional(),
        companyId: z.string().optional().nullable(),
        contactId: z.string().optional().nullable(),
        stageId: z.string().optional().nullable(),
        tags: optionalNullableTagsSchema,
        // Семантика «полной замены»: форма присылает ВСЕ заполненные поля,
        // отсутствующие в массиве значения снимаются. fields: [] — очистить.
        fields: customFieldValuesSchema.optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, fields, ...data } = input
      // fields: undefined — не трогаем значения (CSV-импорт и точечные правки
      // полей не присылают его); массив — заменить целиком.
      const rows = fields ? await resolveFieldValues(fields) : null
      return prisma.$transaction(async (tx) => {
        const deal = await tx.deal.update({ where: { id }, data })
        if (rows) {
          await tx.dealFieldValue.deleteMany({ where: { dealId: id } })
          if (rows.length > 0) {
            await tx.dealFieldValue.createMany({
              data: rows.map((row) => ({ ...row, dealId: id })),
            })
          }
        }
        return deal
      })
    }),

  updateStage: authedProcedure
    .input(z.object({ id: z.string(), stageId: z.string() }))
    .mutation(async ({ input }) => {
      const stage = await prisma.pipelineStage.findUnique({ where: { id: input.stageId } })
      const status = stage?.name === "Выиграна" ? "WON" : stage?.name === "Проиграна" ? "LOST" : "OPEN"
      return prisma.deal.update({
        where: { id: input.id },
        data: {
          stageId: input.stageId,
          status,
          closedAt: status === "OPEN" ? null : new Date(),
        },
      })
    }),

  updateStatus: authedProcedure
    .input(z.object({ id: z.string(), status: z.enum(["OPEN", "WON", "LOST"]) }))
    .mutation(async ({ input }) => {
      return prisma.deal.update({
        where: { id: input.id },
        data: {
          status: input.status,
          closedAt: input.status !== "OPEN" ? new Date() : null,
        },
      })
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.deal.delete({ where: { id: input.id } })
    }),
})
