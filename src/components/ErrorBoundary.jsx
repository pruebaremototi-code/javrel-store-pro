import React from 'react';

/**
 * ErrorBoundary global de JavrelStore.
 *
 * Captura cualquier excepción de render, ciclo de vida o efecto de React y
 * muestra una pantalla de recuperación en lugar de dejar el `#root` vacío
 * (White Screen of Death). No depende de Tailwind: usa estilos inline para
 * renderizar incluso si el CSS no cargó.
 */

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    background: 'linear-gradient(135deg, #f8fafc 0%, #eef4ff 45%, #e2e8f0 100%)',
    fontFamily:
      "'Instrument Sans', 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    color: '#0f172a',
  },
  card: {
    width: '100%',
    maxWidth: '620px',
    background: '#ffffff',
    borderRadius: '24px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 24px 70px rgba(15, 23, 42, 0.14)',
    padding: '32px',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    borderRadius: '999px',
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    color: '#0a6cff',
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  title: {
    margin: '18px 0 8px',
    fontSize: '26px',
    lineHeight: 1.2,
    fontWeight: 800,
    letterSpacing: '-0.02em',
  },
  text: {
    margin: '0 0 8px',
    fontSize: '14px',
    lineHeight: 1.65,
    color: '#475569',
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    marginTop: '22px',
  },
  primary: {
    appearance: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '12px 20px',
    borderRadius: '14px',
    background: '#0a6cff',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 800,
    boxShadow: '0 10px 24px rgba(10, 108, 255, 0.28)',
  },
  secondary: {
    appearance: 'none',
    cursor: 'pointer',
    padding: '12px 18px',
    borderRadius: '14px',
    background: '#ffffff',
    color: '#334155',
    fontSize: '13px',
    fontWeight: 700,
    border: '1px solid #cbd5e1',
  },
  danger: {
    appearance: 'none',
    cursor: 'pointer',
    padding: '12px 18px',
    borderRadius: '14px',
    background: '#fff1f2',
    color: '#be123c',
    fontSize: '13px',
    fontWeight: 700,
    border: '1px solid #fecdd3',
  },
  details: {
    marginTop: '22px',
    padding: '14px 16px',
    borderRadius: '14px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    fontSize: '12px',
    color: '#475569',
  },
  pre: {
    margin: '10px 0 0',
    maxHeight: '180px',
    overflow: 'auto',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    fontFamily: "'Space Mono', Consolas, monospace",
    fontSize: '11px',
    color: '#334155',
  },
  hint: {
    marginTop: '16px',
    fontSize: '12px',
    color: '#64748b',
  },
};

const clearAppStorage = () => {
  try {
    const keys = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key) continue;
      if (/^(super_wow_|javrelstore_|sb-|supabase)/i.test(key)) keys.push(key);
    }
    keys.forEach((key) => window.localStorage.removeItem(key));
    window.sessionStorage.clear();
  } catch {
    // Almacenamiento bloqueado por el navegador: continuar con la recarga.
  }

  try {
    if (typeof window.caches !== 'undefined' && window.caches?.keys) {
      window.caches.keys().then((names) => Promise.all(names.map((name) => window.caches.delete(name))));
    }
  } catch {
    // Sin Cache API: continuar.
  }
};

const RecoveryScreen = ({ error }) => {
  const message =
    (error && (error.message || String(error))) ||
    'Se produjo un error inesperado durante la carga de la aplicación.';

  return (
    <div style={styles.page}>
      <div style={styles.card} role="alert" aria-live="assertive">
        <span style={styles.badge}>JavrelStore · Recuperación</span>

        <h1 style={styles.title}>No pudimos mostrar la tienda</h1>
        <p style={styles.text}>
          Detectamos un error inesperado y lo aislamos para proteger tus datos. Puedes
          reintentar la carga; si el problema continúa, restablece únicamente los datos
          locales de la aplicación.
        </p>

        <div style={styles.actions}>
          <button
            type="button"
            style={styles.primary}
            onClick={() => window.location.reload()}
          >
            Reintentar ahora
          </button>

          <button
            type="button"
            style={styles.secondary}
            onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.set('_r', String(Date.now()));
              window.location.replace(url.toString());
            }}
          >
            Recargar sin caché
          </button>

          <button
            type="button"
            style={styles.danger}
            onClick={() => {
              const confirmed = window.confirm(
                'Esto borrará el carrito, la sesión administrativa y la caché local de JavrelStore en este dispositivo. Los productos seguirán guardados en Supabase. ¿Continuar?'
              );
              if (!confirmed) return;
              clearAppStorage();
              window.location.replace(window.location.pathname);
            }}
          >
            Restablecer datos locales
          </button>
        </div>

        <details style={styles.details}>
          <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
            Detalle técnico del error
          </summary>
          <pre style={styles.pre}>{message}</pre>
          {error?.stack ? <pre style={styles.pre}>{String(error.stack).slice(0, 4000)}</pre> : null}
        </details>

        <p style={styles.hint}>
          Si el problema persiste, comparte este detalle con soporte para corregirlo en
          minutos. Ningún pedido ni producto se pierde al recargar.
        </p>
      </div>
    </div>
  );
};

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Registro local para diagnóstico; nunca se muestra al comprador sin formato.
    console.error('[JavrelStore][ErrorBoundary] Error no controlado:', error, errorInfo);
    try {
      const key = 'javrelstore_last_runtime_error';
      window.localStorage.setItem(
        key,
        JSON.stringify({
          message: error?.message || String(error),
          stack: String(error?.stack || '').slice(0, 4000),
          componentStack: String(errorInfo?.componentStack || '').slice(0, 4000),
          at: new Date().toISOString(),
          url: window.location.href,
        })
      );
    } catch {
      // Sin almacenamiento disponible: continuar.
    }
  }

  render() {
    if (this.state.hasError) {
      return <RecoveryScreen error={this.state.error} />;
    }
    return this.props.children;
  }
}

/** Pantalla de error para fallos de importación/módulo antes de montar React. */
export const FatalErrorScreen = ({ error }) => <RecoveryScreen error={error} />;

export default ErrorBoundary;
