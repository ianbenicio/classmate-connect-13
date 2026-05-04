// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Disable Cloudflare adapter — we deploy on Vercel as static SPA.
  cloudflare: false,
  // Build as a Single Page Application (no SSR server required).
  // Generates a static index.html that Vercel serves directly.
  tanstackStart: {
    spa: {
      enabled: true,
    },
  },
});
