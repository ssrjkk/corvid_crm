"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { trpc } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FilterSheet } from "@/components/filter-sheet"
import { Plus, Trash2, CheckCircle, XCircle, Download } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/status-badge"
import { downloadCsv } from "@/lib/csv"
import { dealStatusLabels, formatMoney } from "@/lib/labels"
import { roundMoney } from "@/lib/money"
import { usePermissions } from "@/lib/use-permissions"

export default function DealsPage() {
  const { canWrite, canDelete } = usePermissions()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [value, setValue] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [amountFrom, setAmountFrom] = useState("")
  const [amountTo, setAmountTo] = useState("")
  
  const utils = trpc.useUtils()
  const { data: deals, isLoading } = trpc.deals.getAll.useQuery()
  const createDeal = trpc.deals.create.useMutation({
    onSuccess: () => {
      utils.deals.getAll.invalidate()
      setOpen(false)
      setTitle("")
      setValue("")
      toast.success("Сделка создана")
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })
  const updateStatus = trpc.deals.updateStatus.useMutation({
    onSuccess: () => {
      utils.deals.getAll.invalidate()
      toast.success("Статус сделки обновлен")
    },
  })
  const deleteDeal = trpc.deals.delete.useMutation({
    onSuccess: () => {
      utils.deals.getAll.invalidate()
      toast.success("Сделка удалена")
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createDeal.mutate({
      title,
      value: value ? Number(value) : undefined,
    })
  }

  // Бейдж статуса — единый <StatusBadge kind="deal"> (семантика в @/lib/labels.ts).

  const filteredDeals = useMemo(() => {
    return deals?.filter((deal) => {
      if (statusFilter !== "ALL" && deal.status !== statusFilter) return false
      const created = new Date(deal.createdAt)
      if (dateFrom && created < new Date(dateFrom)) return false
      if (dateTo) {
        const end = new Date(dateTo)
        end.setHours(23, 59, 59, 999)
        if (created > end) return false
      }
      const amount = Number(deal.value || 0)
      if (amountFrom && amount < Number(amountFrom)) return false
      if (amountTo && amount > Number(amountTo)) return false
      return true
    })
  }, [deals, statusFilter, dateFrom, dateTo, amountFrom, amountTo])

  const activeFilterCount = [
    statusFilter !== "ALL",
    Boolean(dateFrom),
    Boolean(dateTo),
    Boolean(amountFrom),
    Boolean(amountTo),
  ].filter(Boolean).length

  const resetFilters = () => {
    setStatusFilter("ALL")
    setDateFrom("")
    setDateTo("")
    setAmountFrom("")
    setAmountTo("")
  }

  const exportCsv = () => {
    downloadCsv("deals.csv", [
      ["Название", "Сумма", "Валюта", "Статус", "Этап", "Компания", "Контакт", "Создана"],
      ...(filteredDeals ?? []).map((deal) => [
        deal.title,
        roundMoney(Number(deal.value || 0)),
        deal.currency,
        dealStatusLabels[deal.status] ?? deal.status,
        deal.stage?.name ?? "",
        deal.company?.name ?? "",
        deal.contact ? `${deal.contact.firstName} ${deal.contact.lastName ?? ""}`.trim() : "",
        new Date(deal.createdAt).toISOString().slice(0, 10),
      ]),
    ])
    toast.success("CSV экспортирован")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Сделки</h1>
          <p className="text-muted-foreground">Управление сделками и заказами</p>
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
                  OPEN: "Открыта",
                  WON: "Выиграна",
                  LOST: "Проиграна",
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Все статусы</SelectItem>
                  <SelectItem value="OPEN">Открыта</SelectItem>
                  <SelectItem value="WON">Выиграна</SelectItem>
                  <SelectItem value="LOST">Проиграна</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="deals-date-from">Создана с</Label>
                <Input
                  id="deals-date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="deals-date-to">Создана по</Label>
                <Input
                  id="deals-date-to"
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="deals-amount-from">Сумма от</Label>
                <Input
                  id="deals-amount-from"
                  type="number"
                  min="0"
                  value={amountFrom}
                  onChange={(event) => setAmountFrom(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="deals-amount-to">Сумма до</Label>
                <Input
                  id="deals-amount-to"
                  type="number"
                  min="0"
                  value={amountTo}
                  onChange={(event) => setAmountTo(event.target.value)}
                />
              </div>
            </div>
          </FilterSheet>
          <Dialog open={open} onOpenChange={setOpen}>
          {canWrite && (
            <DialogTrigger render={<Button />}>
              <Plus className="mr-2 h-4 w-4" />
              Новая сделка
            </DialogTrigger>
          )}
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Создать сделку</DialogTitle>
                <DialogDescription>Добавьте новую сделку</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Название *</Label>
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="value">Сумма (₽)</Label>
                  <Input id="value" type="number" value={value} onChange={(e) => setValue(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createDeal.isPending}>
                  {createDeal.isPending ? "Создание..." : "Создать"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Загрузка сделок…</p>
      ) : (
        <>
          {filteredDeals?.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Нет сделок по выбранным фильтрам</p>
          )}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredDeals?.map((deal) => (
            <Card key={deal.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">
                    <Link href={`/deals/${deal.id}`} className="hover:underline">
                      {deal.title}
                    </Link>
                  </CardTitle>
                  <StatusBadge kind="deal" status={deal.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-bold tabular-nums">
                  {formatMoney(deal.value, deal.currency)}
                </div>
                {deal.company && (
                  <div className="text-sm text-muted-foreground">{deal.company.name}</div>
                )}
                {deal.contact && (
                  <div className="text-sm text-muted-foreground">
                    {deal.contact.firstName} {deal.contact.lastName}
                  </div>
                )}
                {deal.stage && (
                  <Badge variant="secondary">
                    {deal.stage.name}
                  </Badge>
                )}
                {canWrite && deal.status === "OPEN" && (
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: deal.id, status: "WON" })} disabled={updateStatus.isPending}><CheckCircle className="mr-1 h-3 w-3" />Выиграна</Button>
                    <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: deal.id, status: "LOST" })} disabled={updateStatus.isPending}><XCircle className="mr-1 h-3 w-3" />Проиграна</Button>
                  </div>
                )}
                {canDelete && (
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deleteDeal.mutate({ id: deal.id })} disabled={deleteDeal.isPending}>
                    <Trash2 className="mr-1 h-3 w-3" />
                    Удалить
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
          </div>
        </>
      )}
    </div>
  )
}
