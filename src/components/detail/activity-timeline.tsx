import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { activityTypeLabels } from "@/lib/labels"

type TimelineActivity = {
  id: string
  type: string
  title?: string | null
  content: string
  createdAt: Date | string
  user?: { name?: string | null } | null
  deal?: { id: string; title: string } | null
}

export function ActivityTimeline({ activities }: { activities: TimelineActivity[] }) {
  if (activities.length === 0) {
    return <p className="text-sm text-muted-foreground">Активностей пока нет</p>
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="relative border-l-2 border-primary/30 pl-4 pb-4 last:pb-0">
          <span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-primary" />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{activityTypeLabels[activity.type] ?? activity.type}</Badge>
              {activity.title && <span className="text-sm font-medium">{activity.title}</span>}
            </div>
            <span className="text-xs text-muted-foreground">
              {format(new Date(activity.createdAt), "dd MMM yyyy, HH:mm", { locale: ru })}
            </span>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{activity.content}</p>
          {(activity.user || activity.deal) && (
            <div className="mt-1 text-xs text-muted-foreground">
              {activity.user?.name && <>Автор: {activity.user.name}</>}
              {activity.user?.name && activity.deal && " · "}
              {activity.deal && <>Сделка: {activity.deal.title}</>}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
