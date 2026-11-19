import type { CustomEntityType, CustomFieldType } from "@/generated/prisma/client"

/**
 * V36 «Пресеты бизнеса»: один клик превращает пустую установку в рабочий
 * процесс отрасли. Пресет — это ТОЛЬКО определения (этапы + поля), без
 * выдуманных сделок, компаний и контактов. Применение аддитивное:
 * существующие этапы/поля с теми же именами пропускаются, ничего не
 * переименовывается и не удаляется (см. server/routers/presets.ts).
 *
 * Модуль чистый: его импортирует и клиент (превью в Настройках), и сервер
 * (валидация + запись). Никаких обращений к БД здесь нет.
 *
 * Цвета этапов — данные пользователя, а не UI-хардкод: хранятся hex, потому
 * что <input type="color"> принимает только hex (задокументированное
 * исключение дизайн-системы).
 */

export type PresetField = {
  entityType: CustomEntityType
  label: string
  type: CustomFieldType
  /** Только для SELECT: непустой список вариантов. */
  options?: readonly string[]
}

export type BusinessPreset = {
  id: string
  name: string
  /** Одна строка: кому и зачем подходит. */
  tagline: string
  stages: readonly { name: string; color: string }[]
  fields: readonly PresetField[]
}

export const businessPresets = [
  {
    id: "universal",
    name: "Универсальный",
    tagline: "Базовая воронка продаж для любого бизнеса — без отраслевых полей.",
    stages: [
      { name: "Новая", color: "#94a3b8" },
      { name: "Переговоры", color: "#3b82f6" },
      { name: "Договор", color: "#f59e0b" },
      { name: "Выиграна", color: "#10b981" },
      { name: "Проиграна", color: "#ef4444" },
    ],
    fields: [],
  },
  {
    id: "agency",
    name: "Агентство / студия",
    tagline: "Заявка → бриф → смета → работа → сдача. Источник заявки и срок сдачи.",
    stages: [
      { name: "Заявка", color: "#94a3b8" },
      { name: "Бриф", color: "#3b82f6" },
      { name: "Смета", color: "#f59e0b" },
      { name: "В работе", color: "#14b8a6" },
      { name: "Сдача", color: "#0ea5e9" },
      { name: "Закрыта", color: "#10b981" },
    ],
    fields: [
      {
        entityType: "DEAL",
        label: "Источник заявки",
        type: "SELECT",
        options: ["Сайт", "Рекомендация", "Соцсети", "Повторный клиент"],
      },
      { entityType: "DEAL", label: "Срок сдачи", type: "DATE" },
      { entityType: "COMPANY", label: "ИНН", type: "TEXT" },
    ],
  },
  {
    id: "realty",
    name: "Недвижимость",
    tagline: "Заявка → показ → бронь → сделка. Объект, площадь и адрес — в карточке.",
    stages: [
      { name: "Заявка", color: "#94a3b8" },
      { name: "Показ", color: "#3b82f6" },
      { name: "Бронь", color: "#f59e0b" },
      { name: "Сделка", color: "#14b8a6" },
      { name: "Закрыта", color: "#10b981" },
    ],
    fields: [
      {
        entityType: "DEAL",
        label: "Тип объекта",
        type: "SELECT",
        options: ["Квартира", "Дом", "Коммерция"],
      },
      { entityType: "DEAL", label: "Площадь, м²", type: "NUMBER" },
      { entityType: "DEAL", label: "Адрес объекта", type: "TEXT" },
    ],
  },
  {
    id: "autoservice",
    name: "Автосервис",
    tagline: "Заявка → диагностика → согласование → ремонт → выдача. Авто и пробег под рукой.",
    stages: [
      { name: "Заявка", color: "#94a3b8" },
      { name: "Диагностика", color: "#3b82f6" },
      { name: "Согласование", color: "#f59e0b" },
      { name: "Ремонт", color: "#14b8a6" },
      { name: "Выдача", color: "#10b981" },
    ],
    fields: [
      { entityType: "DEAL", label: "Автомобиль", type: "TEXT" },
      { entityType: "DEAL", label: "Госномер", type: "TEXT" },
      { entityType: "DEAL", label: "Пробег, км", type: "NUMBER" },
    ],
  },
  {
    id: "consulting",
    name: "Консалтинг / фриланс",
    tagline: "Лид → квалификация → предложение → договор → оплата. Формат и часы проекта.",
    stages: [
      { name: "Лид", color: "#94a3b8" },
      { name: "Квалификация", color: "#3b82f6" },
      { name: "Предложение", color: "#f59e0b" },
      { name: "Договор", color: "#14b8a6" },
      { name: "Оплата", color: "#10b981" },
    ],
    fields: [
      {
        entityType: "DEAL",
        label: "Формат работы",
        type: "SELECT",
        options: ["Стратегия", "Аудит", "Сопровождение"],
      },
      { entityType: "DEAL", label: "Часов в проекте", type: "NUMBER" },
    ],
  },
] as const satisfies readonly BusinessPreset[]

export type BusinessPresetId = (typeof businessPresets)[number]["id"]

/** Поиск по строке из tRPC-входа: неизвестный id → undefined (не 500). */
export function findBusinessPreset(id: string): BusinessPreset | undefined {
  return businessPresets.find((preset) => preset.id === id)
}
