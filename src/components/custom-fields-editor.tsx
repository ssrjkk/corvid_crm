"use client"

import { trpc } from "@/lib/trpc/client"
import type { RouterOutputs } from "@/server/routers/_app"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { fieldOptions } from "@/lib/custom-fields"

type FieldDef = RouterOutputs["customFields"]["getAll"][number]

/** Значения кастомных полей: fieldId → сырая строка ввода. */
export type CustomFieldValues = Record<string, string>

/**
 * V32 «Универсальность»: динамический блок кастомных полей в формах.
 * Контролируемый компонент — родитель владеет значениями (сброс при
 * открытии формы и после успешного создания). Пустая строка = поле не
 * заполнено; тип и варианты SELECT проверяет сервер (см. resolveFieldValues).
 */
export function CustomFieldsEditor({
  entityType,
  values,
  onChange,
}: {
  entityType: "DEAL"
  values: CustomFieldValues
  onChange: (values: CustomFieldValues) => void
}) {
  const { data: fields = [] } = trpc.customFields.getAll.useQuery({ entityType })
  if (fields.length === 0) return null

  const setValue = (fieldId: string, value: string) => onChange({ ...values, [fieldId]: value })

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field: FieldDef) => {
        const value = values[field.id] ?? ""
        const id = `custom-${field.id}`
        const label = (
          <Label htmlFor={id}>{field.label}</Label>
        )

        if (field.type === "SELECT") {
          const options = fieldOptions(field.options)
          // Сентинел «none» — как у этапов: пустая строка в Base UI Select
          // неотличима от «ничего не выбрано».
          return (
            <div key={field.id} className="grid gap-2">
              {label}
              <Select
                value={value === "" ? "none" : value}
                onValueChange={(next: string) => setValue(field.id, next === "none" ? "" : next)}
                items={{
                  none: "Не указано",
                  ...Object.fromEntries(options.map((option) => [option, option])),
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Не указано</SelectItem>
                  {options.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )
        }

        return (
          <div key={field.id} className="grid gap-2">
            {label}
            <Input
              id={id}
              type={field.type === "NUMBER" ? "number" : field.type === "DATE" ? "date" : "text"}
              step={field.type === "NUMBER" ? "any" : undefined}
              value={value}
              onChange={(event) => setValue(field.id, event.target.value)}
            />
          </div>
        )
      })}
    </div>
  )
}

/** Сырые значения формы → payload для tRPC (пустые строки пропускаются). */
export function collectCustomFields(values: CustomFieldValues) {
  return Object.entries(values)
    .filter(([, value]) => value.trim() !== "")
    .map(([fieldId, value]) => ({ fieldId, value }))
}
