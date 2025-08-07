import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  const isTesting = env.VITE_TESTING === 'true';
  const target = isTesting ? 'http://localhost:8080' : 'https://bbe-frc.com';
  
  console.log(`Vite config: TESTING=${env.VITE_TESTING}, target=${target}`);
  
  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': {
          target: target,
          changeOrigin: true,
        },
      },
    },
  };
})