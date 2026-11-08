"use client"

import { useState } from "react"
import Link from "next/link"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { SortableContext, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { toast } from "sonner"
import { trpc } from "@/lib/trpc/client"
import type { RouterOutputs } from "@/server/routers/_app"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate, priorityLabels, taskStatusLabels } from "@/lib/labels"
import { usePermissions } from "@/lib/use-permissions"

type Task = RouterOutputs["tasks"]["getAll"][number]
type TaskStatus = Task["status"]

const columns: { id: TaskStatus; title: string; accent: string }[] = [
  { id: "TODO", title: "К выполнению", accent: "bg-muted-foreground" },
  { id: "IN_PROGRESS", title: "В работе", accent: "bg-primary" },
  { id: "REVIEW", title: "На проверке", accent: "bg-chart-4" },
  { id: "DONE", title: "Выполнено", accent: "bg-emerald-500" },
  { id: "CANCELLED", title: "Отменено", accent: "bg-destructive" },
]

function priorityVariant(priority: string): "default" | "secondary" | "destructive" | "outline" {
  if (priority === "URGENT") return "destructive"
  if (priority === "HIGH") return "default"
  if (priority === "LOW") return "outline"
  return "secondary"
}

function TaskCardBody({ task }: { task: Task }) {
  return (
    <Card className="cursor-grab active:cursor-grabbing">
      <CardContent className="space-y-2 p-3">
        <div className="text-sm font-medium">{task.title}</div>
        {task.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">{task.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={priorityVariant(task.priority)}>
            {priorityLabels[task.priority] ?? task.priority}
          </Badge>
          {task.dueDate && (
            <span className="text-xs text-muted-foreground">до {formatDate(task.dueDate)}</span>
          )}
        </div>
        {(task.deal || task.project) && (
          <div className="space-y-0.5 border-t pt-2 text-xs text-muted-foreground">
            {task.deal && (
              <Link
                href={`/deals/${task.deal.id}`}
                className="block truncate hover:underline"
                onPointerDown={(event) => event.stopPropagation()}
              >
                Сделка: {task.deal.title}
              </Link>
            )}
            {task.project && (
              <Link
                href={`/projects/${task.project.id}`}
                className="block truncate hover:underline"
                onPointerDown={(event) => event.stopPropagation()}
              >
                Проект: {task.project.name}
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SortableTaskCard({ task, disabled }: { task: Task; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCardBody task={task} />
    </div>
  )
}

function TaskColumn({
  column,
  tasks,
  disabled,
}: {
  column: (typeof columns)[number]
  tasks: Task[]
  disabled: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id, disabled })
  return (
    <div className="w-72 flex-shrink-0">
      <Card className={isOver ? "ring-2 ring-primary" : undefined}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <span className={`h-2.5 w-2.5 rounded-full ${column.accent}`} />
            {column.title}
            <span className="ml-auto text-muted-foreground">{tasks.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div ref={setNodeRef} className="min-h-[200px] space-y-2">
            <SortableContext items={tasks.map((task) => task.id)}>
              {tasks.map((task) => (
                <SortableTaskCard key={task.id} task={task} disabled={disabled} />
              ))}
            </SortableContext>
            {tasks.length === 0 && (
              <p className="pt-6 text-center text-xs text-muted-foreground">Перетащите задачу сюда</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function TasksBoardPage() {
  const { canWrite } = usePermissions()
  const utils = trpc.useUtils()
  const { data: tasks, isLoading } = trpc.tasks.getAll.useQuery()

  const updateStatus = trpc.tasks.updateStatus.useMutation({
    onMutate: async ({ id, status }) => {
      await utils.tasks.getAll.cancel()
      const previous = utils.tasks.getAll.getData()
      utils.tasks.getAll.setData(undefined, (old) =>
        old?.map((task) => (task.id === id ? { ...task, status } : task))
      )
      return { previous }
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        utils.tasks.getAll.setData(undefined, context.previous)
      }
      toast.error(error.message)
    },
    onSuccess: () => toast.success("Статус задачи обновлён"),
    onSettled: () => {
      utils.tasks.getAll.invalidate()
      utils.analytics.getTaskWidgets.invalidate()
    },
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )
  const [activeId, setActiveId] = useState<string | null>(null)

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    if (!canWrite) return
    const { active, over } = event
    if (!over || !tasks) return

    const taskId = String(active.id)
    const overId = String(over.id)
    const targetStatus =
      columns.find((column) => column.id === overId)?.id ??
      tasks.find((task) => task.id === overId)?.status
    const task = tasks.find((item) => item.id === taskId)

    if (!targetStatus || !task || task.status === targetStatus) return
    updateStatus.mutate({ id: taskId, status: targetStatus })
  }

  if (isLoading) {
    return <div className="py-10 text-center text-sm text-muted-foreground">Загрузка задач...</div>
  }

  const activeTask = tasks?.find((task) => task.id === activeId)
  const openTasks = tasks?.filter((task) => task.status !== "DONE" && task.status !== "CANCELLED") ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Доска задач</h1>
          <p className="text-muted-foreground">
            Kanban по статусам · открытых задач: {openTasks.length}
          </p>
        </div>
        <Button nativeButton={false} variant="outline" render={<Link href="/tasks" />}>
          Списком
        </Button>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((column) => (
            <TaskColumn
              key={column.id}
              column={column}
              tasks={tasks?.filter((task) => task.status === column.id) ?? []}
              disabled={!canWrite}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask ? (
            <div className="w-72">
              <TaskCardBody task={activeTask} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <p className="text-xs text-muted-foreground">
        {taskStatusLabels.TODO} → {taskStatusLabels.DONE}: перетаскивание обновляет статус задачи и
        сохраняет его в базе.
      </p>
    </div>
  )
}
