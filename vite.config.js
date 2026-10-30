import { defineConfig } from "vite";

export default defineConfig({
  // Relative asset URLs, so the built dist/ folder works wherever it is uploaded.
  base: "./",
  build: {
    // three.js alone is ~540 kB minified; it lives in its own long-cached chunk.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: { three: ["three"] },
      },
    },
  },
});
