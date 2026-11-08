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
import { StatusBadge } from "@/components/status-badge"
import { Plus, Calendar, FolderKanban, Download } from "lucide-react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { toast } from "sonner"
import { usePermissions } from "@/lib/use-permissions"
import { downloadCsv } from "@/lib/csv"
import { projectStatusLabels } from "@/lib/labels"

export default function ProjectsPage() {
  const { canWrite } = usePermissions()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [dealId, setDealId] = useState("")
  const [deadline, setDeadline] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [deadlineFrom, setDeadlineFrom] = useState("")
  const [deadlineTo, setDeadlineTo] = useState("")
  
  const utils = trpc.useUtils()
  const { data: projects, isLoading } = trpc.projects.getAll.useQuery()
  const { data: deals } = trpc.deals.getAll.useQuery()
  const createProject = trpc.projects.create.useMutation({
    onSuccess: () => {
      utils.projects.getAll.invalidate()
      setOpen(false)
      setName("")
      setDescription("")
      setDealId("")
      setDeadline("")
      toast.success("Проект создан")
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createProject.mutate({
      name,
      description: description || undefined,
      dealId,
      deadline: deadline || undefined,
    })
  }

  // Лейблы статуса — только projectStatusLabels из @/lib/labels.ts. Локальных копий нет.

  const filteredProjects = useMemo(() => {
    return projects?.filter((project) => {
      if (statusFilter !== "ALL" && project.status !== statusFilter) return false
      if (deadlineFrom || deadlineTo) {
        if (!project.deadline) return false
        const projectDeadline = new Date(project.deadline)
        if (deadlineFrom && projectDeadline < new Date(deadlineFrom)) return false
        if (deadlineTo) {
          const end = new Date(deadlineTo)
          end.setHours(23, 59, 59, 999)
          if (projectDeadline > end) return false
        }
      }
      return true
    })
  }, [projects, statusFilter, deadlineFrom, deadlineTo])

  const activeFilterCount = [
    statusFilter !== "ALL",
    Boolean(deadlineFrom),
    Boolean(deadlineTo),
  ].filter(Boolean).length

  const resetFilters = () => {
    setStatusFilter("ALL")
    setDeadlineFrom("")
    setDeadlineTo("")
  }

  const exportCsv = () => {
    const rows = filteredProjects ?? []
    downloadCsv("projects.csv", [
      ["Название", "Статус", "Сделка", "Старт", "Дедлайн", "Задач", "Создан"],
      ...rows.map((project) => [
        project.name,
        projectStatusLabels[project.status] ?? project.status,
        project.deal?.title ?? "",
        project.startDate ? new Date(project.startDate).toISOString().slice(0, 10) : "",
        project.deadline ? new Date(project.deadline).toISOString().slice(0, 10) : "",
        project._count?.tasks ?? 0,
        new Date(project.createdAt).toISOString().slice(0, 10),
      ]),
    ])
    toast.success("CSV экспортирован")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Проекты</h1>
          <p className="text-muted-foreground">Управление проектами</p>
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
                  PLANNING: "Планирование",
                  IN_PROGRESS: "В работе",
                  REVIEW: "На проверке",
                  COMPLETED: "Завершён",
                  ON_HOLD: "Приостановлен",
                  CANCELLED: "Отменён",
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Все статусы</SelectItem>
                  <SelectItem value="PLANNING">Планирование</SelectItem>
                  <SelectItem value="IN_PROGRESS">В работе</SelectItem>
                  <SelectItem value="REVIEW">На проверке</SelectItem>
                  <SelectItem value="COMPLETED">Завершён</SelectItem>
                  <SelectItem value="ON_HOLD">Приостановлен</SelectItem>
                  <SelectItem value="CANCELLED">Отменён</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="projects-deadline-from">Дедлайн с</Label>
                <Input
                  id="projects-deadline-from"
                  type="date"
                  value={deadlineFrom}
                  onChange={(event) => setDeadlineFrom(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="projects-deadline-to">Дедлайн по</Label>
                <Input
                  id="projects-deadline-to"
                  type="date"
                  value={deadlineTo}
                  onChange={(event) => setDeadlineTo(event.target.value)}
                />
              </div>
            </div>
          </FilterSheet>
          <Dialog open={open} onOpenChange={setOpen}>
          {canWrite && (
            <DialogTrigger render={<Button />}>
              <Plus className="mr-2 h-4 w-4" />
              Новый проект
            </DialogTrigger>
          )}
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Создать проект</DialogTitle>
                <DialogDescription>Проект создается на основе сделки</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Название *</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="deal">Сделка *</Label>
                  <Select
                    value={dealId}
                    onValueChange={(v: string) => setDealId(v)}
                    required
                    items={Object.fromEntries((deals ?? []).map((deal) => [deal.id, deal.title]))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите сделку" />
                    </SelectTrigger>
                    <SelectContent>
                      {deals?.map((deal) => (
                        <SelectItem key={deal.id} value={deal.id}>
                          {deal.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Описание</Label>
                  <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="deadline">Дедлайн</Label>
                  <Input id="deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createProject.isPending || !dealId}>
                  {createProject.isPending ? "Создание..." : "Создать"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Загрузка…</p>
      ) : (
        <>
          {filteredProjects?.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Нет проектов по выбранным фильтрам</p>
          )}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects?.map((project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FolderKanban className="h-5 w-5" />
                    <Link href={`/projects/${project.id}`} className="hover:underline">
                      {project.name}
                    </Link>
                  </CardTitle>
                  <StatusBadge kind="project" status={project.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {project.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                )}
                {project.deal && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Сделка: </span>
                    {project.deal.title}
                  </div>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {project.deadline && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(project.deadline), "dd MMM yyyy", { locale: ru })}
                    </div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground pt-2">Задач: {project._count?.tasks || 0}</div>
              </CardContent>
            </Card>
          ))}
          </div>
        </>
      )}
    </div>
  )
}
