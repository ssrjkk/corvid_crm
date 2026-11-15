"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Pencil, Plus, Save, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { trpc } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { customFieldTypeLabels, fieldOptions } from "@/lib/custom-fields"
import type { CustomFieldType } from "@/generated/prisma/client"
import { usePermissions } from "@/lib/use-permissions"

export default function SettingsPage() {
  // Правка этапов воронки — adminProcedure на сервере, гейт в UI должен совпадать.
  const { canDelete } = usePermissions()
  const utils = trpc.useUtils()
  const { data: stages = [], isLoading } = trpc.pipeline.getStages.useQuery()

  // <input type="color"> требует hex — это исключение из правила токенов, не UI-хардкод.
  const [newName, setNewName] = useState("")
  const [newColor, setNewColor] = useState("#7c5cff")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editColor, setEditColor] = useState("#94a3b8")

  const invalidate = () => {
    utils.pipeline.getStages.invalidate()
    utils.deals.getAll.invalidate()
  }

  const createStage = trpc.pipeline.createStage.useMutation({
    onSuccess: () => {
      invalidate()
      setNewName("")
      toast.success("Этап добавлен")
    },
    onError: (error) => toast.error(error.message),
  })
  const updateStage = trpc.pipeline.updateStage.useMutation({
    onSuccess: () => {
      invalidate()
      setEditingId(null)
      toast.success("Этап обновлён")
    },
    onError: (error) => toast.error(error.message),
  })
  const reorder = trpc.pipeline.reorderStages.useMutation({
    onSuccess: () => invalidate(),
    onError: (error) => toast.error(error.message),
  })
  const removeStage = trpc.pipeline.deleteStage.useMutation({
    onSuccess: () => {
      invalidate()
      toast.success("Этап удалён")
    },
    onError: (error) => toast.error(error.message),
  })

  const move = (index: number, direction: -1 | 1) => {
    const next = index + direction
    if (next < 0 || next >= stages.length) return
    const ids = stages.map((s) => s.id)
    ;[ids[index], ids[next]] = [ids[next], ids[index]]
    reorder.mutate({ ids })
  }

  const startEdit = (stage: { id: string; name: string; color?: string | null }) => {
    setEditingId(stage.id)
    setEditName(stage.name)
    setEditColor(stage.color ?? "#94a3b8")
  }

  // ===== Кастомные поля сделок (V32 «Универсальность») =====
  const { data: fields = [], isLoading: fieldsLoading } = trpc.customFields.getAll.useQuery({
    entityType: "DEAL",
  })

  const [newFieldName, setNewFieldName] = useState("")
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>("TEXT")
  const [newFieldOptions, setNewFieldOptions] = useState("")
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null)
  const [editFieldLabel, setEditFieldLabel] = useState("")
  const [editFieldOptions, setEditFieldOptions] = useState("")

  const invalidateFields = () => {
    utils.customFields.getAll.invalidate()
    utils.deals.getById.invalidate()
  }

  const parseOptions = (raw: string) =>
    raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)

  const createField = trpc.customFields.create.useMutation({
    onSuccess: () => {
      invalidateFields()
      setNewFieldName("")
      setNewFieldOptions("")
      toast.success("Поле добавлено")
    },
    onError: (error) => toast.error(error.message),
  })
  const updateField = trpc.customFields.update.useMutation({
    onSuccess: () => {
      invalidateFields()
      setEditingFieldId(null)
      toast.success("Поле обновлено")
    },
    onError: (error) => toast.error(error.message),
  })
  const reorderFields = trpc.customFields.reorder.useMutation({
    onSuccess: () => invalidateFields(),
    onError: (error) => toast.error(error.message),
  })
  const removeField = trpc.customFields.delete.useMutation({
    onSuccess: () => {
      invalidateFields()
      toast.success("Поле удалено (значения удалены вместе с ним)")
    },
    onError: (error) => toast.error(error.message),
  })

  const moveField = (index: number, direction: -1 | 1) => {
    const next = index + direction
    if (next < 0 || next >= fields.length) return
    const ids = fields.map((f) => f.id)
    ;[ids[index], ids[next]] = [ids[next], ids[index]]
    reorderFields.mutate({ ids })
  }

  const startFieldEdit = (field: { id: string; label: string; type: string; options: unknown }) => {
    setEditingFieldId(field.id)
    setEditFieldLabel(field.label)
    setEditFieldOptions(
      field.type === "SELECT" ? fieldOptions(field.options).join("\n") : ""
    )
  }

  const submitCreateField = (event: React.FormEvent) => {
    event.preventDefault()
    if (!newFieldName.trim()) return
    createField.mutate({
      entityType: "DEAL",
      label: newFieldName.trim(),
      type: newFieldType,
      options: newFieldType === "SELECT" ? parseOptions(newFieldOptions) : undefined,
      order: fields.length,
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Настройки</h1>
        <p className="text-muted-foreground">Этапы воронки продаж и поля сделок</p>
      </div>

      {canDelete && (
        <Card>
          <CardHeader>
            <CardTitle>Новый этап</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-wrap items-end gap-3"
              onSubmit={(event) => {
                event.preventDefault()
                if (!newName.trim()) return
                createStage.mutate({
                  name: newName.trim(),
                  color: newColor,
                  order: stages.length,
                })
              }}
            >
              <div className="grid flex-1 gap-2">
                <Label htmlFor="stage-name">Название</Label>
                <Input
                  id="stage-name"
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder="Например: Оплата"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="stage-color">Цвет</Label>
                <input
                  id="stage-color"
                  type="color"
                  value={newColor}
                  onChange={(event) => setNewColor(event.target.value)}
                  className="h-9 w-16 cursor-pointer rounded-md border bg-transparent"
                />
              </div>
              <Button type="submit" disabled={createStage.isPending}>
                <Plus className="mr-2 h-4 w-4" />
                Добавить
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Этапы воронки ({stages.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Загрузка…</p>
          ) : (
            stages.map((stage, index) => (
              <div
                key={stage.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="h-4 w-4 shrink-0 rounded-full bg-muted-foreground"
                    style={(() => {
                      const c = editingId === stage.id ? editColor : stage.color
                      return c ? { backgroundColor: c } : undefined
                    })()}
                  />
                  {editingId === stage.id ? (
                    <div className="flex flex-1 flex-wrap items-center gap-2">
                      <Input
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                        className="w-48"
                      />
                      <input
                        type="color"
                        value={editColor}
                        onChange={(event) => setEditColor(event.target.value)}
                        className="h-9 w-12 cursor-pointer rounded-md border bg-transparent"
                      />
                      <Button
                        size="sm"
                        disabled={updateStage.isPending}
                        onClick={() => updateStage.mutate({ id: stage.id, name: editName.trim(), color: editColor })}
                      >
                        <Save className="mr-1 h-4 w-4" />
                        Сохранить
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        <X className="mr-1 h-4 w-4" />
                        Отмена
                      </Button>
                    </div>
                  ) : (
                    <div className="min-w-0">
                      <div className="font-medium">{stage.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Сделок на этапе: {stage.deals.length}
                      </div>
                    </div>
                  )}
                </div>

                {canDelete && editingId !== stage.id && (
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" aria-label="Выше" disabled={index === 0 || reorder.isPending} onClick={() => move(index, -1)}>
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" aria-label="Ниже" disabled={index === stages.length - 1 || reorder.isPending} onClick={() => move(index, 1)}>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" aria-label="Изменить" onClick={() => startEdit(stage)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Удалить ${stage.name}`}
                      disabled={stage.deals.length > 0 || removeStage.isPending}
                      onClick={() => removeStage.mutate({ id: stage.id })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
          <p className="pt-2 text-xs text-muted-foreground">
            Этап нельзя удалить, пока на нём есть сделки. Порядок определяет колонки на воронке.
          </p>
        </CardContent>
      </Card>

      {canDelete && (
        <Card>
          <CardHeader>
            <CardTitle>Новое поле сделки</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3" onSubmit={submitCreateField}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="field-name">Название</Label>
                  <Input
                    id="field-name"
                    value={newFieldName}
                    onChange={(event) => setNewFieldName(event.target.value)}
                    placeholder="Например: Площадь, м²"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Тип</Label>
                  <Select
                    value={newFieldType}
                    onValueChange={(next: string) => setNewFieldType(next as CustomFieldType)}
                    items={{ TEXT: "Текст", NUMBER: "Число", DATE: "Дата", SELECT: "Список" }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TEXT">Текст</SelectItem>
                      <SelectItem value="NUMBER">Число</SelectItem>
                      <SelectItem value="DATE">Дата</SelectItem>
                      <SelectItem value="SELECT">Список</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {newFieldType === "SELECT" && (
                <div className="grid gap-2">
                  <Label htmlFor="field-options">Варианты (каждый с новой строки)</Label>
                  <Textarea
                    id="field-options"
                    value={newFieldOptions}
                    onChange={(event) => setNewFieldOptions(event.target.value)}
                    placeholder={"Квартира\nДом"}
                    rows={3}
                  />
                </div>
              )}
              <div>
                <Button type="submit" disabled={createField.isPending}>
                  <Plus className="mr-2 h-4 w-4" />
                  Добавить поле
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Поля сделки ({fields.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {fieldsLoading ? (
            <p className="text-sm text-muted-foreground">Загрузка…</p>
          ) : fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Полей пока нет — сделка собирается из базовых свойств
            </p>
          ) : (
            fields.map((field, index) => (
              <div
                key={field.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
              >
                {editingFieldId === field.id ? (
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <Input
                      value={editFieldLabel}
                      onChange={(event) => setEditFieldLabel(event.target.value)}
                      className="max-w-64"
                    />
                    {field.type === "SELECT" && (
                      <Textarea
                        value={editFieldOptions}
                        onChange={(event) => setEditFieldOptions(event.target.value)}
                        placeholder={"Квартира\nДом"}
                        rows={3}
                      />
                    )}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        disabled={updateField.isPending}
                        onClick={() =>
                          updateField.mutate({
                            id: field.id,
                            label: editFieldLabel.trim(),
                            ...(field.type === "SELECT" && {
                              options: parseOptions(editFieldOptions),
                            }),
                          })
                        }
                      >
                        <Save className="mr-1 h-4 w-4" />
                        Сохранить
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingFieldId(null)}>
                        <X className="mr-1 h-4 w-4" />
                        Отмена
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{field.label}</span>
                      <Badge variant="secondary">{customFieldTypeLabels[field.type]}</Badge>
                    </div>
                    {field.type === "SELECT" && (
                      <div className="text-xs text-muted-foreground">
                        Варианты: {fieldOptions(field.options).join(", ") || "—"}
                      </div>
                    )}
                  </div>
                )}

                {editingFieldId !== field.id && (
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Выше"
                      disabled={index === 0 || reorderFields.isPending}
                      onClick={() => moveField(index, -1)}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Ниже"
                      disabled={index === fields.length - 1 || reorderFields.isPending}
                      onClick={() => moveField(index, 1)}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Изменить ${field.label}`}
                      onClick={() => startFieldEdit(field)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Удалить ${field.label}`}
                      disabled={removeField.isPending}
                      onClick={() => removeField.mutate({ id: field.id })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
          <p className="pt-2 text-xs text-muted-foreground">
            Поля появляются в форме и карточке сделки. Тип после создания не меняется (нужен
            другой — удалите поле и создайте заново); значения хранятся до удаления поля или
            сделки. Порядок задаёт следование в формах.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
