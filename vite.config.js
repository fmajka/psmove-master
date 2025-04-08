import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true,  // Allows access from local network
    port: 5173,
    https: {
      key: './ssl/key.pem',
      cert: './ssl/cert.pem'
    },
    proxy: {
      '/api': 'http://localhost:3000', // Proxy API requests to Express
      '/ws': {
        target: 'ws://localhost:3000', // Proxy WebSocket connections
        ws: true
      }
    }
  }
});