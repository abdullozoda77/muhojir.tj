import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Ports 5174 / 8001, so this runs next to the Rohat project (5173 / 8000). /api and /media go to Django, so the browser sees one address and CORS is not needed.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      "/api": "http://127.0.0.1:8001",
      "/media": "http://127.0.0.1:8001",
    },
  },
});
