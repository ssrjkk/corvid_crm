import { Badge } from "@/components/ui/badge"
import { dealBadge, invoiceBadge, projectBadge, taskBadge } from "@/lib/labels"

const mappers = {
  deal: dealBadge,
  invoice: invoiceBadge,
  project: projectBadge,
  task: taskBadge,
} as const

export type StatusBadgeKind = keyof typeof mappers

// Единственная точка рендера статусных бейджей.
// Семантика (цвета) живет в @/lib/labels.ts, здесь только выбор variant.
export function StatusBadge({ kind, status }: { kind: StatusBadgeKind; status: string }) {
  const spec = mappers[kind](status)
  return (
    <Badge className={spec.className || undefined} variant={spec.className ? undefined : "secondary"}>
      {spec.label}
    </Badge>
  )
}
