"use client"

import Link from "next/link"
import { ArrowLeft, Printer } from "lucide-react"
import { toast } from "sonner"
import { trpc } from "@/lib/trpc/client"
import { formatMoney, invoiceStatusLabels } from "@/lib/labels"
import { invoiceTotal, lineTotal } from "@/lib/money"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Бейдж статуса — единый <StatusBadge kind="invoice"> (семантика в @/lib/labels.ts).

export default function InvoiceDetail({ invoiceId }: { invoiceId: string }) {
  const { data: invoice, isLoading } = trpc.invoices.getById.useQuery({ id: invoiceId })
  const utils = trpc.useUtils()
  const updateStatus = trpc.invoices.updateStatus.useMutation({
    onSuccess: () => {
      utils.invoices.getById.invalidate({ id: invoiceId })
      utils.invoices.getAll.invalidate()
      toast.success("Статус счёта обновлён")
    },
    onError: (error) => toast.error(error.message),
  })

  if (isLoading) {
    return <div className="py-10 text-center text-sm text-muted-foreground">Загрузка счёта…</div>
  }
  if (!invoice) {
    return (
      <div className="space-y-4 py-10 text-center">
        <p className="text-muted-foreground">Счёт не найден</p>
        <Button nativeButton={false} render={<Link href="/invoices" />}>К списку счетов</Button>
      </div>
    )
  }

  const total = invoiceTotal(invoice.items)
  const clientName = invoice.company?.name
    ?? (invoice.contact ? `${invoice.contact.firstName} ${invoice.contact.lastName ?? ""}`.trim() : null)

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center gap-3">
        <Button nativeButton={false} variant="ghost" size="icon" render={<Link href="/invoices" aria-label="Назад" />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="break-words text-2xl font-bold tracking-tight sm:text-3xl">Счёт {invoice.number}</h1>
          <p className="text-muted-foreground">
            Выставлен: {new Date(invoice.issueDate).toLocaleDateString("ru-RU")}
            {invoice.dueDate ? ` · Оплатить до: ${new Date(invoice.dueDate).toLocaleDateString("ru-RU")}` : ""}
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <StatusBadge kind="invoice" status={invoice.status} />
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Печать / PDF
          </Button>
        </div>
      </div>

      <div className="no-print flex flex-wrap gap-2">
        {invoice.status !== "SENT" && invoice.status !== "PAID" && (
          <Button variant="outline" onClick={() => updateStatus.mutate({ id: invoice.id, status: "SENT" })}>
            Выставить клиенту
          </Button>
        )}
        {invoice.status !== "PAID" && (
          <Button onClick={() => updateStatus.mutate({ id: invoice.id, status: "PAID" })}>
            Отметить оплаченным
          </Button>
        )}
        {invoice.status !== "DRAFT" && (
          <Button variant="ghost" onClick={() => updateStatus.mutate({ id: invoice.id, status: "DRAFT" })}>
            Вернуть в черновики
          </Button>
        )}
      </div>

      <Card className="print:border-0 print:shadow-none">
        <CardHeader className="no-print">
          <CardTitle>Позиции счёта</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 print:p-0">
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="shrink-0 text-muted-foreground">Клиент</span>
              <span className="min-w-0 text-right font-medium [overflow-wrap:anywhere]">
                {clientName ?? "Не указан"}
              </span>
            </div>
            {invoice.company?.address && (
              <div className="flex justify-between gap-4">
                <span className="shrink-0 text-muted-foreground">Адрес</span>
                <span className="min-w-0 text-right [overflow-wrap:anywhere]">
                  {invoice.company.address}
                </span>
              </div>
            )}
            {invoice.company?.email && (
              <div className="flex justify-between gap-4">
                <span className="shrink-0 text-muted-foreground">Email</span>
                <span className="min-w-0 text-right [overflow-wrap:anywhere]">
                  {invoice.company.email}
                </span>
              </div>
            )}
            {invoice.deal && (
              <div className="no-print flex justify-between gap-4">
                <span className="shrink-0 text-muted-foreground">Сделка</span>
                <Link
                  href={`/deals/${invoice.deal.id}`}
                  className="min-w-0 text-right text-primary [overflow-wrap:anywhere] hover:underline"
                >
                  {invoice.deal.title}
                </Link>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <span className="shrink-0 text-muted-foreground">Статус</span>
              <span className="min-w-0 text-right">{invoiceStatusLabels[invoice.status] ?? invoice.status}</span>
            </div>
          </div>

          {/* На телефоне таблица из пяти колонок не помещается: те же позиции
              показываем карточками, таблица остаётся для sm+ и печати. */}
          <div className="space-y-2 sm:hidden print:hidden">
            {invoice.items.map((item, index) => (
              <div key={item.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 break-words text-sm font-medium">
                    {index + 1}. {item.name}
                  </p>
                  <p className="shrink-0 text-sm font-semibold tabular-nums">
                    {formatMoney(lineTotal(item), invoice.currency)}
                  </p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                  {item.qty} × {formatMoney(item.price, invoice.currency)}
                </p>
              </div>
            ))}
            <div className="flex items-center justify-between gap-3 border-t pt-3 text-sm">
              <span className="font-semibold">Итого к оплате</span>
              <span className="text-lg font-bold tabular-nums">
                {formatMoney(total, invoice.currency)}
              </span>
            </div>
          </div>

          <div className="hidden overflow-x-auto sm:block print:block">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">#</th>
                  <th className="py-2 pr-4 font-medium">Наименование</th>
                  <th className="py-2 pr-4 text-right font-medium">Кол-во</th>
                  <th className="py-2 pr-4 text-right font-medium">Цена</th>
                  <th className="py-2 text-right font-medium">Сумма</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 text-muted-foreground">{index + 1}</td>
                    <td className="py-2 pr-4">{item.name}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{item.qty}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{formatMoney(item.price, invoice.currency)}</td>
                    <td className="py-2 text-right font-medium tabular-nums">
                      {formatMoney(lineTotal(item), invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="pt-3 text-right font-semibold">Итого к оплате</td>
                  <td className="pt-3 text-right text-lg font-bold tabular-nums">
                    {formatMoney(total, invoice.currency)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {invoice.note && (
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <p className="whitespace-pre-wrap">{invoice.note}</p>
            </div>
          )}
          {invoice.status === "PAID" && invoice.paidAt && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              Оплачен {new Date(invoice.paidAt).toLocaleDateString("ru-RU")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
