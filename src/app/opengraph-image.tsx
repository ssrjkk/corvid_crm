import { readFile } from "node:fs/promises"
import path from "node:path"
import { ImageResponse } from "next/og"

/**
 * OG-визитка (V30 «Визитка»): бренд-карточка для соцсетей и мессенджеров.
 * Рендерится next/og (satori) в статический /opengraph-image на билде.
 * Шрифт — брендовый Manrope 800 в формате TTF (vendored в public/fonts,
 * OFL-лицензия рядом): fontkit в рантайме next/og не читает woff2
 * («Unsupported OpenType signature wOF2»), TTF отдаёт CSS API Google Fonts
 * по легаси User-Agent. Точные копии токенов тёмной темы:
 *   --background oklch(0.155 0.008 285) = #0C0C10
 *   --primary    oklch(0.67 0.17 285)  = #8D82F8
 *   --foreground oklch(0.96 0.005 285) = #F1F1F5
 *   --muted-foreground oklch(0.7 0.015 285) = #9D9DA8
 * Текст — только латиница: русские заголовки отдаёт og:title из metadata,
 * это обычный HTML.
 */
export const alt = "Corvid — CRM для фриланса"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function OpengraphImage() {
  const manrope = await readFile(
    path.join(process.cwd(), "public", "fonts", "manrope-latin-800.ttf")
  )

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          background: "#0C0C10",
          overflow: "hidden",
        }}
      >
        {/* Фейковое радиальное свечение: концентрические круги без filter (satori) */}
        <div
          style={{
            position: "absolute",
            width: 1400,
            height: 900,
            top: -560,
            borderRadius: 9999,
            background: "rgba(141,130,248,0.07)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 760,
            height: 520,
            top: -370,
            borderRadius: 9999,
            background: "rgba(141,130,248,0.09)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 400,
            height: 300,
            top: -250,
            borderRadius: 9999,
            background: "rgba(141,130,248,0.13)",
            display: "flex",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 84,
              height: 6,
              borderRadius: 9999,
              background: "#8D82F8",
              marginBottom: 44,
              display: "flex",
            }}
          />
          <div
            style={{
              fontFamily: "Manrope",
              fontWeight: 800,
              fontSize: 176,
              letterSpacing: -6,
              color: "#F1F1F5",
              display: "flex",
            }}
          >
            Corvid
          </div>
          <div
            style={{
              fontFamily: "Manrope",
              fontWeight: 800,
              marginTop: 30,
              fontSize: 30,
              letterSpacing: 14,
              color: "#9D9DA8",
              display: "flex",
            }}
          >
            CRM · KANBAN · INVOICES · TASKS
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 44,
            left: 64,
            right: 64,
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "Manrope",
            fontWeight: 800,
            fontSize: 24,
            letterSpacing: 3,
            color: "#9D9DA8",
          }}
        >
          <div style={{ display: "flex" }}>CORVID CRM</div>
          <div style={{ display: "flex" }}>GITHUB.COM/SSRJKK/CORVID_CRM</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Manrope", data: manrope, weight: 800, style: "normal" }],
    }
  )
}
