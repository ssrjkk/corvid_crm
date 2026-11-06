import { defineConfig } from "vitest/config"
import path from "node:path"

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    // SQLite не любит параллельные записи из разных процессов — гоняем файлы по очереди.
    fileParallelism: false,
    globalSetup: "./tests/global-setup.ts",
    setupFiles: "./tests/setup.ts",
    testTimeout: 30000,
    // e2e/ — зона Playwright, не Vitest.
    exclude: ["**/node_modules/**", "e2e/**"],
  },
})
