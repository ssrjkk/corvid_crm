import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { StatusBadge } from "@/components/status-badge"

describe("StatusBadge (единственная точка рендера)", () => {
  it("WON: soft-успех с лейблом, без сплошной заливки", () => {
    const html = renderToStaticMarkup(<StatusBadge kind="deal" status="WON" />)
    expect(html).toContain("Выиграна")
    expect(html).toContain("bg-emerald-500/15")
    expect(html).not.toContain("bg-green-600")
  })

  it("нейтральный статус: variant secondary, без тоновых классов", () => {
    const html = renderToStaticMarkup(<StatusBadge kind="deal" status="OPEN" />)
    expect(html).toContain("Открыта")
    expect(html).toContain("bg-secondary")
    expect(html).not.toContain("bg-emerald-500/15")
    expect(html).not.toContain("bg-destructive/15")
    expect(html).not.toContain("bg-primary/15")
  })

  it("invoice SENT: в работе через primary, project COMPLETED: успех", () => {
    const sent = renderToStaticMarkup(<StatusBadge kind="invoice" status="SENT" />)
    expect(sent).toContain("Выставлен")
    expect(sent).toContain("bg-primary/15")
    const done = renderToStaticMarkup(<StatusBadge kind="project" status="COMPLETED" />)
    expect(done).toContain("Завершён")
    expect(done).toContain("bg-emerald-500/15")
  })

  it("неизвестный статус: сырое значение + secondary", () => {
    const html = renderToStaticMarkup(<StatusBadge kind="task" status="NOPE" />)
    expect(html).toContain("NOPE")
    expect(html).toContain("bg-secondary")
  })
})
