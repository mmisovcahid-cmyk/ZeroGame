import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:3001',
      // ZeroShoot geliştirme sunucusu (ayrı vite projesi, port 5173)
      '/games/zeroshoot': {
        target: 'http://localhost:5173',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/games\/zeroshoot/, '') || '/',
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
