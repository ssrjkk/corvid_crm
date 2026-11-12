"use client"

import { useEffect } from "react"

/**
 * Последний рубеж: краш самого root-layout (когда error.tsx бессилен).
 * Полностью заменяет <html>, поэтому разметка минимальна и самодостаточна.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="ru" suppressHydrationWarning>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "oklch(0.145 0 0)",
          color: "oklch(0.985 0 0)",
        }}
      >
        <div style={{ textAlign: "center", padding: "24px" }}>
          <h1 style={{ fontSize: "20px", fontWeight: 600, margin: "0 0 8px" }}>
            Что-то сломалось
          </h1>
          <p style={{ fontSize: "14px", opacity: 0.7, margin: "0 0 16px" }}>
            Критическая ошибка приложения.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: "oklch(0.55 0.2 285)",
              color: "white",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Попробовать снова
          </button>
        </div>
      </body>
    </html>
  )
}
