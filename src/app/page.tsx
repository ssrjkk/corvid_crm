import Link from "next/link"
import { ArrowRight, KanbanSquare, LineChart, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BrandMark } from "@/components/layout/brand"

const features = [
  {
    icon: KanbanSquare,
    title: "Воронка сделок",
    text: "Kanban-доска с этапами: тащите карточку — сделка обновляется автоматически",
  },
  {
    icon: LineChart,
    title: "Аналитика",
    text: "Выручка по месяцам, конверсия по этапам, задачи на сегодня и просрочки",
  },
  {
    icon: Sparkles,
    title: "Под любой тип работы",
    text: "Фриланс-заказы, проекты в найме, сопровождение — сущности гибкие",
  },
]

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col items-center overflow-hidden px-4 py-20">
      <div aria-hidden className="hero-glow pointer-events-none absolute inset-x-0 top-0 h-[480px]" />
      <div className="relative flex w-full max-w-3xl flex-col items-center gap-10 text-center">
        <div className="flex flex-col items-center gap-5">
          <BrandMark size={88} />
          <h1 className="text-5xl font-bold tracking-tight">
            Corvid — CRM для фриланса
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Сделки, проекты, задачи и клиенты — в одном месте. Дизайн, который
            не стыдно открыть при заказчике.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <Button size="lg" nativeButton={false} render={<Link href="/sign-in" />}>
            Войти
          </Button>
          <Button
            size="lg"
            variant="outline"
            nativeButton={false}
            render={<Link href="/sign-up" />}
          >
            Создать аккаунт
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            size="lg"
            variant="ghost"
            nativeButton={false}
            render={<Link href="/dashboard" />}
          >
            Дашборд
          </Button>
        </div>

        <div className="grid w-full gap-4 pt-6 text-left sm:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className="bg-card rounded-xl border p-5 shadow-xs"
              >
                <Icon className="text-primary h-5 w-5" />
                <h2 className="mt-3 font-semibold">{feature.title}</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">{feature.text}</p>
              </div>
            )
          })}
        </div>

        <p className="text-sm text-muted-foreground">
          © 2026 ssrjkk · Corvid CRM
        </p>
      </div>
    </div>
  )
}
