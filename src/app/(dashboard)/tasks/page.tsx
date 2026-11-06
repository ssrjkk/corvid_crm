"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { trpc } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { FilterSheet } from "@/components/filter-sheet"
import { Plus, Calendar, CheckCircle2, Clock, LayoutList, Download } from "lucide-react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { toast } from "sonner"
import { usePermissions } from "@/lib/use-permissions"
import { downloadCsv } from "@/lib/csv"

export default function TasksPage() {
  const { canWrite } = usePermissions()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [priorityFilter, setPriorityFilter] = useState("ALL")
  const [dueFrom, setDueFrom] = useState("")
  const [dueTo, setDueTo] = useState("")
  
  const utils = trpc.useUtils()
  const { data: tasks, isLoading } = trpc.tasks.getAll.useQuery()
  const createTask = trpc.tasks.create.useMutation({
    onSuccess: () => {
      utils.tasks.getAll.invalidate()
      setOpen(false)
      setTitle("")
      setDescription("")
      setDueDate("")
      toast.success("Задача создана")
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })
  const updateStatus = trpc.tasks.updateStatus.useMutation({
    onSuccess: () => {
      utils.tasks.getAll.invalidate()
      toast.success("Статус обновлен")
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createTask.mutate({
      title,
      description: description || undefined,
      dueDate: dueDate || undefined,
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DONE":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
      case "REVIEW":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      TODO: "К выполнению",
      IN_PROGRESS: "В работе",
      REVIEW: "На проверке",
      DONE: "Выполнено",
      CANCELLED: "Отменено",
    }
    return labels[status] || status
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "text-red-600"
      case "HIGH":
        return "text-orange-600"
      default:
        return "text-gray-600"
    }
  }

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      LOW: "Низкий",
      MEDIUM: "Средний",
      HIGH: "Высокий",
      URGENT: "Срочный",
    }
    return labels[priority] || priority
  }

  const filteredTasks = useMemo(() => {
    return tasks?.filter((task) => {
      if (statusFilter !== "ALL" && task.status !== statusFilter) return false
      if (priorityFilter !== "ALL" && task.priority !== priorityFilter) return false
      if (dueFrom || dueTo) {
        if (!task.dueDate) return false
        const due = new Date(task.dueDate)
        if (dueFrom && due < new Date(dueFrom)) return false
        if (dueTo) {
          const end = new Date(dueTo)
          end.setHours(23, 59, 59, 999)
          if (due > end) return false
        }
      }
      return true
    })
  }, [tasks, statusFilter, priorityFilter, dueFrom, dueTo])

  const activeFilterCount = [
    statusFilter !== "ALL",
    priorityFilter !== "ALL",
    Boolean(dueFrom),
    Boolean(dueTo),
  ].filter(Boolean).length

  const resetFilters = () => {
    setStatusFilter("ALL")
    setPriorityFilter("ALL")
    setDueFrom("")
    setDueTo("")
  }

  const exportCsv = () => {
    const rows = filteredTasks ?? []
    downloadCsv("tasks.csv", [
      ["Название", "Описание", "Статус", "Приоритет", "Срок", "Сделка", "Проект", "Создана"],
      ...rows.map((task) => [
        task.title,
        task.description ?? "",
        getStatusLabel(task.status),
        getPriorityLabel(task.priority),
        task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "",
        task.deal?.title ?? "",
        task.project?.name ?? "",
        new Date(task.createdAt).toISOString().slice(0, 10),
      ]),
    ])
    toast.success("CSV экспортирован")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Задачи</h1>
          <p className="text-muted-foreground">Управление задачами</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportCsv}>
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <FilterSheet activeCount={activeFilterCount} onReset={resetFilters}>
            <div className="grid gap-2">
              <Label>Статус</Label>
              <Select
                value={statusFilter}
                onValueChange={(next: string) => setStatusFilter(next)}
                items={{
                  ALL: "Все статусы",
                  TODO: "К выполнению",
                  IN_PROGRESS: "В работе",
                  REVIEW: "На проверке",
                  DONE: "Выполнено",
                  CANCELLED: "Отменено",
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Все статусы</SelectItem>
                  <SelectItem value="TODO">К выполнению</SelectItem>
                  <SelectItem value="IN_PROGRESS">В работе</SelectItem>
                  <SelectItem value="REVIEW">На проверке</SelectItem>
                  <SelectItem value="DONE">Выполнено</SelectItem>
                  <SelectItem value="CANCELLED">Отменено</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Приоритет</Label>
              <Select
                value={priorityFilter}
                onValueChange={(next: string) => setPriorityFilter(next)}
                items={{
                  ALL: "Все приоритеты",
                  LOW: "Низкий",
                  MEDIUM: "Средний",
                  HIGH: "Высокий",
                  URGENT: "Срочный",
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Все приоритеты</SelectItem>
                  <SelectItem value="LOW">Низкий</SelectItem>
                  <SelectItem value="MEDIUM">Средний</SelectItem>
                  <SelectItem value="HIGH">Высокий</SelectItem>
                  <SelectItem value="URGENT">Срочный</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="tasks-due-from">Срок с</Label>
                <Input
                  id="tasks-due-from"
                  type="date"
                  value={dueFrom}
                  onChange={(event) => setDueFrom(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tasks-due-to">Срок по</Label>
                <Input
                  id="tasks-due-to"
                  type="date"
                  value={dueTo}
                  onChange={(event) => setDueTo(event.target.value)}
                />
              </div>
            </div>
          </FilterSheet>
          <Button nativeButton={false} variant="outline" render={<Link href="/tasks/board" />}>
            <LayoutList className="mr-2 h-4 w-4" />
            Доска
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
          {canWrite && (
            <DialogTrigger render={<Button />}>
              <Plus className="mr-2 h-4 w-4" />
              Добавить задачу
            </DialogTrigger>
          )}
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Создать задачу</DialogTitle>
                <DialogDescription>Добавьте новую задачу</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Название *</Label>
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Описание</Label>
                  <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dueDate">Срок выполнения</Label>
                  <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
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
        </div>
      </div>

      {isLoading ? (
        <div>Загрузка...</div>
      ) : (
        <>
          {filteredTasks?.length === 0 && (
            <p className="text-sm text-muted-foreground">Нет задач по выбранным фильтрам</p>
          )}
          <div className="space-y-2">
            {filteredTasks?.map((task) => (
            <Card key={task.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {task.status === "DONE" ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    )}
                    {task.title}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>
                      {getPriorityLabel(task.priority)}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(task.status)}`}>
                      {getStatusLabel(task.status)}
                    </span>
                    {canWrite && task.status !== "DONE" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => updateStatus.mutate({ id: task.id, status: "DONE" })}
                        disabled={updateStatus.isPending}
                      >
                        Выполнить
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {task.description && (
                  <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {task.dueDate && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(task.dueDate), "dd MMM yyyy", { locale: ru })}
                    </div>
                  )}
                  {task.deal && <span>Сделка: {task.deal.title}</span>}
                  {task.project && <span>Проект: {task.project.name}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
          </div>
        </>
      )}
    </div>
  )
}
