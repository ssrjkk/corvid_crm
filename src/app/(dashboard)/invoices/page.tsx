"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, ReceiptText, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { trpc } from "@/lib/trpc/client"
import { usePermissions } from "@/lib/use-permissions"
import { formatMoney } from "@/lib/labels"
import { invoiceTotal, roundMoney } from "@/lib/money"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

// Бейдж статуса — единый <StatusBadge kind="invoice"> (семантика в @/lib/labels.ts).

type ItemDraft = { name: string; qty: string; price: string }

const emptyItem: ItemDraft = { name: "", qty: "1", price: "" }

function CreateInvoiceDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [companyId, setCompanyId] = useState("none")
  const [contactId, setContactId] = useState("none")
  const [dealId, setDealId] = useState("none")
  const [dueDate, setDueDate] = useState("")
  const [currency, setCurrency] = useState("RUB")
  const [note, setNote] = useState("")
  const [items, setItems] = useState<ItemDraft[]>([{ ...emptyItem }])

  const { data: companies = [] } = trpc.companies.getAll.useQuery()
  const { data: contacts = [] } = trpc.contacts.getAll.useQuery()
  const { data: deals = [] } = trpc.deals.getAll.useQuery()

  const total = items.reduce(
    (sum, item) => sum + (Number(item.qty) || 0) * (Number(item.price) || 0),
    0
  )

  const create = trpc.invoices.create.useMutation({
    onSuccess: () => {
      toast.success("Счёт создан")
      onCreated()
      setOpen(false)
      setItems([{ ...emptyItem }])
      setNote("")
      setDueDate("")
    },
    onError: (error) => toast.error(error.message),
  })

  const updateItem = (index: number, patch: Partial<ItemDraft>) => {
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const validItems = items
      .filter((item) => item.name.trim() !== "")
      .map((item) => ({
        name: item.name,
        qty: Number(item.qty) || 1,
        price: Number(item.price) || 0,
      }))
    if (validItems.length === 0) {
      toast.error("Добавьте хотя бы одну позицию")
      return
    }
    create.mutate({
      companyId: companyId === "none" ? undefined : companyId,
      contactId: contactId === "none" ? undefined : contactId,
      dealId: dealId === "none" ? undefined : dealId,
      dueDate: dueDate || undefined,
      currency,
      note: note || undefined,
      items: validItems,
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="mr-2 h-4 w-4" />
        Новый счёт
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Новый счёт</DialogTitle>
            <DialogDescription>Номер присваивается автоматически (INV-0001…)</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label>Компания</Label>
              <Select value={companyId} onValueChange={(v: string) => setCompanyId(v)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Без компании</SelectItem>
                  {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Контакт</Label>
              <Select value={contactId} onValueChange={(v: string) => setContactId(v)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Без контакта</SelectItem>
                  {contacts.map((c) => <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Сделка</Label>
              <Select value={dealId} onValueChange={(v: string) => setDealId(v)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Без сделки</SelectItem>
                  {deals.map((d) => <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Позиции счёта</Label>
            {items.map((item, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder="Наименование работ"
                  value={item.name}
                  onChange={(e) => updateItem(index, { name: e.target.value })}
                  className="flex-1"
                />
                <Input
                  type="number" min="0" step="0.01" placeholder="Кол-во"
                  value={item.qty}
                  onChange={(e) => updateItem(index, { qty: e.target.value })}
                  className="w-24"
                />
                <Input
                  type="number" min="0" step="0.01" placeholder="Цена"
                  value={item.price}
                  onChange={(e) => updateItem(index, { price: e.target.value })}
                  className="w-32"
                />
                <Button
                  type="button" variant="ghost" size="icon" aria-label="Удалить позицию"
                  disabled={items.length === 1}
                  onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setItems((c) => [...c, { ...emptyItem }])}>
              <Plus className="mr-2 h-4 w-4" />
              Добавить позицию
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label>Срок оплаты</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Валюта</Label>
              <Select value={currency} onValueChange={(v: string) => setCurrency(v)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="RUB">RUB</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid items-end gap-2">
              <div className="text-right text-lg font-semibold tabular-nums">
                Итого: {formatMoney(total, currency)}
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Комментарий</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Условия оплаты, реквизиты…" />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Создание…" : "Создать счёт"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function InvoicesPage() {
  const { canDelete } = usePermissions()
  const { data: invoices, isLoading, refetch } = trpc.invoices.getAll.useQuery()
  const updateStatus = trpc.invoices.updateStatus.useMutation({
    onSuccess: () => {
      refetch()
      toast.success("Статус счёта обновлён")
    },
    onError: (error) => toast.error(error.message),
  })
  const remove = trpc.invoices.delete.useMutation({
    onSuccess: () => {
      refetch()
      toast.success("Счёт удалён")
    },
    onError: (error) => toast.error(error.message),
  })

  // Date.now() нестабилен при prerender (Next 16) — вычисляем строго после монтирования.
  // setState-in-effect здесь осознанный: useSyncExternalStore не подходит для времени.
  const [now, setNow] = useState<number | null>(null)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setNow(Date.now()), [])

  const list = invoices ?? []
  const sum = (status: string) =>
    roundMoney(
      list
        .filter((inv) => inv.status === status)
        .reduce((acc, inv) => acc + invoiceTotal(inv.items), 0)
    )

  const overdue =
    now === null
      ? []
      : list.filter(
          (inv) => inv.status === "SENT" && inv.dueDate && new Date(inv.dueDate).getTime() < now
        )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Счета</h1>
          <p className="text-muted-foreground">Выставление счетов и оплата по проектам</p>
        </div>
        <CreateInvoiceDialog onCreated={() => refetch()} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Выставлено</CardTitle>
            <ReceiptText className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{formatMoney(sum("SENT"))}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Получено</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatMoney(sum("PAID"))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Просрочено</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-destructive">
              {overdue.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего счетов</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{list.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Загрузка счетов…</p>
          ) : list.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Счетов пока нет — создайте первый счёт кнопкой «Новый счёт»
            </p>
          ) : (
            <div className="space-y-2">
              {list.map((inv) => {
                const total = invoiceTotal(inv.items)
                const isOverdue =
                  now !== null &&
                  inv.status === "SENT" &&
                  !!inv.dueDate &&
                  new Date(inv.dueDate).getTime() < now
                return (
                  <div
                    key={inv.id}
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 ${isOverdue ? "border-destructive/30 bg-destructive/10" : ""}`}
                  >
                    <div className="min-w-0">
                      <Link href={`/invoices/${inv.id}`} className="font-medium hover:underline">
                        {inv.number}
                      </Link>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {inv.company?.name ?? inv.contact ? [inv.company?.name, inv.contact ? `${inv.contact.firstName} ${inv.contact.lastName ?? ""}`.trim() : null].filter(Boolean).join(" · ") : "Без клиента"}
                        {inv.dueDate ? ` · до ${new Date(inv.dueDate).toLocaleDateString("ru-RU")}` : ""}
                      </div>
                    </div>
                    <div className="text-right font-semibold tabular-nums">{formatMoney(total, inv.currency)}</div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge kind="invoice" status={inv.status} />
                      {inv.status !== "SENT" && inv.status !== "PAID" && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: inv.id, status: "SENT" })}>
                          Выставить
                        </Button>
                      )}
                      {inv.status !== "PAID" && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: inv.id, status: "PAID" })}>
                          Отметить оплаченным
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          size="sm" variant="ghost" aria-label={`Удалить ${inv.number}`}
                          onClick={() => remove.mutate({ id: inv.id })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
