import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// import mkcert from 'vite-plugin-mkcert';
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),tailwindcss()], // ,mkcert()],
  build: {
    // Augmente la limite de la taille des "chunks" à 1500 kB (1.5 MB)
    chunkSizeWarningLimit: 1500,
  },

  // commenter pour la production
  // server: {
  //   allowedHosts: ['05568c380717.ngrok-free.app'],
  //   host: true,
  //   port: 5173
  // },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})