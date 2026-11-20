import { TRPCError } from "@trpc/server"
import { CustomEntityType, CustomFieldType } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { fieldOptions } from "@/lib/custom-fields"

/**
 * V32 «Универсальность»: нормализация значений кастомных полей.
 *
 * Форма присылает значение всегда СТРОКОЙ (удобство ввода: 64,5 / 2026-11-17).
 * Здесь тип и варианты SELECT проверяются на сервере — компромисса «просто
 * строка в БД» нет: неверное значение отклоняется с русским сообщением,
 * транзакция создания/правки сделки откатывается целиком.
 */

/** Верхняя граница числа в значении поля (не деньги, но та же санитария). */
const MAX_NUMBER = 1_000_000_000_000

export type CustomFieldDef = {
  type: CustomFieldType
  /** Варианты для SELECT (из Json-колонки). */
  options: string[] | null
}

/**
 * Нормализует значение по типу поля. Пустая/пробельная строка → "" (поле
 * не заполнено, вызывающий код пропускает/удаляет значение).
 *
 * V38: ожидаемые ошибки бросаются TRPCError(BAD_REQUEST), а не plain Error —
 * иначе errorFormatter прячет русский текст за «Внутренняя ошибка сервера»
 * и пользователь не понимает, что именно не так в форме.
 */
export function normalizeFieldValue(field: CustomFieldDef, raw: string): string {
  const value = raw.trim()
  if (value === "") return ""

  switch (field.type) {
    case "TEXT":
      return value

    case "NUMBER": {
      // Удобство ru-ввода: запятая и пробелы-разделители («64,5», «1 200»).
      const parsed = Number(value.replace(/\s+/g, "").replace(",", "."))
      if (!Number.isFinite(parsed)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Введите число (например, 64,5)" })
      }
      if (Math.abs(parsed) > MAX_NUMBER) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Слишком большое число" })
      }
      return String(parsed)
    }

    case "DATE": {
      if (Number.isNaN(new Date(value).getTime())) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Некорректная дата" })
      }
      // Храним как ввёл пользователь («2026-11-17») — без сдвига часовых поясов.
      return value
    }

    case "SELECT": {
      const options = field.options ?? []
      if (!options.includes(value)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Выберите вариант из списка" })
      }
      return value
    }
  }
}

/**
 * V33: значения полей для любой сущности (DEAL/COMPANY/CONTACT).
 * Неизвестный/чужой fieldId, неверный тип или вариант вне списка отклоняются
 * с русским сообщением — ДО записи в БД. Пустые значения пропускаются.
 */
export async function resolveFieldValues(
  entityType: CustomEntityType,
  rawFields: { fieldId: string; value: string }[]
) {
  const filled = rawFields.filter((f) => f.value.trim() !== "")
  if (filled.length === 0) return []
  const ids = Array.from(new Set(filled.map((f) => f.fieldId)))
  const defs = await prisma.customField.findMany({
    where: { id: { in: ids }, entityType },
  })
  if (defs.length !== ids.length) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Неизвестное поле — обновите страницу" })
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
