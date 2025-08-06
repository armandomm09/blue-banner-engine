import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  // Determine target based on TESTING environment variable
  const isTesting = env.VITE_TESTING === 'true';
  const target = isTesting ? 'http://localhost:8080' : 'http://159.54.136.121:8080';
  
  console.log(`Vite config: TESTING=${env.VITE_TESTING}, target=${target}`);
  
  return {
    plugins: [react(), tailwindcss()],
    server: {
      // --- AÑADE ESTA SECCIÓN ---
      proxy: {
        // Cualquier petición que comience con '/api' será redirigida.
        '/api': {
          // Apunta a tu servidor de Go que corre en Docker.
          target: target,
          // Necesario para que el servidor de destino no rechace la petición.
          changeOrigin: true,
          // Opcional: si quieres reescribir la ruta, pero en tu caso no es necesario.
          // rewrite: (path) => path.replace(/^\/api/, ''), 
        },
      },
    },
  };
})