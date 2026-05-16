// @lovable.dev/vite-tanstack-config already includes tanstackStart, viteReact, tailwindcss,
// tsConfigPaths, componentTagger (dev-only), VITE_* env injection, @ path alias, etc.
// cloudflare: false → builds for Node.js (Railway). server-railway.mjs wraps the output.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  cloudflare: false,
  tanstackStart: { server: { entry: "server" } },
});
