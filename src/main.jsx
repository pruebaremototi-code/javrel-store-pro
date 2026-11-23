import './polyfills';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { ErrorBoundary, FatalErrorScreen } from './components/ErrorBoundary';

const container = document.getElementById('root');

// Diagnóstico global: guarda el último error de runtime para soporte sin
// interrumpir la experiencia del comprador.
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (!event?.message) return;
    try {
      window.localStorage.setItem(
        'javrelstore_last_runtime_error',
        JSON.stringify({
          message: event.message,
          source: event.filename || '',
          line: event.lineno || 0,
          column: event.colno || 0,
          at: new Date().toISOString(),
          url: window.location.href,
        })
      );
    } catch {
      // Sin almacenamiento: continuar.
    }
  });

  // Manejo proactivo de Vite: cuando un chunk dinámico devuelve 404 por un nuevo despliegue en Vercel
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    console.warn('[JavrelStore] Detectado vite:preloadError (chunk 404). Recargando aplicación...');
    const reloadKey = 'javrel_vite_preload_reload';
    const lastReload = sessionStorage.getItem(reloadKey);
    const now = Date.now();
    if (!lastReload || now - Number(lastReload) > 15000) {
      try {
        sessionStorage.setItem(reloadKey, String(now));
      } catch {}
      window.location.reload();
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
    const msg = String(reason?.message || reason || '');
    if (/Failed to fetch dynamically imported module/i.test(msg) || /error loading dynamically imported module/i.test(msg)) {
      const reloadKey = 'javrel_chunk_unhandled_reload';
      const last = sessionStorage.getItem(reloadKey);
      const now = Date.now();
      if (!last || now - Number(last) > 15000) {
        try {
          sessionStorage.setItem(reloadKey, String(now));
        } catch {}
        console.info('[JavrelStore] Recargando por rechazo de chunk dinámico desactualizado...');
        window.location.reload();
        return;
      }
    }
    console.error('[JavrelStore] Promesa rechazada sin manejar:', reason);
    try {
      window.localStorage.setItem(
        'javrelstore_last_runtime_error',
        JSON.stringify({
          message: reason?.message || String(reason || 'Unhandled rejection'),
          stack: String(reason?.stack || '').slice(0, 4000),
          at: new Date().toISOString(),
          url: window.location.href,
        })
      );
    } catch {
      // Sin almacenamiento: continuar.
    }
  });
}

async function bootstrap() {
  if (!container) {
    console.error('[JavrelStore] No se encontró el contenedor #root.');
    return;
  }

  const root = createRoot(container);

  try {
    // Import dinámico: si un módulo falla al evaluarse (por ejemplo, una API
    // moderna no soportada por el navegador), mostramos una pantalla de
    // recuperación en lugar de dejar el div #root completamente vacío.
    let App;
    try {
      const module = await import('./App.jsx');
      App = module.default;
    } catch (importErr) {
      const errStr = String(importErr?.message || '');
      if (/Failed to fetch dynamically imported module/i.test(errStr)) {
        const reloadKey = 'javrel_bootstrap_reload';
        const last = sessionStorage.getItem(reloadKey);
        const now = Date.now();
        if (!last || now - Number(last) > 15000) {
          try {
            sessionStorage.setItem(reloadKey, String(now));
          } catch {}
          window.location.reload();
          return;
        }
      }
      throw importErr;
    }

    container.setAttribute('data-react-mounted', '1');
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>
    );
  } catch (error) {
    console.error('[JavrelStore] Fallo al cargar el módulo principal:', error);
    container.setAttribute('data-react-mounted', '1');
    root.render(
      <StrictMode>
        <FatalErrorScreen error={error} />
      </StrictMode>
    );
  }
}

bootstrap();
