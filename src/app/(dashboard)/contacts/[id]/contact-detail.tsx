"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Building2, Mail, Phone, Pencil, Plus, Send, User as UserIcon } from "lucide-react"
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
import { ActivityTimeline } from "@/components/detail/activity-timeline"
import { activityTypeLabels, formatDate, formatMoney } from "@/lib/labels"
import { usePermissions } from "@/lib/use-permissions"

type Contact = NonNullable<RouterOutputs["contacts"]["getById"]>
type Company = RouterOutputs["companies"]["getAll"][number]

// Бейдж статуса — единый <StatusBadge kind="deal"> (семантика в @/lib/labels.ts).

export default function ContactDetail({ contactId }: { contactId: string }) {
  const { canWrite } = usePermissions()
  const utils = trpc.useUtils()
  const { data: contact, isLoading } = trpc.contacts.getById.useQuery({ id: contactId })
  const { data: companies = [] } = trpc.companies.getAll.useQuery()

  const [noteOpen, setNoteOpen] = useState(false)
  const [noteType, setNoteType] = useState("NOTE")
  const [noteTitle, setNoteTitle] = useState("")
  const [noteContent, setNoteContent] = useState("")
  const [editOpen, setEditOpen] = useState(false)

  const createNote = trpc.activities.create.useMutation({
    onSuccess: () => {
      utils.contacts.getById.invalidate({ id: contactId })
      utils.activities.getAll.invalidate()
      setNoteOpen(false)
      setNoteType("NOTE")
      setNoteTitle("")
      setNoteContent("")
      toast.success("Активность добавлена")
    },
    onError: (error) => toast.error(error.message),
  })

  if (isLoading) {
    return <div className="py-10 text-center text-sm text-muted-foreground">Загрузка контакта...</div>
  }

  if (!contact) {
    return (
      <div className="space-y-4 py-10 text-center">
        <p className="text-muted-foreground">Контакт не найден</p>
        <Button nativeButton={false} render={<Link href="/contacts" />}>Вернуться к контактам</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button nativeButton={false} variant="ghost" size="icon" render={<Link href="/contacts" aria-label="Назад" />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {contact.firstName} {contact.lastName}
          </h1>
          <p className="text-muted-foreground">{contact.position || "Контактное лицо"}</p>
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
              <ContactEditForm
                contact={contact}
                companies={companies}
                onDone={() => setEditOpen(false)}
              />
            )}
          </SheetContent>
        </Sheet>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Связанные сделки ({contact.deals.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {contact.deals.length === 0 ? (
                <p className="text-sm text-muted-foreground">У контакта пока нет сделок</p>
              ) : (
                <div className="space-y-2">
                  {contact.deals.map((deal) => (
                    <Link
                      key={deal.id}
                      href={`/deals/${deal.id}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 hover:bg-accent"
                    >
                      <div>
                        <div className="font-medium">{deal.title}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {deal.stage?.name ?? "Без этапа"} · {formatDate(deal.createdAt)}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">{formatMoney(deal.value, deal.currency)}</span>
                        <StatusBadge kind="deal" status={deal.status} />
                      </div>
                    </Link>
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
                        contactId,
                      })
                    }}
                  >
                    <DialogHeader>
                      <DialogTitle>Новая активность</DialogTitle>
                      <DialogDescription>Заметка, звонок или встреча с контактом</DialogDescription>
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
                        <Label htmlFor="contact-note-title">Заголовок</Label>
                        <Input
                          id="contact-note-title"
                          value={noteTitle}
                          onChange={(event) => setNoteTitle(event.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="contact-note-content">Содержание *</Label>
                        <Textarea
                          id="contact-note-content"
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
              <ActivityTimeline activities={contact.activities} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Контакты</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="flex items-center gap-2 hover:underline">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {contact.email}
                </a>
              )}
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="flex items-center gap-2 hover:underline">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {contact.phone}
                </a>
              )}
              {contact.company ? (
                <Link
                  href={`/companies/${contact.company.id}`}
                  className="flex items-center gap-2 hover:underline"
                >
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  {contact.company.name}
                </Link>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  Компания не указана
                </div>
              )}
              {!contact.email && !contact.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <UserIcon className="h-4 w-4" />
                  Нет контактных данных
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Детали</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>Добавлен: {formatDate(contact.createdAt)}</div>
              <div>Обновлён: {formatDate(contact.updatedAt)}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function ContactEditForm({
  contact,
  companies,
  onDone,
}: {
  contact: Contact
  companies: Company[]
  onDone: () => void
}) {
  const utils = trpc.useUtils()
  const [firstName, setFirstName] = useState(contact.firstName)
  const [lastName, setLastName] = useState(contact.lastName ?? "")
  const [email, setEmail] = useState(contact.email ?? "")
  const [phone, setPhone] = useState(contact.phone ?? "")
  const [position, setPosition] = useState(contact.position ?? "")
  const [companyId, setCompanyId] = useState(contact.companyId ?? "none")

  const update = trpc.contacts.update.useMutation({
    onSuccess: () => {
      utils.contacts.getById.invalidate({ id: contact.id })
      utils.contacts.getAll.invalidate()
      toast.success("Контакт обновлён")
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
          id: contact.id,
          firstName,
          lastName,
          email: email || "",
          phone,
          position,
          companyId: companyId === "none" ? null : companyId,
        })
      }}
    >
      <SheetHeader>
        <SheetTitle>Редактирование контакта</SheetTitle>
        <SheetDescription>Обновите данные контактного лица</SheetDescription>
      </SheetHeader>
      <div className="flex-1 space-y-4 overflow-y-auto px-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="contact-first-name">Имя *</Label>
            <Input
              id="contact-first-name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="contact-last-name">Фамилия</Label>
            <Input
              id="contact-last-name"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="contact-email">Email</Label>
          <Input
            id="contact-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="contact-phone">Телефон</Label>
          <Input
            id="contact-phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="contact-position">Должность</Label>
          <Input
            id="contact-position"
            value={position}
            onChange={(event) => setPosition(event.target.value)}
          />
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
      </div>
      <SheetFooter>
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? "Сохранение..." : "Сохранить"}
        </Button>
      </SheetFooter>
    </form>
  )
}
