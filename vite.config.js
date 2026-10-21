import { defineConfig } from "vite";

export default defineConfig({
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
