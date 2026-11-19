import { z } from "zod"
import { router, adminProcedure } from "../trpc"
import { prisma } from "@/lib/prisma"
import { findBusinessPreset } from "@/lib/business-presets"

/**
 * V36 «Пресеты бизнеса»: применяет отраслевой шаблон поверх текущей настройки.
 *
 * Законы:
 * - аддитивно: существующие этапы (по имени) и поля (по entityType+label)
 *   пропускаются — ничего не переименовывается, не меняется и не удаляется;
 * - идемпотентно: повторное применение того же шаблона создаёт 0 записей;
 * - порядок: новые этапы/поля продолжают максимальный order (без дыр);
 * - ноль фейка: создаются ТОЛЬКО определения этапов и полей, ни одной
 *   выдуманной сделки/компании/контакта;
 * - всё в одной транзакции: частично применённого шаблона не бывает.
 */
export const presetsRouter = router({
  applyPreset: adminProcedure
    .input(
      z.object({
        presetId: z
          .string()
          .refine((id) => findBusinessPreset(id) !== undefined, "Шаблон не найден"),
      })
    )
    .mutation(async ({ input }) => {
      const preset = findBusinessPreset(input.presetId)
      if (!preset) throw new Error("Шаблон не найден") // недостижимо: проверено схемой

      return prisma.$transaction(async (tx) => {
        const [existingStages, existingFields] = await Promise.all([
          tx.pipelineStage.findMany({ select: { name: true, order: true } }),
          tx.customField.findMany({
            select: { entityType: true, label: true, order: true },
          }),
        ])

        // Этапы: пропускаем по имени, новые ставим после максимального order.
        const stageNames = new Set(existingStages.map((stage) => stage.name))
        let nextStageOrder = existingStages.reduce(
          (next, stage) => Math.max(next, stage.order + 1),
          0
        )
        let stagesCreated = 0
        let stagesSkipped = 0

        for (const stage of preset.stages) {
          if (stageNames.has(stage.name)) {
            stagesSkipped += 1
            continue
          }
          await tx.pipelineStage.create({
            data: { name: stage.name, color: stage.color, order: nextStageOrder },
          })
          stageNames.add(stage.name)
          nextStageOrder += 1
          stagesCreated += 1
        }

        // Поля: уникальность в БД — [entityType, label]; порядок свой у каждой
        // сущности (в форме сделки и в форме компании нумерация независима).
        const fieldKeys = new Set(
          existingFields.map((field) => `${field.entityType}\u0000${field.label}`)
        )
        const nextFieldOrder = new Map<string, number>()
        for (const field of existingFields) {
          nextFieldOrder.set(
            field.entityType,
            Math.max(nextFieldOrder.get(field.entityType) ?? 0, field.order + 1)
          )
        }

        let fieldsCreated = 0
        let fieldsSkipped = 0

        for (const field of preset.fields) {
          const key = `${field.entityType}\u0000${field.label}`
          if (fieldKeys.has(key)) {
            fieldsSkipped += 1
            continue
          }
          await tx.customField.create({
            data: {
              entityType: field.entityType,
              label: field.label,
              type: field.type,
              // SELECT без вариантов бесполезен; целостность определений
              // закреплена unit-тестом business-presets.test.ts.
              options: field.type === "SELECT" ? [...(field.options ?? [])] : undefined,
              order: nextFieldOrder.get(field.entityType) ?? 0,
            },
          })
          nextFieldOrder.set(
            field.entityType,
            (nextFieldOrder.get(field.entityType) ?? 0) + 1
          )
          fieldKeys.add(key)
          fieldsCreated += 1
        }

        return { stagesCreated, stagesSkipped, fieldsCreated, fieldsSkipped }
      })
    }),
})
