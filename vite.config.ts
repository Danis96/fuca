import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import crypto from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

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

function readJsonBody(req: IncomingMessage) {
  return new Promise<any>((resolve, reject) => {
    const chunks: Buffer[] = [];

    req.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });

    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, statusCode: number, body: Record<string, unknown>) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function emailDevPlugin(): Plugin {
  const routes = new Set([
    '/api/send-match-schedule',
    '/api/send-team-assignment',
    '/api/send-match-reminder',
    '/api/send-match-recap',
  ]);

  return {
    name: 'email-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !routes.has(req.url)) {
          next();
          return;
        }

        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }

        try {
          const payload = await readJsonBody(req);
          const recipients = Array.isArray(payload?.recipients)
            ? payload.recipients
            : Array.isArray(payload?.manual?.recipients)
            ? payload.manual.recipients
            : [];

          const validRecipients = recipients.filter((recipient: any) => recipient?.email?.trim());
          const skippedCount = recipients.length - validRecipients.length;

          sendJson(res, 200, {
            sentCount: validRecipients.length,
            skippedCount,
            mode: 'dev-mock',
          });
        } catch {
          sendJson(res, 400, { error: 'Invalid JSON body' });
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss(), imagekitAuthPlugin(env.private_key), emailDevPlugin()],
  };
});
