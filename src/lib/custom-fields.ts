import { CustomFieldType } from "@/generated/prisma/client"
import { formatDate } from "@/lib/labels"

/**
 * V32 «Универсальность»: метки типов и отображение значений кастомных полей.
 * Форматирование — только здесь (дублировать в страницах запрещено).
 */

export const customFieldTypeLabels: Record<CustomFieldType, string> = {
  TEXT: "Текст",
  NUMBER: "Число",
  DATE: "Дата",
  SELECT: "Список",
}

/** Безопасное чтение вариантов SELECT из Json-колонки (могут быть не массивом). */
export function fieldOptions(options: unknown): string[] {
  if (!Array.isArray(options)) return []
  return options.filter((o): o is string => typeof o === "string")
}

/** Значение поля для карточки/деталки: число — ru-формат, дата — formatDate. */
export function formatCustomValue(type: CustomFieldType, raw: string) {
  switch (type) {
    case "NUMBER": {
      const parsed = Number(raw)
      if (!Number.isFinite(parsed)) return raw
      return parsed.toLocaleString("ru-RU", { maximumFractionDigits: 10 })
    }
    case "DATE":
      return formatDate(raw)
    case "TEXT":
    case "SELECT":
      return raw
  }
}
