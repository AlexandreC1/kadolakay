import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    // The native Windows QR/font renderer crashes under concurrent worker load.
    // Preserve every assertion while bounding local native-memory/thread pressure.
    maxWorkers: process.platform === "win32" ? 1 : 2,
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    coverage: {
      reporter: ["text", "html"],
      include: ["src/lib/**", "src/actions/**"],
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
