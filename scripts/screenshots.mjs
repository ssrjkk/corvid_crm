// Съёмка РЕАЛЬНЫХ экранов приложения для лендинга (public/screenshots).
// Запуск при поднятой npm run start на :3000: node scripts/screenshots.mjs
// Логин — демо-админ из scripts/seed-demo.mjs (test@corvid.dev).
// После пересъёмки проверь размеры PNG (в них заданы width/height в page.tsx).
import { chromium } from "@playwright/test"
import { readFileSync } from "node:fs"

const base = "http://localhost:3000"
const outDir = "public/screenshots"

function pngDims(file) {
  const b = readFileSync(file)
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }
}

const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
})
const page = await ctx.newPage()

await page.goto(`${base}/sign-in`)
await page.getByPlaceholder("Email").fill("test@corvid.dev")
await page.getByPlaceholder("Пароль").fill("Test12345!")
await page.getByRole("button", { name: "Войти" }).click()
await page.waitForURL("**/dashboard")

// 1. Воронка (/pipeline) — канбан
await page.goto(`${base}/pipeline`)
await page.waitForLoadState("networkidle")
await page.getByText("Переговоры").first().waitFor({ timeout: 15000 }).catch(() => {})
await page.waitForTimeout(400)
await page.screenshot({ path: `${outDir}/pipeline.png`, fullPage: true })

// 2. Дашборд — сводка + графики
await page.goto(`${base}/dashboard`)
await page.locator("svg.recharts-surface").first().waitFor({ timeout: 15000 })
await page.waitForTimeout(400)
await page.screenshot({ path: `${outDir}/dashboard.png`, fullPage: true })

// 3. Счёт INV-0001 — печатная форма
await page.goto(`${base}/invoices`)
await page.getByText("INV-0001").first().click()
await page.getByText("Позиции счёта").waitFor({ timeout: 15000 })
await page.waitForTimeout(400)
await page.screenshot({ path: `${outDir}/invoice.png`, fullPage: true })

await browser.close()
for (const f of ["pipeline", "dashboard", "invoice"]) {
  const p = `${outDir}/${f}.png`
  const { w, h } = pngDims(p)
  const kb = Math.round(readFileSync(p).length / 1024)
  console.log(`${f}.png ${w}x${h} ${kb}KB`)
}
