export const dealStatusLabels: Record<string, string> = {
  OPEN: "Открыта",
  WON: "Выиграна",
  LOST: "Проиграна",
}

export const taskStatusLabels: Record<string, string> = {
  TODO: "К выполнению",
  IN_PROGRESS: "В работе",
  REVIEW: "На проверке",
  DONE: "Выполнено",
  CANCELLED: "Отменена",
}

export const priorityLabels: Record<string, string> = {
  LOW: "Низкий",
  MEDIUM: "Средний",
  HIGH: "Высокий",
  URGENT: "Срочный",
}

export const projectStatusLabels: Record<string, string> = {
  PLANNING: "Планирование",
  IN_PROGRESS: "В работе",
  REVIEW: "Проверка",
  COMPLETED: "Завершён",
  ON_HOLD: "Приостановлен",
  CANCELLED: "Отменён",
}

export const activityTypeLabels: Record<string, string> = {
  NOTE: "Заметка",
  CALL: "Звонок",
  EMAIL: "Письмо",
  MEETING: "Встреча",
  MESSAGE: "Сообщение",
  OTHER: "Другое",
}

export function formatDate(value?: Date | string | null) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value))
}

export function formatMoney(value: unknown, currency = "RUB") {
  const amount = Number(value || 0)
  if (currency === "RUB") {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount)
  }
  return `${amount.toLocaleString("ru-RU")} ${currency}`
}

export const invoiceStatusLabels: Record<string, string> = {
  DRAFT: "Черновик",
  SENT: "Выставлен",
  PAID: "Оплачен",
  CANCELLED: "Отменён",
}

// Единый источник семантики бейджей (мягкая заливка + текст того же тона).
// className === "" означает нейтральный статус → рендерить <Badge variant="secondary">.
export const SOFT_SUCCESS_BADGE =
  "border-transparent bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
export const SOFT_ERROR_BADGE = "border-transparent bg-destructive/15 text-destructive"
export const SOFT_WORK_BADGE = "border-transparent bg-primary/15 text-primary"
export const SOFT_WAIT_BADGE =
  "border-transparent bg-chart-4/20 text-amber-700 dark:text-amber-300"

export type BadgeSpec = { label: string; className: string }

// Тон приоритета задачи (текст, не бейдж): срочное — destructive, высокое — янтарь.
export function priorityToneClass(priority: string): string {
  if (priority === "URGENT") return "text-destructive"
  if (priority === "HIGH") return "text-chart-4"
  return "text-muted-foreground"
}

export function dealBadge(status: string): BadgeSpec {
  if (status === "WON") return { label: dealStatusLabels.WON, className: SOFT_SUCCESS_BADGE }
  if (status === "LOST") return { label: dealStatusLabels.LOST, className: SOFT_ERROR_BADGE }
  return { label: dealStatusLabels[status] ?? status, className: "" }
}

export function invoiceBadge(status: string): BadgeSpec {
  if (status === "PAID")
    return { label: invoiceStatusLabels.PAID, className: SOFT_SUCCESS_BADGE }
  if (status === "SENT")
    return { label: invoiceStatusLabels.SENT, className: SOFT_WORK_BADGE }
  if (status === "CANCELLED")
    return { label: invoiceStatusLabels.CANCELLED, className: SOFT_ERROR_BADGE }
  return { label: invoiceStatusLabels[status] ?? status, className: "" }
}

export function projectBadge(status: string): BadgeSpec {
  if (status === "COMPLETED")
    return { label: projectStatusLabels.COMPLETED, className: SOFT_SUCCESS_BADGE }
  if (status === "CANCELLED")
    return { label: projectStatusLabels.CANCELLED, className: SOFT_ERROR_BADGE }
  if (status === "IN_PROGRESS")
    return { label: projectStatusLabels.IN_PROGRESS, className: SOFT_WORK_BADGE }
  if (status === "REVIEW" || status === "ON_HOLD")
    return { label: projectStatusLabels[status] ?? status, className: SOFT_WAIT_BADGE }
  return { label: projectStatusLabels[status] ?? status, className: "" }
}

export function taskBadge(status: string): BadgeSpec {
  if (status === "DONE")
    return { label: taskStatusLabels.DONE, className: SOFT_SUCCESS_BADGE }
  if (status === "IN_PROGRESS")
    return { label: taskStatusLabels.IN_PROGRESS, className: SOFT_WORK_BADGE }
  if (status === "REVIEW")
    return { label: taskStatusLabels.REVIEW, className: SOFT_WAIT_BADGE }
  if (status === "CANCELLED")
    return { label: taskStatusLabels.CANCELLED, className: SOFT_ERROR_BADGE }
  return { label: taskStatusLabels[status] ?? status, className: "" }
}
