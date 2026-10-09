import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const PORT = Number(process.env.FRONTEND_PORT ?? 3000);

// Le chiamate API passano dallo stesso origin HTTPS del frontend, evitando
// CORS e problemi di mixed content quando il backend gira in HTTP locale.
const apiProxy = {
  "/api": {
    target: `http://127.0.0.1:${process.env.BACKEND_PORT ?? 3001}`,
    changeOrigin: true,
  },
};

function httpsOptions() {
  const certPath = (file: string) =>
    fileURLToPath(new URL(`../../certs/${file}`, import.meta.url));

  return {
    key: readFileSync(certPath("unibin.key")),
    cert: readFileSync(certPath("unibin.crt")),
  };
}

export default defineConfig(({ command }) => {
  // `vite build` non ha bisogno di TLS: i certificati servono solo
  // a `vite` (dev) e `vite preview`.
  const https = command === "build" ? {} : { https: httpsOptions() };

  return {
    plugins: [react()],
    server: {
      host: true,
      port: PORT,
      strictPort: true,
      ...https,
      proxy: apiProxy,
    },
    preview: {
      host: true,
      port: PORT,
      strictPort: true,
      ...https,
      proxy: apiProxy,
    },
  };
});
