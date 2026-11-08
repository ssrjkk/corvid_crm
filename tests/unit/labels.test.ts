import { describe, expect, it } from "vitest"
import {
  SOFT_ERROR_BADGE,
  SOFT_SUCCESS_BADGE,
  SOFT_WAIT_BADGE,
  SOFT_WORK_BADGE,
  dealBadge,
  formatDate,
  formatMoney,
  invoiceBadge,
  projectBadge,
  priorityToneClass,
  taskBadge,
} from "@/lib/labels"
import { cn } from "@/lib/utils"

describe("status badge mapping (единый источник)", () => {
  it("deal: WON успех, LOST ошибка, остальное нейтраль", () => {
    expect(dealBadge("WON")).toEqual({ label: "Выиграна", className: SOFT_SUCCESS_BADGE })
    expect(dealBadge("LOST")).toEqual({ label: "Проиграна", className: SOFT_ERROR_BADGE })
    expect(dealBadge("OPEN")).toEqual({ label: "Открыта", className: "" })
    expect(dealBadge("NOPE")).toEqual({ label: "NOPE", className: "" })
  })

  it("invoice: PAID успех, SENT в работе, CANCELLED ошибка", () => {
    expect(invoiceBadge("PAID").className).toBe(SOFT_SUCCESS_BADGE)
    expect(invoiceBadge("SENT")).toEqual({ label: "Выставлен", className: SOFT_WORK_BADGE })
    expect(invoiceBadge("CANCELLED").className).toBe(SOFT_ERROR_BADGE)
    expect(invoiceBadge("DRAFT")).toEqual({ label: "Черновик", className: "" })
  })

  it("project: COMPLETED успех, IN_PROGRESS в работе, REVIEW/ON_HOLD ожидание", () => {
    expect(projectBadge("COMPLETED").className).toBe(SOFT_SUCCESS_BADGE)
    expect(projectBadge("IN_PROGRESS").className).toBe(SOFT_WORK_BADGE)
    expect(projectBadge("REVIEW").className).toBe(SOFT_WAIT_BADGE)
    expect(projectBadge("ON_HOLD").className).toBe(SOFT_WAIT_BADGE)
    expect(projectBadge("CANCELLED").className).toBe(SOFT_ERROR_BADGE)
    expect(projectBadge("PLANNING")).toEqual({ label: "Планирование", className: "" })
  })

  it("task: DONE успех, REVIEW ожидание, неизвестный нейтраль", () => {
    expect(taskBadge("DONE").className).toBe(SOFT_SUCCESS_BADGE)
    expect(taskBadge("IN_PROGRESS").className).toBe(SOFT_WORK_BADGE)
    expect(taskBadge("REVIEW").className).toBe(SOFT_WAIT_BADGE)
    expect(taskBadge("CANCELLED").className).toBe(SOFT_ERROR_BADGE)
    expect(taskBadge("TODO")).toEqual({ label: "К выполнению", className: "" })
  })

  it("priorityToneClass: URGENT destructive, HIGH янтарь, остальное muted", () => {
    expect(priorityToneClass("URGENT")).toBe("text-destructive")
    expect(priorityToneClass("HIGH")).toBe("text-chart-4")
    expect(priorityToneClass("MEDIUM")).toBe("text-muted-foreground")
    expect(priorityToneClass("LOW")).toBe("text-muted-foreground")
    expect(priorityToneClass("NOPE")).toBe("text-muted-foreground")
  })
})

describe("formatMoney", () => {
  it("форматирует 0 без значения", () => {
    expect(formatMoney(null)).toMatch(/^0[\s\u00A0]₽$/)
    expect(formatMoney(undefined)).toMatch(/^0[\s\u00A0]₽$/)
    expect(formatMoney(0)).toMatch(/^0[\s\u00A0]₽$/)
  })

  it("форматирует сумму с разделителями", () => {
    expect(formatMoney(125000)).toMatch(/125[\s\u00A0]000\s₽/)
  })

  it("поддерживает дробные суммы и другие валюты", () => {
    expect(formatMoney(99.5, "USD")).toMatch(/99,5 USD/)
  })

  it("принимает строковое значение (как из Decimal)", () => {
    expect(formatMoney("450000")).toMatch(/450[\s\u00A0]000\s₽/)
  })
})

describe("formatDate", () => {
  it("пустое значение — прочерк", () => {
    expect(formatDate(null)).toBe("—")
    expect(formatDate(undefined)).toBe("—")
  })

  it("форматирует дату в ru-локали dd.mm.yyyy", () => {
    expect(formatDate(new Date("2026-11-06T12:00:00Z"))).toBe("06.11.2026")
  })

  it("принимает строку", () => {
    expect(formatDate("2026-01-15T00:00:00Z")).toBe("15.01.2026")
  })
})

describe("cn", () => {
  it("склеивает классы и игнорирует ложные значения", () => {
    expect(cn("a", false && "b", undefined, "c")).toBe("a c")
  })

  it("поздние классы побеждают по конфликтам (tailwind-merge)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4")
  })
})
