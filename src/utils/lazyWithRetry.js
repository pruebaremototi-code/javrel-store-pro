import React from 'react';

/**
 * lazyWithRetry: Envuelve React.lazy para reintentar automáticamente la carga
 * cuando un chunk dinámico arroja error 404 tras un nuevo despliegue en Vercel.
 *
 * Utiliza un flag en sessionStorage con control de tiempo para evitar bucles
 * infinitos si la red del cliente falla persistentemente.
 */
export function lazyWithRetry(componentImport, componentName = 'Component') {
  return React.lazy(async () => {
    const sessionKey = `javrel_lazy_retry_${componentName}`;
    const lastRetry = sessionStorage.getItem(sessionKey);
    const now = Date.now();
    const hasRecentlyRetried = lastRetry && now - Number(lastRetry) < 15000;

    try {
      const module = await componentImport();
      // Si cargó exitosamente, limpiar el flag de reintento
      if (lastRetry) {
        try {
          sessionStorage.removeItem(sessionKey);
        } catch {}
      }
      return module;
    } catch (error) {
      console.warn(`[JavrelStore] Error cargando chunk dinámico (${componentName}):`, error);

      const errorMessage = String(error?.message || '');
      const isChunkLoadError =
        error?.name === 'ChunkLoadError' ||
        /Failed to fetch dynamically imported module/i.test(errorMessage) ||
        /error loading dynamically imported module/i.test(errorMessage) ||
        /Importing a module script failed/i.test(errorMessage) ||
        /Loading chunk [\w-]+ failed/i.test(errorMessage);

      if (isChunkLoadError && !hasRecentlyRetried) {
        try {
          sessionStorage.setItem(sessionKey, String(now));
        } catch {}

        console.info(`[JavrelStore] Nuevo despliegue detectado. Recargando para sincronizar chunks...`);
        // Recargar limpiamente la página para obtener el index.html actualizado
        window.location.reload();
        // Mantener la promesa en suspenso mientras el navegador recarga
        return new Promise(() => {});
      }

      // Si ya se intentó recargar recientemente o no es un error de chunk, propagar
      throw error;
    }
  });
}

export default lazyWithRetry;
