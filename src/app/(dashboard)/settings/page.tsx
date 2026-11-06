"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Pencil, Plus, Save, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { trpc } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { usePermissions } from "@/lib/use-permissions"

export default function SettingsPage() {
  const { canWrite } = usePermissions()
  const utils = trpc.useUtils()
  const { data: stages = [], isLoading } = trpc.pipeline.getStages.useQuery()

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Настройки</h1>
        <p className="text-muted-foreground">Этапы воронки продаж</p>
      </div>

      {canWrite && (
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
                    className="h-4 w-4 shrink-0 rounded-full"
                    style={{ backgroundColor: editingId === stage.id ? editColor : (stage.color ?? "#94a3b8") }}
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

                {canWrite && editingId !== stage.id && (
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
    </div>
  )
}
