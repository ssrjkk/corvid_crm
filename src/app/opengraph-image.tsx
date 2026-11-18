import { readFile } from "node:fs/promises"
import path from "node:path"
import { ImageResponse } from "next/og"

/**
 * OG-визитка (V30, перекрашена в V35 под айдентику «ворон на бумаге»):
 * бренд-карточка для соцсетей и мессенджеров. Рендерится next/og (satori)
 * в статический /opengraph-image на билде. Шрифт — брендовый Unbounded 600
 * (тот же, что в лендинге и docs/index.html), TTF vendored в public/fonts,
 * OFL-лицензия рядом: fontkit в рантайме next/og не читает woff2
 * («Unsupported OpenType signature wOF2»), TTF отдаёт CSS API Google Fonts
 * по легаси User-Agent (Android 2.2). Точные копии токенов тёмной темы:
 *   --background oklch(0.16 0.01 260)  = #0D0E12
 *   --primary    oklch(0.74 0.075 210) = #6FB2BC
 *   --foreground oklch(0.955 0.006 90) = #F2F1EA
 *   --muted-foreground oklch(0.7 0.014 260) = #9C9EA9
 * Текст — только латиница: русские заголовки отдаёт og:title из metadata,
 * это обычный HTML.
 */
export const alt = "Corvid — CRM для фриланса"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function OpengraphImage() {
  const unbounded = await readFile(
    path.join(process.cwd(), "public", "fonts", "unbounded-latin-600.ttf")
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
          background: "#0D0E12",
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
            background: "rgba(111,178,188,0.07)",
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
            background: "rgba(111,178,188,0.09)",
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
            background: "rgba(111,178,188,0.13)",
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
              background: "#6FB2BC",
              marginBottom: 44,
              display: "flex",
            }}
          />
          <div
            style={{
              fontFamily: "Unbounded",
              fontWeight: 600,
              fontSize: 168,
              letterSpacing: -4,
              color: "#F2F1EA",
              display: "flex",
            }}
          >
            Corvid
          </div>
          <div
            style={{
              fontFamily: "Unbounded",
              fontWeight: 600,
              marginTop: 34,
              fontSize: 27,
              letterSpacing: 12,
              color: "#9C9EA9",
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
            fontFamily: "Unbounded",
            fontWeight: 600,
            fontSize: 22,
            letterSpacing: 3,
            color: "#9C9EA9",
          }}
        >
          <div style={{ display: "flex" }}>CORVID CRM</div>
          <div style={{ display: "flex" }}>GITHUB.COM/SSRJKK/CORVID_CRM</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Unbounded", data: unbounded, weight: 600, style: "normal" }],
    }
  )
}
