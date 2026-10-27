import { defineConfig } from 'vite';

// ZeroGame portalının altında /games/zeroshoot/ olarak çalışması için base ayarı
export default defineConfig({
  base: '/games/zeroshoot/',
  server: {
    host: true,        // LAN erişimi
    port: 5173,
    strictPort: true,  // port meşgulse hata ver (adres sabit kalsın)
    proxy: {
      // ZeroGame backend'e (Fastify, 3001) skorsuz deneme isteği dahi aksın
      '/api': 'http://localhost:3001',
    },
  },
});
