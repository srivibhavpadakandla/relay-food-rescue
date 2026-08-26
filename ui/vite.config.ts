import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The UI is served by the same Cloud Run service that runs the agent, so in
// development we proxy /api to a locally running uvicorn.
export default defineConfig({
  plugins: [react()],
  build: { outDir: "../services/ui", emptyOutDir: true },
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://127.0.0.1:8080", changeOrigin: true },
      "/healthz": { target: "http://127.0.0.1:8080", changeOrigin: true },
    },
  },
});
