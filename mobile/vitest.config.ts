import path from "node:path";
import { defineConfig } from "vitest/config";

// Pure logic only (store, copy, progress). Screens are checked in the browser preview.
export default defineConfig({
  resolve: {
    alias: {
      "@web": path.resolve(__dirname, "../src/lib"),
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: { include: ["src/**/*.test.ts"], environment: "node" },
});
