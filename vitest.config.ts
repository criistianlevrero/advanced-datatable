import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "coverage"
    }
  },
  resolve: {
    alias: {
      "@advanced-datatable/core": `${rootDir}/packages/core/src/index.ts`,
      "@advanced-datatable/operations": `${rootDir}/packages/operations/src/index.ts`,
      "@advanced-datatable/api-client": `${rootDir}/packages/api-client/src/index.ts`,
      "@advanced-datatable/store": `${rootDir}/packages/store/src/index.ts`,
      "@advanced-datatable/react": `${rootDir}/packages/react/src/index.ts`,
      "@advanced-datatable/ui": `${rootDir}/packages/ui/src/index.ts`
    }
  }
});
