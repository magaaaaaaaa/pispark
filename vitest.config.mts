import { defineConfig } from "vitest/config";
import path from "node:path";

const root = import.meta.dirname;

export default defineConfig({
  test: { include: ["tests/**/*.test.ts"], environment: "node" },
  resolve: {
    alias: {
      // Next's build-time guard; meaningless under the test runner.
      "server-only": path.join(root, "tests/stubs/empty.ts"),
      "@": root,
    },
  },
});
