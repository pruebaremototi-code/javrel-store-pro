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

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
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
    const { default: App } = await import('./App.jsx');
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
