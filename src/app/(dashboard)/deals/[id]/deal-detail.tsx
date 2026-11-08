"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckSquare,
  FileText,
  Pencil,
  Plus,
  Send,
  User as UserIcon,
} from "lucide-react"
import { toast } from "sonner"
import { trpc } from "@/lib/trpc/client"
import type { RouterOutputs } from "@/server/routers/_app"
import { Badge } from "@/components/ui/badge"
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
import { ActivityTimeline } from "@/components/detail/activity-timeline"
import { formatDate, formatMoney, priorityLabels, taskStatusLabels, activityTypeLabels } from "@/lib/labels"
import { usePermissions } from "@/lib/use-permissions"

type Deal = NonNullable<RouterOutputs["deals"]["getById"]>
type Stage = RouterOutputs["pipeline"]["getStages"][number]
type Company = RouterOutputs["companies"]["getAll"][number]
type Contact = RouterOutputs["contacts"]["getAll"][number]

// Бейдж статуса — единый <StatusBadge kind="deal"> (семантика в @/lib/labels.ts).

export default function DealDetail({ dealId }: { dealId: string }) {
  const { canWrite } = usePermissions()
  const utils = trpc.useUtils()
  const { data: deal, isLoading } = trpc.deals.getById.useQuery({ id: dealId })
  const { data: stages = [] } = trpc.pipeline.getStages.useQuery()
  const { data: companies = [] } = trpc.companies.getAll.useQuery()
  const { data: contacts = [] } = trpc.contacts.getAll.useQuery()

  const [taskOpen, setTaskOpen] = useState(false)
  const [taskTitle, setTaskTitle] = useState("")
  const [taskDescription, setTaskDescription] = useState("")
  const [taskDueDate, setTaskDueDate] = useState("")
  const [taskPriority, setTaskPriority] = useState("MEDIUM")

  const [noteOpen, setNoteOpen] = useState(false)
  const [noteType, setNoteType] = useState("NOTE")
  const [noteTitle, setNoteTitle] = useState("")
  const [noteContent, setNoteContent] = useState("")

  const [editOpen, setEditOpen] = useState(false)

  const refresh = () => {
    utils.deals.getById.invalidate({ id: dealId })
    utils.deals.getAll.invalidate()
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

  const createNote = trpc.activities.create.useMutation({
    onSuccess: () => {
      refresh()
      setNoteOpen(false)
      setNoteType("NOTE")
      setNoteTitle("")
      setNoteContent("")
      toast.success("Активность добавлена")
    },
    onError: (error) => toast.error(error.message),
  })

  const updateStatus = trpc.deals.updateStatus.useMutation({
    onSuccess: () => {
      refresh()
      toast.success("Статус сделки обновлён")
    },
    onError: (error) => toast.error(error.message),
  })

  if (isLoading) {
    return <div className="py-10 text-center text-sm text-muted-foreground">Загрузка сделки...</div>
  }

  if (!deal) {
    return (
      <div className="space-y-4 py-10 text-center">
        <p className="text-muted-foreground">Сделка не найдена</p>
        <Button nativeButton={false} render={<Link href="/deals" />}>Вернуться к сделкам</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button nativeButton={false} variant="ghost" size="icon" render={<Link href="/deals" aria-label="Назад" />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{deal.title}</h1>
          <p className="text-muted-foreground">Карточка сделки</p>
          {deal.tags && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {deal.tags.split(",").map((tag) => {
                const label = tag.trim()
                return label ? (
                  <Badge key={label} variant="secondary">{label}</Badge>
                ) : null
              })}
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{formatMoney(deal.value, deal.currency)}</div>
          <div className="mt-1 flex justify-end"><StatusBadge kind="deal" status={deal.status} /></div>
        </div>
        <Sheet open={editOpen} onOpenChange={setEditOpen}>
          {canWrite && (
            <SheetTrigger render={<Button variant="outline" />}>
              <Pencil className="mr-2 h-4 w-4" />
              Редактировать
            </SheetTrigger>
          )}
          <SheetContent>
            {editOpen && (
              <DealEditForm
                deal={deal}
                stages={stages}
                companies={companies}
                contacts={contacts}
                onDone={() => setEditOpen(false)}
              />
            )}
          </SheetContent>
        </Sheet>
      </div>

      {canWrite && (
        <div className="flex flex-wrap gap-2">
          {deal.status !== "WON" && (
            <Button
              variant="outline"
              onClick={() => updateStatus.mutate({ id: deal.id, status: "WON" })}
              disabled={updateStatus.isPending}
            >
              Отметить выигранной
            </Button>
          )}
          {deal.status !== "LOST" && (
            <Button
              variant="outline"
              onClick={() => updateStatus.mutate({ id: deal.id, status: "LOST" })}
              disabled={updateStatus.isPending}
            >
              Отметить проигранной
            </Button>
          )}
          {deal.status !== "OPEN" && (
            <Button
              variant="ghost"
              onClick={() => updateStatus.mutate({ id: deal.id, status: "OPEN" })}
              disabled={updateStatus.isPending}
            >
              Вернуть в работу
            </Button>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Основная информация</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {deal.description && (
                <p className="whitespace-pre-wrap text-muted-foreground">{deal.description}</p>
              )}
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Этап: {deal.stage?.name ?? "Не указан"}
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                Создана: {formatDate(deal.createdAt)}
              </div>
              {deal.closedAt && (
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  Закрыта: {formatDate(deal.closedAt)}
                </div>
              )}
              {deal.project && (
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-muted-foreground" />
                  Проект:{" "}
                  <Link className="text-primary hover:underline" href={`/projects/${deal.project.id}`}>
                    {deal.project.name}
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5" />
                Задачи ({deal.tasks.length})
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
                        dealId,
                      })
                    }}
                  >
                    <DialogHeader>
                      <DialogTitle>Новая задача</DialogTitle>
                      <DialogDescription>Задача будет привязана к сделке «{deal.title}»</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="task-title">Название *</Label>
                        <Input
                          id="task-title"
                          value={taskTitle}
                          onChange={(event) => setTaskTitle(event.target.value)}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="task-description">Описание</Label>
                        <Textarea
                          id="task-description"
                          value={taskDescription}
                          onChange={(event) => setTaskDescription(event.target.value)}
                        />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                          <Label htmlFor="task-due">Срок</Label>
                          <Input
                            id="task-due"
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
              {deal.tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">К сделке пока не привязано ни одной задачи</p>
              ) : (
                <div className="space-y-2">
                  {deal.tasks.map((task) => (
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

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>История активностей</CardTitle>
              <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
                {canWrite && (
                  <DialogTrigger render={<Button size="sm" variant="outline" />}>
                    <Plus className="mr-2 h-4 w-4" />
                    Добавить
                  </DialogTrigger>
                )}
                <DialogContent>
                  <form
                    onSubmit={(event) => {
                      event.preventDefault()
                      createNote.mutate({
                        type: noteType as "NOTE" | "CALL" | "EMAIL" | "MEETING" | "MESSAGE" | "OTHER",
                        title: noteTitle || undefined,
                        content: noteContent,
                        dealId,
                      })
                    }}
                  >
                    <DialogHeader>
                      <DialogTitle>Новая активность</DialogTitle>
                      <DialogDescription>Заметка, звонок или встреча по сделке</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label>Тип</Label>
                        <Select value={noteType} onValueChange={(value: string) => setNoteType(value)} items={activityTypeLabels}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NOTE">Заметка</SelectItem>
                            <SelectItem value="CALL">Звонок</SelectItem>
                            <SelectItem value="EMAIL">Письмо</SelectItem>
                            <SelectItem value="MEETING">Встреча</SelectItem>
                            <SelectItem value="MESSAGE">Сообщение</SelectItem>
                            <SelectItem value="OTHER">Другое</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="note-title">Заголовок</Label>
                        <Input
                          id="note-title"
                          value={noteTitle}
                          onChange={(event) => setNoteTitle(event.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="note-content">Содержание *</Label>
                        <Textarea
                          id="note-content"
                          value={noteContent}
                          onChange={(event) => setNoteContent(event.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={createNote.isPending}>
                        <Send className="mr-2 h-4 w-4" />
                        {createNote.isPending ? "Отправка..." : "Добавить"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <ActivityTimeline activities={deal.activities} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Связи</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {deal.company && (
                <Link
                  href={`/companies/${deal.company.id}`}
                  className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent"
                >
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">{deal.company.name}</div>
                    <div className="text-xs text-muted-foreground">Компания</div>
                  </div>
                </Link>
              )}
              {deal.contact && (
                <Link
                  href={`/contacts/${deal.contact.id}`}
                  className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent"
                >
                  <UserIcon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">
                      {deal.contact.firstName} {deal.contact.lastName}
                    </div>
                    <div className="text-xs text-muted-foreground">Контакт</div>
                  </div>
                </Link>
              )}
              {!deal.company && !deal.contact && (
                <p className="text-sm text-muted-foreground">Компания и контакт не указаны</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ответственный</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {deal.owner ? (
                <div>
                  <div className="font-medium">{deal.owner.name}</div>
                  <div className="text-muted-foreground">{deal.owner.email}</div>
                </div>
              ) : (
                <p className="text-muted-foreground">Не назначен</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function DealEditForm({
  deal,
  stages,
  companies,
  contacts,
  onDone,
}: {
  deal: Deal
  stages: Stage[]
  companies: Company[]
  contacts: Contact[]
  onDone: () => void
}) {
  const utils = trpc.useUtils()
  const [title, setTitle] = useState(deal.title)
  const [description, setDescription] = useState(deal.description ?? "")
  const [value, setValue] = useState(deal.value != null ? String(deal.value) : "")
  const [tags, setTags] = useState(deal.tags ?? "")
  const [currency, setCurrency] = useState(deal.currency)
  const [stageId, setStageId] = useState(deal.stageId ?? "none")
  const [companyId, setCompanyId] = useState(deal.companyId ?? "none")
  const [contactId, setContactId] = useState(deal.contactId ?? "none")

  const update = trpc.deals.update.useMutation({
    onSuccess: () => {
      utils.deals.getById.invalidate({ id: deal.id })
      utils.deals.getAll.invalidate()
      toast.success("Сделка обновлена")
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
          id: deal.id,
          title,
          description,
          value: value === "" ? undefined : Number(value),
          currency,
          tags: tags || null,
          stageId: stageId === "none" ? null : stageId,
          companyId: companyId === "none" ? null : companyId,
          contactId: contactId === "none" ? null : contactId,
        })
      }}
    >
      <SheetHeader>
        <SheetTitle>Редактирование сделки</SheetTitle>
        <SheetDescription>Изменения сохранятся без перехода на другую страницу</SheetDescription>
      </SheetHeader>
      <div className="flex-1 space-y-4 overflow-y-auto px-4">
        <div className="grid gap-2">
          <Label htmlFor="edit-title">Название *</Label>
          <Input id="edit-title" value={title} onChange={(event) => setTitle(event.target.value)} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="edit-description">Описание</Label>
          <Textarea
            id="edit-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="edit-value">Сумма</Label>
          <Input
            id="edit-value"
            type="number"
            min="0"
            step="0.01"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="edit-tags">Теги (через запятую)</Label>
          <Input
            id="edit-tags"
            placeholder="срочно, крупный клиент"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
          />
        </div>
          <div className="grid gap-2">
            <Label>Валюта</Label>
            <Select value={currency} onValueChange={(next: string) => setCurrency(next)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RUB">RUB</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-2">
          <Label>Этап</Label>
          <Select
            value={stageId}
            onValueChange={(next: string) => setStageId(next)}
            items={{ none: "Без этапа", ...Object.fromEntries(stages.map((stage) => [stage.id, stage.name])) }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Без этапа</SelectItem>
              {stages.map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>
                  {stage.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Компания</Label>
          <Select
            value={companyId}
            onValueChange={(next: string) => setCompanyId(next)}
            items={{ none: "Без компании", ...Object.fromEntries(companies.map((company) => [company.id, company.name])) }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Без компании</SelectItem>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Контакт</Label>
          <Select
            value={contactId}
            onValueChange={(next: string) => setContactId(next)}
            items={{
              none: "Без контакта",
              ...Object.fromEntries(
                contacts.map((contact) => [
                  contact.id,
                  `${contact.firstName} ${contact.lastName ?? ""}`.trim(),
                ])
              ),
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Без контакта</SelectItem>
              {contacts.map((contact) => (
                <SelectItem key={contact.id} value={contact.id}>
                  {contact.firstName} {contact.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
