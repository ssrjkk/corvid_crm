import type { NextConfig } from "next";

// CSP без nonce — по официальному гайду Next 16 (content-security-policy.md):
// nonce-вариант требует динамического рендера ВСЕХ страниц и НЕСОВМЕСТИМ
// с Cache Components/PPR (у нас статика + partial prerender).
// Experimental SRI добавляет integrity-хеши вместо nonce, сохраняя статику.
const isDev = process.env.NODE_ENV === "development";

const csp = [
  "default-src 'self'",
  // SRI добавил integrity на внешние чанки, но inline-скрипты гидрации Next
  // остаются inline (проверено пробой HTML: 11 inline-скриптов) — без nonce
  // их можно разрешить только 'unsafe-inline' (документированный fallback
  // гайда для статических/PPR-приложений). React экранирует вывод,
  // dangerouslySetInnerHTML в src нет — inline-XSS поверхность минимальна.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  // 'unsafe-inline' для стилей: recharts/sonner ставят style-атрибуты (низкий риск)
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    sri: {
      algorithm: "sha256",
    },
  },
  // Заголовки безопасности: clickjacking, MIME-sniffing, утечка referer,
  // лишние браузерные API, XSS-инъекция скриптов.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
