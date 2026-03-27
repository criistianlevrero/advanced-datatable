import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig({
  plugins: [react()],
  root: fileURLToPath(new URL(".", import.meta.url)),
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
