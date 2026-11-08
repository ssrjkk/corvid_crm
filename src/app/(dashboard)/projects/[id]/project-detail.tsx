"use client"

import { useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import {
  ArrowLeft,
  CalendarDays,
  CheckSquare,
  Handshake,
  Pencil,
  Plus,
} from "lucide-react"
import { toast } from "sonner"
import { trpc } from "@/lib/trpc/client"
import type { RouterOutputs } from "@/server/routers/_app"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  formatDate,
  formatMoney,
  priorityLabels,
  projectStatusLabels,
  taskStatusLabels,
} from "@/lib/labels"
import { usePermissions } from "@/lib/use-permissions"

type Project = NonNullable<RouterOutputs["projects"]["getById"]>

// Бейдж статуса — единый <StatusBadge kind="project"> (семантика в @/lib/labels.ts).

function toDateInput(value?: Date | string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toISOString().slice(0, 10)
}

export default function ProjectDetail({ projectId }: { projectId: string }) {
  const { canWrite } = usePermissions()
  const utils = trpc.useUtils()
  const { data: project, isLoading } = trpc.projects.getById.useQuery({ id: projectId })

  const [taskOpen, setTaskOpen] = useState(false)
  const [taskTitle, setTaskTitle] = useState("")
  const [taskDescription, setTaskDescription] = useState("")
  const [taskDueDate, setTaskDueDate] = useState("")
  const [taskPriority, setTaskPriority] = useState("MEDIUM")
  const [editOpen, setEditOpen] = useState(false)

  const refresh = () => {
    utils.projects.getById.invalidate({ id: projectId })
    utils.projects.getAll.invalidate()
    utils.tasks.getAll.invalidate()
  }

  const createTask = trpc.tasks.create.useMutation({
    onSuccess: () => {
      refresh()
      setTaskOpen(false)
      setTaskTitle("")
      setTaskDescription("")
      setTaskDueDate("")
      setTaskPriority("MEDIUM")
      toast.success("Задача создана")
    },
    onError: (error) => toast.error(error.message),
  })

  const completeTask = trpc.tasks.updateStatus.useMutation({
    onSuccess: () => {
      refresh()
      toast.success("Задача выполнена")
    },
    onError: (error) => toast.error(error.message),
  })

  if (isLoading) {
    return <div className="py-10 text-center text-sm text-muted-foreground">Загрузка проекта...</div>
  }

  if (!project) {
    return (
      <div className="space-y-4 py-10 text-center">
        <p className="text-muted-foreground">Проект не найден</p>
        <Button nativeButton={false} render={<Link href="/projects" />}>Вернуться к проектам</Button>
      </div>
    )
  }

  const activeTasks = project.tasks.filter((task) => task.status !== "DONE" && task.status !== "CANCELLED")
  const completedTasks = project.tasks.length - activeTasks.length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button nativeButton={false} variant="ghost" size="icon" render={<Link href="/projects" aria-label="Назад" />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-muted-foreground">Карточка проекта</p>
            <StatusBadge kind="project" status={project.status} />
          </div>
        </div>
        <Sheet open={editOpen} onOpenChange={setEditOpen}>
          {canWrite && (
            <SheetTrigger render={<Button variant="outline" />}>
              <Pencil className="mr-2 h-4 w-4" />
              Редактировать
            </SheetTrigger>
          )}
          <SheetContent>
            {editOpen && <ProjectEditForm project={project} onDone={() => setEditOpen(false)} />}
          </SheetContent>
        </Sheet>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Основная информация</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {project.description ? (
                <p className="whitespace-pre-wrap text-muted-foreground">{project.description}</p>
              ) : (
                <p className="text-muted-foreground">Описание не заполнено</p>
              )}
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  Старт: {formatDate(project.startDate)}
                </div>
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  Дедлайн: {formatDate(project.deadline)}
                </div>
              </div>
              <div className="text-muted-foreground">Создан: {formatDate(project.createdAt)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5" />
                Задачи ({activeTasks.length} активных / {completedTasks} завершено)
              </CardTitle>
              <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
                {canWrite && (
                  <DialogTrigger render={<Button size="sm" />}>
                    <Plus className="mr-2 h-4 w-4" />
                    Добавить задачу
                  </DialogTrigger>
                )}
                <DialogContent>
                  <form
                    onSubmit={(event) => {
                      event.preventDefault()
                      createTask.mutate({
                        title: taskTitle,
                        description: taskDescription || undefined,
                        dueDate: taskDueDate || undefined,
                        priority: taskPriority as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
                        projectId,
                      })
                    }}
                  >
                    <DialogHeader>
                      <DialogTitle>Новая задача</DialogTitle>
                      <DialogDescription>Задача будет привязана к проекту «{project.name}»</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="project-task-title">Название *</Label>
                        <Input
                          id="project-task-title"
                          value={taskTitle}
                          onChange={(event) => setTaskTitle(event.target.value)}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="project-task-description">Описание</Label>
                        <Textarea
                          id="project-task-description"
                          value={taskDescription}
                          onChange={(event) => setTaskDescription(event.target.value)}
                        />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                          <Label htmlFor="project-task-due">Срок</Label>
                          <Input
                            id="project-task-due"
                            type="date"
                            value={taskDueDate}
                            onChange={(event) => setTaskDueDate(event.target.value)}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Приоритет</Label>
                          <Select
                            value={taskPriority}
                            onValueChange={(value: string) => setTaskPriority(value)}
                            items={priorityLabels}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(priorityLabels).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={createTask.isPending}>
                        {createTask.isPending ? "Создание..." : "Создать"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {project.tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">В проекте пока нет задач</p>
              ) : (
                <div className="space-y-2">
                  {project.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                    >
                      <div>
                        <div className="font-medium">{task.title}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{taskStatusLabels[task.status] ?? task.status}</span>
                          <span>·</span>
                          <span>{priorityLabels[task.priority] ?? task.priority}</span>
                          {task.dueDate && (
                            <>
                              <span>·</span>
                              <span>до {formatDate(task.dueDate)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {canWrite && task.status !== "DONE" && task.status !== "CANCELLED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={completeTask.isPending}
                          onClick={() => completeTask.mutate({ id: task.id, status: "DONE" })}
                        >
                          Выполнить
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Handshake className="h-5 w-5" />
                Сделка
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Link href={`/deals/${project.deal.id}`} className="font-medium text-primary hover:underline">
                {project.deal.title}
              </Link>
              <div>Сумма: {formatMoney(project.deal.value, project.deal.currency)}</div>
              {project.deal.company && (
                <div>
                  Компания:{" "}
                  <Link
                    href={`/companies/${project.deal.company.id}`}
                    className="text-primary hover:underline"
                  >
                    {project.deal.company.name}
                  </Link>
                </div>
              )}
              {project.deal.contact && (
                <div>
                  Контакт:{" "}
                  <Link
                    href={`/contacts/${project.deal.contact.id}`}
                    className="text-primary hover:underline"
                  >
                    {project.deal.contact.firstName} {project.deal.contact.lastName}
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Сроки</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                Старт: {formatDate(project.startDate)}
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                Дедлайн: {formatDate(project.deadline)}
              </div>
              {project.deadline && (
                <div className="text-xs text-muted-foreground">
                  {format(new Date(project.deadline), "dd MMMM yyyy", { locale: ru })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function ProjectEditForm({ project, onDone }: { project: Project; onDone: () => void }) {
  const utils = trpc.useUtils()
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description ?? "")
  const [status, setStatus] = useState(project.status)
  const [startDate, setStartDate] = useState(toDateInput(project.startDate))
  const [deadline, setDeadline] = useState(toDateInput(project.deadline))

  const update = trpc.projects.update.useMutation({
    onSuccess: () => {
      utils.projects.getById.invalidate({ id: project.id })
      utils.projects.getAll.invalidate()
      toast.success("Проект обновлён")
      onDone()
    },
    onError: (error) => toast.error(error.message),
  })

  return (
    <form
      className="flex h-full flex-col"
      onSubmit={(event) => {
        event.preventDefault()
        update.mutate({
          id: project.id,
          name,
          description,
          status: status as Project["status"],
          startDate: startDate || null,
          deadline: deadline || null,
        })
      }}
    >
      <SheetHeader>
        <SheetTitle>Редактирование проекта</SheetTitle>
        <SheetDescription>Обновите параметры и сроки проекта</SheetDescription>
      </SheetHeader>
      <div className="flex-1 space-y-4 overflow-y-auto px-4">
        <div className="grid gap-2">
          <Label htmlFor="project-name">Название *</Label>
          <Input id="project-name" value={name} onChange={(event) => setName(event.target.value)} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="project-description">Описание</Label>
          <Textarea
            id="project-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
          />
        </div>
        <div className="grid gap-2">
          <Label>Статус</Label>
          <Select
            value={status}
            onValueChange={(value: string) => setStatus(value as Project["status"])}
            items={projectStatusLabels}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(projectStatusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="project-start">Старт</Label>
            <Input
              id="project-start"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="project-deadline">Дедлайн</Label>
            <Input
              id="project-deadline"
              type="date"
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
            />
          </div>
        </div>
      </div>
      <SheetFooter>
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? "Сохранение..." : "Сохранить"}
        </Button>
      </SheetFooter>
    </form>
  )
}
