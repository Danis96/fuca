import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import crypto from 'node:crypto';

function imagekitAuthPlugin(privateKey: string): Plugin {
  return {
    name: 'imagekit-auth-dev',
    configureServer(server) {
      server.middlewares.use('/api/imagekit-auth', (_req, res) => {
        if (!privateKey) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'ImageKit private key not configured' }));
          return;
        }
        const token = crypto.randomUUID();
        const expire = Math.floor(Date.now() / 1000) + 60 * 10;
        const signature = crypto
          .createHmac('sha1', privateKey)
          .update(token + expire)
          .digest('hex');
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ token, expire, signature }));
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss(), imagekitAuthPlugin(env.private_key)],
  };
});
