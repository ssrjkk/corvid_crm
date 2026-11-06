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
  return `${Number(value || 0).toLocaleString("ru-RU")} ${currency}`
}

export const invoiceStatusLabels: Record<string, string> = {
  DRAFT: "Черновик",
  SENT: "Выставлен",
  PAID: "Оплачен",
  CANCELLED: "Отменён",
}
