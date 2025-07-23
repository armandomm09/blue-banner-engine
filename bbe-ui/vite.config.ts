import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // --- AÑADE ESTA SECCIÓN ---
    proxy: {
      // Cualquier petición que comience con '/api' será redirigida.
      '/api': {
        // Apunta a tu servidor de Go que corre en Docker.
        target: 'http://localhost:8080',
        // Necesario para que el servidor de destino no rechace la petición.
        changeOrigin: true,
        // Opcional: si quieres reescribir la ruta, pero en tu caso no es necesario.
        // rewrite: (path) => path.replace(/^\/api/, ''), 
      },
    },
  },
})