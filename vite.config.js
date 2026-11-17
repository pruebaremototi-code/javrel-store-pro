import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// -----------------------------------------------------------------------------
// Versión de build limpia: semver del package.json + commit corto de Git.
// En Vercel se usa VERCEL_GIT_COMMIT_SHA; en local se consulta git.
// -----------------------------------------------------------------------------
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

const resolveCommitSha = () => {
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    return process.env.VERCEL_GIT_COMMIT_SHA;
  }
  try {
    return execSync('git rev-parse HEAD', {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
  } catch {
    return 'local';
  }
};

const commitSha = resolveCommitSha();
const shortCommitSha = commitSha === 'local' ? 'local' : commitSha.slice(0, 7);
const appVersion = `${pkg.version}+${shortCommitSha}`;

// Middleware para soportar Serverless Functions (/api/send-otp) en entorno local de desarrollo Vite
function localApiDevPlugin() {
  return {
    name: 'local-api-dev-plugin',
    configureServer(server) {
      // Carga .env en process.env para que las Serverless Functions locales
      // puedan leer credenciales de servidor (MAGNIFIC_MCP_URL, MAGNIFIC_API_KEY...).
      const localEnv = loadEnv(server.config.mode, process.cwd(), '');
      for (const [key, value] of Object.entries(localEnv)) {
        if (process.env[key] === undefined) process.env[key] = value;
      }

      server.middlewares.use(async (req, res, next) => {
        const apiMatch = req.url?.match(/^\/api\/(magnific-search|web-image-search)/);
        if (apiMatch) {
          try {
            const parsedUrl = new URL(req.url, 'http://localhost');
            req.query = Object.fromEntries(parsedUrl.searchParams.entries());
            const apiFile =
              apiMatch[1] === 'web-image-search'
                ? 'web-image-search.js'
                : 'magnific-search.js';
            // Ruta absoluta: el config se ejecuta desde node_modules/.vite-temp,
            // así que un import relativo './api/...' no resolvería.
            const moduleUrl = pathToFileURL(resolve(process.cwd(), 'api', apiFile)).href;
            const { default: handler } = await import(moduleUrl);

            res.status = function (statusCode) {
              res.statusCode = statusCode;
              return res;
            };
            res.json = function (payload) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(payload));
              return res;
            };
            // Polyfill send() para modo proxy (envío de buffers binarios)
            if (!res.send) {
              res.send = function (data) {
                res.end(data);
                return res;
              };
            }

            await handler(req, res);
          } catch (handlerErr) {
            console.error('[Vite Local Magnific Search API Error]:', handlerErr);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: handlerErr.message }));
          }
          return;
        }

        if (req.url === '/api/admin-users' && req.method === 'POST') {
          try {
            let rawData = '';
            req.on('data', (chunk) => {
              rawData += chunk;
            });
            req.on('end', async () => {
              try {
                req.body = rawData ? JSON.parse(rawData) : {};
                const { default: handler } = await import('./api/admin-users.js');

                res.status = function (statusCode) {
                  res.statusCode = statusCode;
                  return res;
                };
                res.json = function (payload) {
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(payload));
                  return res;
                };

                await handler(req, res);
              } catch (handlerErr) {
                console.error('[Vite Local Admin Users API Error]:', handlerErr);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: handlerErr.message }));
              }
            });
          } catch (e) {
            next(e);
          }
          return;
        }

        if (req.url === '/api/wompi-webhook' && req.method === 'POST') {
          try {
            let rawData = '';
            req.on('data', (chunk) => {
              rawData += chunk;
            });
            req.on('end', async () => {
              try {
                req.body = rawData ? JSON.parse(rawData) : {};
                const { default: handler } = await import('./api/wompi-webhook.js');

                res.status = function (statusCode) {
                  res.statusCode = statusCode;
                  return res;
                };
                res.json = function (payload) {
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(payload));
                  return res;
                };

                await handler(req, res);
              } catch (handlerErr) {
                console.error('[Vite Local Wompi Webhook API Error]:', handlerErr);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: handlerErr.message }));
              }
            });
          } catch (e) {
            next(e);
          }
          return;
        }

        if (req.url === '/api/send-otp' && req.method === 'POST') {
          try {
            let rawData = '';
            req.on('data', (chunk) => {
              rawData += chunk;
            });
            req.on('end', async () => {
              try {
                req.body = rawData ? JSON.parse(rawData) : {};
                const { default: handler } = await import('./api/send-otp.js');

                res.status = function (statusCode) {
                  res.statusCode = statusCode;
                  return res;
                };
                res.json = function (payload) {
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(payload));
                  return res;
                };

                await handler(req, res);
              } catch (handlerErr) {
                console.error('[Vite Local Dev API Error]:', handlerErr);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: handlerErr.message }));
              }
            });
          } catch (e) {
            next(e);
          }
          return;
        }
        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
    __APP_VERSION__: JSON.stringify(appVersion),
    __GIT_COMMIT__: JSON.stringify(shortCommitSha),
    __BUILD_TIMESTAMP__: JSON.stringify(Date.now()),
  },
  build: {
    // Hash de contenido nativo de Vite: sin sufijos manuales tipo "-v293".
    // Cada build genera nombres limpios del tipo assets/index-<hash>.js.
    manifest: true,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            if (id.includes('canvas-confetti')) {
              return 'vendor-confetti';
            }
          }
        },
      },
    },
  },
  plugins: [
    tailwindcss(),
    react(),
    localApiDevPlugin(),
  ],
});
