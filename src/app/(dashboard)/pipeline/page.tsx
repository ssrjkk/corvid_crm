"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { SortableContext, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { toast } from "sonner"
import { trpc } from "@/lib/trpc/client"
import type { RouterOutputs } from "@/server/routers/_app"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatMoney } from "@/lib/labels"
import { usePermissions } from "@/lib/use-permissions"

type Stage = RouterOutputs["pipeline"]["getStages"][number]
type StageDeal = Stage["deals"][number]

function DealCardBody({ deal }: { deal: StageDeal }) {
  return (
    <Card className="cursor-grab active:cursor-grabbing">
      <CardContent className="space-y-1 p-3">
        <Link
          href={`/deals/${deal.id}`}
          className="block text-sm font-medium hover:underline"
          onPointerDown={(event) => event.stopPropagation()}
        >
          {deal.title}
        </Link>
        <div className="text-xs text-muted-foreground tabular-nums">
          {formatMoney(deal.value, deal.currency)}
        </div>
        {deal.company && <div className="text-xs text-muted-foreground">{deal.company.name}</div>}
        {deal.contact && (
          <div className="text-xs text-muted-foreground">
            {deal.contact.firstName} {deal.contact.lastName}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SortableDealCard({ deal, disabled }: { deal: StageDeal; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: deal.id,
    disabled,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <DealCardBody deal={deal} />
    </div>
  )
}

function StageColumn({ stage, disabled }: { stage: Stage; disabled: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id, disabled })
  return (
    <div className="w-72 flex-shrink-0">
      <Card className={isOver ? "ring-2 ring-primary" : undefined}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <div
              className="h-3 w-3 rounded-full bg-muted-foreground"
              style={stage.color ? { backgroundColor: stage.color } : undefined}
            />
            {stage.name}
            <span className="ml-auto text-muted-foreground">{stage.deals.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div ref={setNodeRef} className="min-h-[200px] space-y-2">
            <SortableContext items={stage.deals.map((deal) => deal.id)}>
              {stage.deals.map((deal) => (
                <SortableDealCard key={deal.id} deal={deal} disabled={disabled} />
              ))}
            </SortableContext>
            {stage.deals.length === 0 && (
              <p className="pt-6 text-center text-xs text-muted-foreground">Перетащите сделку сюда</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function PipelinePage() {
  const { canWrite } = usePermissions()
  const utils = trpc.useUtils()
  const { data: stages, isLoading } = trpc.pipeline.getStages.useQuery()
  const initStages = trpc.pipeline.initDefault.useMutation({
    onSuccess: () => utils.pipeline.getStages.invalidate(),
  })

  const updateStage = trpc.deals.updateStage.useMutation({
    onMutate: async ({ id, stageId }) => {
      await utils.pipeline.getStages.cancel()
      const previous = utils.pipeline.getStages.getData()
      utils.pipeline.getStages.setData(undefined, (old) => {
        if (!old) return old
        const movedDeal = old.flatMap((stage) => stage.deals).find((deal) => deal.id === id)
        if (!movedDeal) return old
        return old.map((stage) => ({
          ...stage,
          deals:
            stage.id === stageId
              ? [...stage.deals.filter((deal) => deal.id !== id), movedDeal]
              : stage.deals.filter((deal) => deal.id !== id),
        }))
      })
      return { previous }
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        utils.pipeline.getStages.setData(undefined, context.previous)
      }
      toast.error(error.message)
    },
    onSuccess: () => toast.success("Сделка перемещена"),
    onSettled: () => {
      utils.pipeline.getStages.invalidate()
      utils.deals.getAll.invalidate()
    },
  })

  useEffect(() => {
    if (!isLoading && stages && stages.length === 0 && !initStages.isPending) {
      initStages.mutate()
    }
  }, [isLoading, stages, initStages])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )
  const [activeId, setActiveId] = useState<string | null>(null)

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    if (!canWrite) return
    const { active, over } = event
    if (!over || !stages) return

    const dealId = String(active.id)
    const overId = String(over.id)
    const sourceStage = stages.find((stage) => stage.deals.some((deal) => deal.id === dealId))
    const targetStage =
      stages.find((stage) => stage.id === overId) ??
      stages.find((stage) => stage.deals.some((deal) => deal.id === overId))

    if (!targetStage || targetStage.id === sourceStage?.id) return
    updateStage.mutate({ id: dealId, stageId: targetStage.id })
  }

  if (isLoading) {
    return <div className="py-10 text-center text-sm text-muted-foreground">Загрузка воронки...</div>
  }

  const activeDeal = stages?.flatMap((stage) => stage.deals).find((deal) => deal.id === activeId)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Воронка сделок</h1>
          <p className="text-muted-foreground">
            Перетаскивайте карточки между этапами. Попадание в «Выиграна» или «Проиграна» обновляет статус
            сделки.
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          Всего сделок: {stages?.reduce((sum, stage) => sum + stage.deals.length, 0) ?? 0}
        </div>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages?.map((stage) => (
            <StageColumn key={stage.id} stage={stage} disabled={!canWrite} />
          ))}
        </div>
        <DragOverlay>
          {activeDeal ? (
            <div className="w-72">
              <DealCardBody deal={activeDeal} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
