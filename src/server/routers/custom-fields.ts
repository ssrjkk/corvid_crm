import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { router, authedProcedure, adminProcedure } from "../trpc"
import { prisma } from "@/lib/prisma"
import { requiredText } from "../validation"
import { LIMITS } from "../validation"
import { isUniqueViolation } from "../invoice-number"

/**
 * V32 «Универсальность»: управление кастомными полями (свойства сущностей).
 * Определяет админ — как этапы воронки. Определения читают все (формы должны
 * уметь показать поля), править — только админ.
 *
 * Тип поля ПОСЛЕ создания не меняется: смена TEXT→NUMBER молча ломала бы
 * уже сохранённые значения. Нужен другой тип — удалить поле и создать заново.
 */

const entityTypeSchema = z.enum(["DEAL", "COMPANY", "CONTACT"])
const fieldTypeSchema = z.enum(["TEXT", "NUMBER", "DATE", "SELECT"])

const optionsSchema = z
  .array(z.string().trim().min(1, "Пустой вариант недопустим").max(100, "Вариант — до 100 символов"))
  .min(1, "Для списка нужен хотя бы один вариант")
  .max(50, "Вариантов — не больше 50")

function friendlyCreateError(error: unknown): never {
  if (isUniqueViolation(error)) {
    throw new TRPCError({ code: "CONFLICT", message: "Поле с таким названием уже есть" })
  }
  throw error
}

export const customFieldsRouter = router({
  getAll: authedProcedure
    .input(z.object({ entityType: entityTypeSchema.optional() }))
    .query(async ({ input }) => {
      return prisma.customField.findMany({
        where: input.entityType ? { entityType: input.entityType } : undefined,
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      })
    }),

  create: adminProcedure
    .input(
      z.object({
        entityType: entityTypeSchema,
        label: requiredText("название поля", LIMITS.customFieldLabel),
        type: fieldTypeSchema,
        options: optionsSchema.optional(),
        order: z.number().int().min(0, "Порядок — неотрицательное число").max(1000).default(0),
      })
    )
    .mutation(async ({ input }) => {
      const options = input.type === "SELECT" ? input.options : undefined
      if (input.type === "SELECT" && !options) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Для списка нужен хотя бы один вариант" })
      }
      try {
        return await prisma.customField.create({
          data: {
            entityType: input.entityType,
            label: input.label,
            type: input.type,
            options,
            order: input.order,
          },
        })
      } catch (error) {
        friendlyCreateError(error)
      }
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        label: requiredText("название поля", LIMITS.customFieldLabel).optional(),
        options: optionsSchema.optional(),
        order: z.number().int().min(0, "Порядок — неотрицательное число").max(1000).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, label, options, order } = input
      const field = await prisma.customField.findUnique({ where: { id } })
      if (!field) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Поле не найдено — обновите страницу" })
      }

      try {
        return await prisma.$transaction(async (tx) => {
          const updated = await tx.customField.update({
            where: { id },
            data: {
              ...(label !== undefined && { label }),
              ...(options !== undefined && { options }),
              ...(order !== undefined && { order }),
            },
          })

          // Сузили список вариантов → значения вне списка теряют смысл:
          // удаляем их в той же транзакции (нет компромисса «мусор в БД»).
          if (field.type === "SELECT" && options !== undefined) {
            await tx.dealFieldValue.deleteMany({
              where: { fieldId: id, value: { notIn: options } },
            })
          }
          return updated
        })
      } catch (error) {
        friendlyCreateError(error)
      }
    }),

  /** Перестановка: передаётся полный порядок id полей (как у этапов). */
  reorder: adminProcedure
    .input(z.object({ ids: z.array(z.string()).min(1) }))
    .mutation(async ({ input }) => {
      await prisma.$transaction(
        input.ids.map((id, index) =>
          prisma.customField.update({ where: { id }, data: { order: index } })
        )
      )
      return prisma.customField.findMany({ orderBy: [{ order: "asc" }, { createdAt: "asc" }] })
    }),

  /** Удаление каскадом убирает и сохранённые значения (FK onDelete: Cascade). */
  delete: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    const field = await prisma.customField.findUnique({
      where: { id: input.id },
      select: { id: true },
    })
    if (!field) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Поле не найдено — обновите страницу" })
    }
    return prisma.customField.delete({ where: { id: input.id } })
  }),
})
