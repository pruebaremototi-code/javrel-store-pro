/**
 * Polyfills de compatibilidad para navegadores móviles y equipos antiguos.
 *
 * Deben ejecutarse ANTES que cualquier otro módulo (main.jsx los importa en
 * primera posición). pdfjs-dist 4.x usa `Promise.withResolvers`, que no existe
 * en Safari < 17.4, Chrome < 119 ni en muchos WebViews Android. Sin este
 * polyfill, el bundle completo puede fallar al evaluarse y dejar la pantalla
 * en blanco antes de que React llegue a montar.
 */

// 1. Promise.withResolvers (pdfjs-dist 4.x, librerías modernas)
if (typeof Promise !== 'undefined' && typeof Promise.withResolvers !== 'function') {
  Promise.withResolvers = function withResolvers() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

// 2. structuredClone (pdfjs / workers en navegadores antiguos)
if (typeof globalThis !== 'undefined' && typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = function structuredCloneFallback(value) {
    if (value === undefined) return undefined;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return value;
    }
  };
}

// 3. Array.prototype.at (Safari 14 / Chrome 91)
if (typeof Array !== 'undefined' && typeof Array.prototype.at !== 'function') {
  // eslint-disable-next-line no-extend-native
  Object.defineProperty(Array.prototype, 'at', {
    value: function at(index) {
      const length = this.length >>> 0;
      let i = Math.trunc(Number(index) || 0);
      if (i < 0) i += length;
      if (i < 0 || i >= length) return undefined;
      return this[i];
    },
    writable: true,
    configurable: true,
  });
}

// 4. Object.hasOwn (Safari 15.3 / Chrome 92)
if (typeof Object !== 'undefined' && typeof Object.hasOwn !== 'function') {
  Object.hasOwn = function hasOwn(object, property) {
    return Object.prototype.hasOwnProperty.call(object, property);
  };
}

// 5. requestIdleCallback (Safari < 16.4)
if (typeof window !== 'undefined' && typeof window.requestIdleCallback !== 'function') {
  window.requestIdleCallback = function requestIdleCallbackFallback(callback) {
    return window.setTimeout(() => {
      callback({
        didTimeout: false,
        timeRemaining: () => 50,
      });
    }, 1);
  };
  window.cancelIdleCallback = function cancelIdleCallbackFallback(id) {
    window.clearTimeout(id);
  };
}

// 6. crypto.randomUUID (Safari < 15.4, WebViews y contextos no seguros)
if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID !== 'function') {
  try {
    Object.defineProperty(globalThis.crypto, 'randomUUID', {
      value: function randomUUIDFallback() {
        if (typeof globalThis.crypto.getRandomValues === 'function') {
          const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
          bytes[6] = (bytes[6] & 0x0f) | 0x40;
          bytes[8] = (bytes[8] & 0x3f) | 0x80;
          const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
          return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
            16,
            20
          )}-${hex.slice(20)}`;
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
      },
      writable: true,
      configurable: true,
    });
  } catch {
    // Algunos navegadores no permiten redefinir crypto: textUtils tiene respaldo.
  }
}
