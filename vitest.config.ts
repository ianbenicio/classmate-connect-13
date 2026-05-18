// Vitest config standalone — vite.config.ts uses @lovable.dev preset which
// doesn't accept a `test` block, so vitest gets its own config file.
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // RLS smoke tests hit real Supabase — skip in unit run unless SUPABASE_TEST=1
    // Run with: SUPABASE_TEST=1 npx vitest run src/test/rls-smoke
    exclude: process.env.SUPABASE_TEST
      ? ["**/node_modules/**"]
      : ["**/node_modules/**", "src/test/rls-smoke/**"],
  },
});
