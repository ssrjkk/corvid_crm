"use client"

import { trpc } from "@/lib/trpc/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatMoney, formatCompactMoney } from "@/lib/labels"
import { Handshake, CheckSquare, Users, FolderKanban } from "lucide-react"
import Link from "next/link"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"

export default function DashboardPage() {
  // V27 «Ресурсы»: сводка одним lightweight-запросом (count/aggregate на сервере),
  // а не четыре getAll с полными связями — ради пяти чисел на карточках.
  const { data: summary } = trpc.analytics.getSummary.useQuery()
  const { data: funnel } = trpc.analytics.getFunnel.useQuery()
  const { data: revenue } = trpc.analytics.getRevenueByMonth.useQuery()
  const { data: taskWidgets } = trpc.analytics.getTaskWidgets.useQuery()

  const totalDeals = summary?.totalDeals ?? 0
  // Валюты не смешиваются: каждая сумма форматируется своим кодом (V29).
  const valueLine =
    summary && summary.valueByCurrency.length > 0
      ? summary.valueByCurrency.map(({ currency, total }) => formatMoney(total, currency)).join(" · ")
      : formatMoney(0)
  const openTasks = summary?.openTasks ?? 0
  const totalContacts = summary?.totalContacts ?? 0
  const activeProjects = summary?.activeProjects ?? 0

  const statCards = [
    { title: "Сделки", value: totalDeals, hint: `На сумму ${valueLine}`, Icon: Handshake },
    { title: "Активные задачи", value: openTasks, Icon: CheckSquare },
    { title: "Контакты", value: totalContacts, Icon: Users },
    { title: "Проекты в работе", value: activeProjects, Icon: FolderKanban },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Дашборд</h1>
        <p className="text-muted-foreground">Обзор вашей CRM</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {statCards.map(({ title, value, hint, Icon }) => (
          <Card key={title} className="gap-3 py-4 lg:gap-6 lg:py-6">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pb-1 lg:px-6 lg:pb-2">
              <CardTitle className="text-xs font-medium sm:text-sm">{title}</CardTitle>
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-4 lg:px-6">
              <div className="text-2xl font-bold tabular-nums">{value}</div>
              {hint && (
                <p className="mt-1 text-xs text-muted-foreground tabular-nums">{hint}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Воронка продаж</CardTitle></CardHeader>
          <CardContent className="sm:h-64">
            {funnel && funnel.length > 0 ? (
              <>
                {/* На телефоне подписи этапов в столбчатой диаграмме обрезаются:
                    тот же честный срез данных показываем списком, без скролла. */}
                <div className="space-y-2 sm:hidden">
                  {funnel.map((stage) => (
                    <div
                      key={stage.name}
                      className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
                    >
                      <span className="truncate">{stage.name}</span>
                      <span className="shrink-0 font-medium tabular-nums">{stage.count}</span>
                    </div>
                  ))}
                </div>
                <div className="hidden h-full sm:block">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={funnel}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" fontSize={12} tick={{ fill: "var(--muted-foreground)" }} tickLine={false} axisLine={{ stroke: "var(--border)" }} />
                      <YAxis allowDecimals={false} fontSize={12} tick={{ fill: "var(--muted-foreground)" }} tickLine={false} axisLine={{ stroke: "var(--border)" }} width={32} />
                      <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: "8px" }} />
                      <Bar dataKey="count" fill="var(--chart-1)" name="Сделок" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <div className="flex h-full min-h-40 items-center justify-center text-sm text-muted-foreground">Нет данных</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Выручка по месяцам</CardTitle></CardHeader>
          <CardContent className={revenue && revenue.length > 0 ? "h-64" : "flex flex-1 flex-col items-center justify-center gap-1 py-8 text-center"}>
            {revenue && revenue.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" fontSize={12} tick={{ fill: "var(--muted-foreground)" }} tickLine={false} axisLine={{ stroke: "var(--border)" }} />
                  <YAxis fontSize={12} tick={{ fill: "var(--muted-foreground)" }} tickLine={false} axisLine={{ stroke: "var(--border)" }} width={64} tickFormatter={(v) => formatCompactMoney(Number(v))} />
                  <Tooltip formatter={(v) => formatMoney(Number(v))} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: "8px" }} />
                  <Line type="monotone" dataKey="total" stroke="var(--chart-3)" strokeWidth={2} name="Выручка" isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Нет закрытых сделок</p>
                <p className="max-w-xs text-xs text-muted-foreground">
                  Отметьте сделку «Выиграна» — и здесь появится динамика по месяцам.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Задачи на сегодня</CardTitle></CardHeader>
          <CardContent>
            {taskWidgets?.todayTasks?.length ? (
              <div className="space-y-2">
                {taskWidgets.todayTasks.slice(0, 5).map((t) => (
                  <Link
                    key={t.id}
                    href={t.deal ? `/deals/${t.deal.id}` : "/tasks"}
                    className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm hover:bg-accent"
                  >
                    <span className="min-w-0 truncate">{t.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{t.status}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Нет задач на сегодня</p>
            )}
            <Link href="/tasks" className="mt-3 inline-block text-sm text-primary hover:underline">Перейти к задачам</Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Просроченные задачи</CardTitle></CardHeader>
          <CardContent>
            {taskWidgets?.overdueTasks?.length ? (
              <div className="space-y-2">
                {taskWidgets.overdueTasks.slice(0, 5).map((t) => (
                  <Link
                    key={t.id}
                    href={t.deal ? `/deals/${t.deal.id}` : "/tasks"}
                    className="flex items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-sm hover:bg-destructive/15"
                  >
                    <span className="min-w-0 truncate">{t.title}</span>
                    <span className="shrink-0 text-xs text-destructive">{t.status}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Нет просроченных задач</p>
            )}
            <Link href="/tasks" className="mt-3 inline-block text-sm text-primary hover:underline">Перейти к задачам</Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
