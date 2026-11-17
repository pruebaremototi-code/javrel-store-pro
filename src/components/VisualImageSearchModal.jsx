import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Search,
  Sparkles,
  Upload,
  Check,
  RefreshCw,
  Image as ImageIcon,
  Link as LinkIcon,
  Zap,
  ArrowRight,
  FileCheck,
  Star,
  ExternalLink,
  Globe,
} from 'lucide-react';
import { webImageSearchService } from '../services/webImageSearchService';
import { imageOptimizer } from '../services/imageOptimizer';

// Placeholder SVG neutro para imágenes que fallan al cargar
const NEUTRAL_PLACEHOLDER_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect fill="%23FFFFFF" width="400" height="400"/><rect fill="%23F8FAFC" x="20" y="20" width="360" height="360" rx="24"/><text fill="%2394A3B8" font-family="sans-serif" font-size="16" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle">Sin imagen</text></svg>`;

export const VisualImageSearchModal = ({
  isOpen,
  onClose,
  initialQuery = '',
  category = 'computadores',
  productTitle = '',
  onSelectImage,
}) => {
  // Selector de 3 vías: 'search' | 'upload' | 'url'
  const [activeTab, setActiveTab] = useState('search');

  // Estados del Catálogo Nativo Pro
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [activeSourceFilter, setActiveSourceFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // ► Previsualización en tiempo real al hacer clic en tarjeta
  const [previewItem, setPreviewItem] = useState(null);

  // ► Set de URLs que fallaron → se ocultan de la grilla (sin íconos de cámara)
  const [failedUrls, setFailedUrls] = useState(new Set());

  // Estados de Vía 2: Subir desde PC (Drag & Drop)
  const [isDragOver, setIsDragOver] = useState(false);

  // Estados de Vía 3: Pegar URL Directa
  const [directUrlInput, setDirectUrlInput] = useState('');
  const [urlPreviewValid, setUrlPreviewValid] = useState(false);

  // Estados de Vía 4: Magnific Web Inmersivo (Live Proxy & Bridge)
  const [magnificWebQuery, setMagnificWebQuery] = useState('');
  const [magnificDirectInput, setMagnificDirectInput] = useState('');
  const [iframeKey, setIframeKey] = useState(1);

  // Motor efectivo de la última búsqueda (MCP oficial vs. respaldo silencioso)
  const [engineInfo, setEngineInfo] = useState({
    engine: 'idle',
    error: '',
  });

  const fileInputRef = useRef(null);
  const magnificIframeRef = useRef(null);

  // ─── Receptor PostMessage desde el Bridge de Magnific Web Inmersivo ───────
  useEffect(() => {
    if (!isOpen) return;

    const handleMessage = async (event) => {
      if (event.data && event.data.type === 'MAGNIFIC_IMAGE_SELECTED') {
        const { url, thumbUrl, title, source } = event.data;
        if (!url) return;
        setIsOptimizing(true);
        setStatusMessage(`Capturando imagen HD desde Magnific Web: ${title || 'Recurso'}...`);
        try {
          // `url` es la rendición HD; `thumbUrl` solo actúa como respaldo CORS.
          const optimized = await webImageSearchService.fetchAndCompressWebP(url, thumbUrl);
          if (onSelectImage) {
            onSelectImage(optimized.dataUrl, optimized.compressedSizeKb || 40, {
              title: title || searchTerm || productTitle || 'Producto Magnific',
              searchTerm: searchTerm || title || '',
              source: source || 'Magnific Web Inmersivo',
            });
          }
          onClose();
        } catch (err) {
          console.error('Error optimizando imagen de Magnific Web:', err);
          if (onSelectImage) {
            onSelectImage(url, 45, {
              title: title || searchTerm || productTitle || 'Producto Magnific',
              searchTerm: searchTerm || title || '',
              source: source || 'Magnific Web Inmersivo',
            });
          }
          onClose();
        } finally {
          setIsOptimizing(false);
          setStatusMessage('');
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isOpen, onSelectImage, onClose, searchTerm, productTitle]);

  // Búsqueda web de imágenes (declarada antes del efecto de inicialización
  // que la invoca al abrir el modal).
  const executeSearch = async (queryText, cat) => {
    setIsLoading(true);
    setPreviewItem(null);
    setFailedUrls(new Set()); // ← limpia errores de búsqueda anterior
    setStatusMessage('Buscando en bancos globales Web Pro (Openverse, Wikimedia, DDG, Bing)...');
    try {
      const imgs = await webImageSearchService.searchWebProImages(
        queryText ? queryText.trim() : '',
        cat,
        20
      );
      setResults(imgs);
      setEngineInfo({
        engine: webImageSearchService.lastEngine,
        error: webImageSearchService.lastError,
      });
    } catch (err) {
      console.warn('Error en búsqueda de imágenes:', err);
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  // ─── Inicialización ────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      const q = initialQuery || productTitle || '';
      setSearchTerm(q);
      setPreviewItem(null);
      setActiveTab('search');
      setFailedUrls(new Set());
      executeSearch(q, category);
      setDirectUrlInput('');
      setUrlPreviewValid(false);
      setMagnificWebQuery(q || 'repetidor wifi');
    }
  }, [isOpen, initialQuery, productTitle, category]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    executeSearch(searchTerm, category);
  };

  /**
   * Pipeline Canvas unificado:
   * - Fondo blanco sólido #FFFFFF
   * - Lienzo cuadrado 800×800 px con padding interno
   * - Compresión WebP (quality 0.85, < 50 KB)
   */
  const processImageToCleanWebP = async (source) => {
    return await imageOptimizer.compressToWebP(source, {
      maxWidth: 800,
      maxHeight: 800,
      initialQuality: 0.85,
      targetMaxKb: 50,
      forceSquare: true,
      backgroundColor: '#FFFFFF',
      padding: 24,
    });
  };

  // ─── VÍA 1A: Clic en tarjeta → muestra previsualización (sin procesar aún) ─
  const handleCardClick = (imgItem) => {
    if (isOptimizing) return;
    setPreviewItem(imgItem);
  };

  // ─── VÍA 1B: "Usar esta imagen" → Pipeline Canvas/WebP y cierre ────────────
  const handleConfirmPreview = async () => {
    if (!previewItem || isOptimizing) return;
    setIsOptimizing(true);
    setStatusMessage('Preprocesando en Canvas (fondo blanco #FFFFFF) → WebP ultraligero...');
    try {
      const optimized = await webImageSearchService.fetchAndCompressWebP(
        previewItem.url,
        previewItem.thumbUrl
      );
      if (onSelectImage) {
        onSelectImage(optimized.dataUrl, optimized.compressedSizeKb || 40, {
          title: previewItem.title || searchTerm || productTitle || 'Producto',
          searchTerm: searchTerm || '',
          source: previewItem.source || 'Catálogo Web Pro',
        });
      }
      onClose();
    } catch (err) {
      console.error('Error al optimizar imagen web:', err);
      if (onSelectImage) {
        onSelectImage(previewItem.thumbUrl || previewItem.url, 45, {
          title: previewItem.title || searchTerm || productTitle || 'Producto',
          searchTerm: searchTerm || '',
          source: previewItem.source || 'Catálogo Web Pro',
        });
      }
      onClose();
    } finally {
      setIsOptimizing(false);
      setStatusMessage('');
    }
  };

  // ─── VÍA 2: Subida desde Archivo Local (PC) ───────────────────────────────
  const handleProcessLocalFile = async (file) => {
    if (!file) return;
    setIsOptimizing(true);
    setStatusMessage('Preprocesando en Canvas → WebP 800x800px fondo blanco...');
    try {
      const res = await processImageToCleanWebP(file);
      const cleanFileName = file.name
        ? file.name.replace(/\.[a-zA-Z0-9]+$/, '').replace(/[_-]/g, ' ')
        : 'Producto';
      if (onSelectImage) {
        onSelectImage(res.dataUrl, res.compressedSizeKb, {
          title: cleanFileName,
          searchTerm: cleanFileName,
          source: 'Archivo Local PC',
        });
      }
      onClose();
    } catch (err) {
      console.warn('Error compresión local:', err);
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (onSelectImage) {
          onSelectImage(ev.target.result, 48, {
            title: 'Producto',
            searchTerm: '',
            source: 'Archivo Local PC',
          });
        }
        onClose();
      };
      reader.readAsDataURL(file);
    } finally {
      setIsOptimizing(false);
      setStatusMessage('');
    }
  };

  // ─── VÍA 3: Asignar imagen desde URL Directa ──────────────────────────────
  const handleProcessDirectUrl = async (e) => {
    e.preventDefault();
    if (!directUrlInput || !directUrlInput.trim()) return;
    setIsOptimizing(true);
    setStatusMessage('Descargando URL, preprocesando en Canvas → WebP...');
    try {
      const res = await processImageToCleanWebP(directUrlInput.trim());
      if (onSelectImage) onSelectImage(res.dataUrl, res.compressedSizeKb || 42);
      onClose();
    } catch (err) {
      console.warn('Fallback URL directa:', err);
      if (onSelectImage) onSelectImage(directUrlInput.trim(), 45);
      onClose();
    } finally {
      setIsOptimizing(false);
      setStatusMessage('');
    }
  };

  if (!isOpen) return null;

  // ─── Filtrado de resultados ────────────────────────────────────────────────
  const filteredResults = results.filter((item) => {
    if (activeSourceFilter === '4k') {
      return item.badge?.includes('4K') || item.dimensions?.includes('4K');
    }
    if (activeSourceFilter === 'hd') {
      return item.badge?.includes('HD') || item.dimensions?.includes('HD');
    }
    return true;
  });

  const fourKCount = results.filter(
    (r) => r.badge?.includes('4K') || r.dimensions?.includes('4K')
  ).length;
  const hdCount = results.filter(
    (r) => r.badge?.includes('HD') || r.dimensions?.includes('HD')
  ).length;

  const quickChips = [
    'Estuche celular',
    'Carcasa protectora',
    'Licencia Office',
    'Licencia Windows',
    'Gafas Gamer',
    'Samsung S25 Ultra',
    'Kit de destornilladores',
    'Tarjeta Regalo',
    'iPhone 15 Pro Max',
    'Control Gamer PS5',
    'MacBook Pro M3',
    'PlayStation 5',
    'Laptop Gamer RTX',
    'Audífonos Diadema RGB',
    'Teclado Mecánico RGB',
    'Monitor Curvo 144Hz',
  ];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-2 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-6xl bg-white rounded-3xl shadow-2xl border border-slate-200/90 h-[93vh] flex flex-col overflow-hidden animate-scaleUp">

        {/* ── CABECERA ────────────────────────────────────────────────── */}
        <div className="px-5 py-3.5 border-b border-slate-200/80 bg-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200/70 flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 text-[#0A6CFF]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display font-extrabold text-base sm:text-lg text-slate-900">
                  Gestor de Imágenes del Producto
                </h3>
                <span className="text-[10px] font-mono-code font-bold uppercase px-2.5 py-0.5 rounded-full bg-pink-50 text-pink-700 border border-pink-200 flex items-center gap-1">
                  <span>⚡</span> Web Pro + Magnific MCP
                </span>
                <span className="text-[10px] font-mono-code font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  WebP 800x800 Fondo Blanco
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Producto: <strong className="text-slate-800">{productTitle || 'Item de Catálogo'}</strong>
                <span className="hidden md:inline text-slate-400 ml-2">• Canvas Preprocessor: 800×800 (#FFFFFF, &lt;50KB)</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Cerrar */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Cerrar gestor"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── SELECTOR DE 3 VÍAS ──────────────────────────────────────── */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between flex-shrink-0">
          <div className="inline-flex items-center p-1 bg-slate-200/60 rounded-2xl gap-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('search')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'search'
                  ? 'bg-white text-[#0A6CFF] shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Search className="w-3.5 h-3.5 text-[#0A6CFF]" />
              <span>1. 🌐 Web Pro · Bancos globales</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5 text-emerald-600" />
              <span>2. Subir desde PC</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('url')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'url'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5 text-indigo-600" />
              <span>3. Pegar URL</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('magnific_web')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'magnific_web'
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-pink-500" />
              <span>4. ⚡ Magnific MCP</span>
            </button>
          </div>

          <span className="text-[11px] font-mono-code text-slate-400 hidden sm:inline">
            Compresión automática → WebP 800×800 &lt; 50 KB
          </span>
        </div>

        {/* ── BANNER DE CARGA / OPTIMIZACIÓN ──────────────────────────── */}
        {(isLoading || isOptimizing) && (
          <div className="p-3 bg-blue-50/80 border-b border-blue-100 flex items-center justify-between text-xs text-blue-900 font-semibold animate-fadeIn">
            <span className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-[#0A6CFF] animate-spin" />
              {statusMessage || 'Procesando imagen con Canvas Helper...'}
            </span>
            <span className="text-[11px] font-mono-code text-blue-700 bg-white px-2.5 py-0.5 rounded-full border border-blue-200 shadow-2xs">
              Canvas WebP Activo
            </span>
          </div>
        )}

        {/* ── CUERPO PRINCIPAL ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-hidden flex flex-col">

          {/* ════════════════════════════════════════════════════════════
              PESTAÑA 1: CATÁLOGO NATIVO PRO (layout split)
             ════════════════════════════════════════════════════════════ */}
          {activeTab === 'search' && (
            <div className="flex-1 flex flex-col overflow-hidden">

              {/* Barra de Búsqueda + Chips + Filtros */}
              <div className="p-4 bg-white border-b border-slate-200/80 space-y-3 flex-shrink-0">
                {/* Leyenda de motores: Web Pro vs. Magnific */}
                <div className="flex flex-wrap items-center gap-2 text-[10px]">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                    🌐 Web Pro
                  </span>
                  <span className="text-slate-500">
                    Bancos globales gratuitos (Openverse · Wikimedia · DDG · Bing)
                  </span>
                  <span className="text-slate-300 hidden sm:inline">|</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 border border-pink-200 font-bold">
                    ⚡ Magnific MCP
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('magnific_web')}
                    className="text-pink-600 hover:text-pink-700 underline underline-offset-2 font-semibold cursor-pointer"
                  >
                    Ir a la pestaña 4
                  </button>
                </div>

                <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Escribe el producto: ej. control gamer ps5, macbook m3, mouse rgb, diadema..."
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs sm:text-sm text-slate-900 outline-none focus:bg-white focus:border-[#0A6CFF] focus:ring-2 focus:ring-blue-500/15 shadow-2xs transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-5 py-2.5 rounded-2xl bg-[#0A6CFF] hover:bg-blue-600 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    <span>Buscar</span>
                  </button>
                </form>

                {/* Chips de tendencias */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                  <span className="text-[11px] font-semibold text-slate-400 flex-shrink-0">Tendencias:</span>
                  {quickChips.map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => { setSearchTerm(chip); executeSearch(chip, category); }}
                      className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-pink-50 text-slate-700 hover:text-pink-600 border border-slate-200/80 hover:border-pink-300 text-[11px] font-medium transition-colors flex-shrink-0 cursor-pointer shadow-2xs"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {/* Sub-filtros de fuente */}
                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setActiveSourceFilter('all')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeSourceFilter === 'all'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    Todos ({results.length} fotos reales)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSourceFilter('4k')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeSourceFilter === '4k'
                        ? 'bg-pink-600 text-white shadow-xs'
                        : 'bg-pink-50 text-pink-700 hover:bg-pink-100 border border-pink-200'
                    }`}
                  >
                    <span>⚡</span> 4K Ultra ({fourKCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSourceFilter('hd')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeSourceFilter === 'hd'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                    }`}
                  >
                    <span>🔍</span> Web HD ({hdCount})
                  </button>
                  <span className="ml-auto text-[10px] font-mono-code text-slate-400 hidden lg:block">
                    {filteredResults.length} imágenes reales · Catálogo Web Pro
                  </span>
                </div>

                {/* ── ESTADO DEL MOTOR WEB PRO ───────────────────────────── */}
                {engineInfo.engine !== 'idle' && (
                  <div
                    className={`flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border px-3 py-2 text-[11px] ${
                      engineInfo.engine === 'webpro'
                        ? 'bg-blue-50 border-blue-200 text-blue-800'
                        : ['magnific-mcp', 'magnific-api', 'magnific-scrape'].includes(
                            engineInfo.engine
                          )
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <span className="font-bold">
                      {engineInfo.engine === 'webpro'
                        ? '✅ Catálogo Web Pro · Bancos globales'
                        : engineInfo.engine === 'magnific-mcp'
                          ? '✅ Magnific MCP conectado'
                          : engineInfo.engine === 'magnific-api'
                            ? '✅ Catálogo oficial de Magnific'
                            : engineInfo.engine === 'magnific-scrape'
                              ? '✅ Catálogo Magnific en alta resolución'
                              : engineInfo.engine === 'stock-publico'
                                ? 'Catálogo de respaldo disponible'
                                : 'Sin resultados en este momento'}
                    </span>
                    <span className="text-[10px] opacity-80">
                      {engineInfo.engine === 'webpro'
                        ? 'Resultados de Openverse, Wikimedia, DuckDuckGo y Bing en alta resolución.'
                        : engineInfo.engine === 'magnific-mcp'
                          ? 'Resultados servidos por el motor oficial de Magnific vía MCP.'
                          : engineInfo.engine === 'magnific-api'
                            ? 'Resultados idénticos al catálogo profesional de magnific.com.'
                            : engineInfo.engine === 'magnific-scrape'
                              ? 'Imágenes reales de magnific.com en alta resolución.'
                              : 'Puedes reintentar la búsqueda o subir tu propia imagen.'}
                    </span>
                  </div>
                )}
              </div>

              {/* Layout split: Galería izquierda | Panel de previsualización derecha */}
              <div className="flex-1 overflow-hidden flex flex-row">

                {/* ── GALERÍA ─────────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-100/70">
                  {isLoading ? (
                    <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-8 bg-white rounded-3xl border border-slate-200">
                      <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#0A6CFF] flex items-center justify-center mb-3">
                        <RefreshCw className="w-8 h-8 animate-spin" />
                      </div>
                      <h4 className="font-display font-bold text-base text-slate-800">
                        Buscando "{searchTerm}" en bancos globales Web Pro...
                      </h4>
                      <p className="text-xs text-slate-500 max-w-md mt-1">
                        Obteniendo imágenes de alta definición y activos comerciales reales.
                      </p>
                    </div>
                  ) : filteredResults.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                      {filteredResults
                        .filter((item) => !failedUrls.has(item.url))
                        .map((item, index) => {
                        const isSelected = previewItem?.url === item.url;
                        return (
                          <div
                            key={item.id || index}
                            onClick={() => handleCardClick(item)}
                            className={`group relative bg-white rounded-2xl border overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 ${
                              isSelected
                                ? 'border-[#0A6CFF] ring-3 ring-blue-500/25 shadow-lg'
                                : 'border-slate-200 hover:border-[#0A6CFF]/60'
                            }`}
                          >
                            {/* Imagen cuadrada */}
                            <div className="relative aspect-square w-full bg-white flex items-center justify-center p-2 overflow-hidden border-b border-slate-100">
                              <img
                                src={item.thumbUrl || item.url}
                                alt={item.title}
                                loading="lazy"
                                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                                onError={() => {
                                  // Ocultar la tarjeta si falla el enlace
                                  setFailedUrls((prev) => new Set([...prev, item.url]));
                                }}
                              />

                              {/* Badge origen — Catálogo Web Pro */}
                              <div className="absolute top-1.5 left-1.5 z-10">
                                <span className="px-1.5 py-0.5 rounded-full bg-gradient-to-r from-blue-600 to-sky-500 text-[8px] font-mono-code font-bold text-white shadow-2xs flex items-center gap-0.5">
                                  <span>🌐</span> {item.badge || 'Web Pro HD'}
                                </span>
                              </div>

                              {/* Badge dimensiones */}
                              <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-slate-900/75 text-[8px] font-mono-code font-bold text-white border border-white/10">
                                {item.dimensions || '4K'}
                              </span>

                              {/* Overlay hover */}
                              <div className="absolute inset-0 bg-slate-900/35 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-20">
                                <div className="bg-white rounded-xl px-2.5 py-1.5 shadow-lg flex items-center gap-1.5">
                                  <Star className="w-3 h-3 text-[#0A6CFF]" />
                                  <span className="text-[10px] font-bold text-slate-800">Ver previa</span>
                                </div>
                              </div>

                              {/* Check si está seleccionada */}
                              {isSelected && (
                                <div className="absolute top-1.5 right-1.5 z-30 w-5 h-5 rounded-full bg-[#0A6CFF] flex items-center justify-center shadow-md">
                                  <Check className="w-3 h-3 text-white" />
                                </div>
                              )}
                            </div>

                            {/* Pie de tarjeta */}
                            <div className="p-2 bg-white">
                              <p className="text-[10px] font-semibold text-slate-800 truncate leading-tight" title={item.title}>
                                {item.title}
                              </p>
                              <span className="text-[9px] text-slate-400 block truncate mt-0.5">
                                {item.source}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-8 bg-white rounded-3xl border border-slate-200">
                      <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-3">
                        <ImageIcon className="w-8 h-8 text-[#0A6CFF]" />
                      </div>
                      <h4 className="font-display font-bold text-base text-slate-800">
                        {searchTerm ? `No se encontraron imágenes para "${searchTerm}"` : 'Busca cualquier producto en la web'}
                      </h4>
                      <p className="text-xs text-slate-500 max-w-md mt-1 mb-4">
                        Escribe cualquier término en la barra (ej. "estuche", "carcasa", "gafas gamer", "Samsung S25"). El Catálogo Web Pro busca en bancos globales gratuitos y etiqueta cada resultado con su fuente.
                      </p>
                      {searchTerm && (
                        <button
                          type="button"
                          onClick={() => executeSearch(searchTerm, category)}
                          className="px-4 py-2 rounded-xl bg-[#0A6CFF] hover:bg-blue-600 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-2"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Reintentar búsqueda</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* ── PANEL DE PREVISUALIZACIÓN (derecha) ─────────────── */}
                <div className={`hidden lg:flex flex-shrink-0 border-l border-slate-200 bg-white flex-col transition-all duration-300 ${previewItem ? 'w-64 xl:w-72' : 'w-0 overflow-hidden'}`}>
                  {previewItem && (
                    <>
                      {/* Header del panel */}
                      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Star className="w-3.5 h-3.5 text-[#0A6CFF]" />
                          Previsualización
                        </span>
                        <button
                          type="button"
                          onClick={() => setPreviewItem(null)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Imagen grande en lienzo blanco */}
                      <div className="p-4 flex-shrink-0">
                        <div className="w-full aspect-square bg-white border border-slate-200 rounded-2xl shadow-inner overflow-hidden flex items-center justify-center p-3">
                          <img
                            src={previewItem.thumbUrl || previewItem.url}
                            alt={previewItem.title}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = NEUTRAL_PLACEHOLDER_SVG;
                            }}
                          />
                        </div>
                      </div>

                      {/* Metadatos */}
                      <div className="px-4 pb-3 space-y-1 flex-1 overflow-y-auto">
                        <p className="text-xs font-bold text-slate-800 leading-snug">
                          {previewItem.title}
                        </p>
                        <p className="text-[10px] text-slate-500">{previewItem.source}</p>

                        <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded-full border text-[9px] font-bold ${
                              previewItem.sourceType === 'webpro'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-pink-50 text-pink-700 border-pink-200'
                            }`}
                          >
                            {previewItem.sourceType === 'webpro' ? '🌐' : '⚡'}{' '}
                            {previewItem.badge || 'HD'}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[9px] font-bold font-mono-code">
                            {previewItem.dimensions || '4K'}
                          </span>
                        </div>

                        {/* Info de transformación */}
                        <div className="mt-3 p-2.5 rounded-xl bg-blue-50 border border-blue-100 space-y-1">
                          <p className="text-[10px] font-bold text-blue-800 flex items-center gap-1">
                            <Zap className="w-3 h-3" /> Pipeline Canvas WebP
                          </p>
                          <ul className="text-[9px] text-blue-700 space-y-0.5 list-none">
                            <li>✓ Fondo blanco sólido #FFFFFF</li>
                            <li>✓ Centrado 800×800 px</li>
                            <li>✓ Compresión &lt; 50 KB</li>
                          </ul>
                        </div>

                        {/* Enlace externo para inspección */}
                        <a
                          href={previewItem.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-[#0A6CFF] transition-colors mt-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Ver imagen original
                        </a>
                      </div>

                      {/* Botón "Usar esta imagen" */}
                      <div className="p-4 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={handleConfirmPreview}
                          disabled={isOptimizing}
                          className="w-full py-3 rounded-2xl bg-[#0A6CFF] hover:bg-blue-600 disabled:opacity-50 text-white font-extrabold text-sm shadow-lg shadow-blue-500/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          {isOptimizing ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                          <span>{isOptimizing ? 'Procesando...' : 'Usar esta imagen'}</span>
                        </button>
                        <p className="text-[9px] text-slate-400 text-center mt-1.5">
                          Canvas WebP · Fondo blanco · &lt;50 KB
                        </p>
                      </div>
                    </>
                  )}

                  {/* Placeholder cuando no hay selección */}
                  {!previewItem && (
                    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                        <ImageIcon className="w-6 h-6 text-slate-300" />
                      </div>
                      <p className="text-xs text-slate-400 font-medium">
                        Haz clic en una imagen para previsualizarla aquí
                      </p>
                    </div>
                  )}
                </div>

              </div>{/* fin layout split */}

              {/* Vista previa móvil: hoja inferior a pantalla completa ligera */}
              {previewItem && (
                <>
                  <div
                    className="lg:hidden fixed inset-0 z-[115] bg-slate-900/45 backdrop-blur-xs"
                    onClick={() => setPreviewItem(null)}
                    aria-hidden="true"
                  />
                  <div className="lg:hidden fixed inset-x-0 bottom-0 z-[120] bg-white border-t border-slate-200 rounded-t-3xl shadow-2xl p-4 max-h-[78dvh] overflow-y-auto animate-slideUp">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 text-[#0A6CFF]" />
                        Previsualización
                      </span>
                      <button
                        type="button"
                        onClick={() => setPreviewItem(null)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                        aria-label="Cerrar previsualización"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="w-full h-48 bg-white border border-slate-200 rounded-2xl overflow-hidden flex items-center justify-center p-2 mb-3">
                      <img
                        src={previewItem.thumbUrl || previewItem.url}
                        alt={previewItem.title}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = NEUTRAL_PLACEHOLDER_SVG;
                        }}
                      />
                    </div>

                    <p className="text-xs font-bold text-slate-800 leading-snug">
                      {previewItem.title}
                    </p>
                    <p className="text-[10px] text-slate-500 mb-2">{previewItem.source}</p>

                    <div className="flex items-center gap-1.5 flex-wrap mb-3">
                      <span
                        className={`px-2 py-0.5 rounded-full border text-[9px] font-bold ${
                          previewItem.sourceType === 'webpro'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-pink-50 text-pink-700 border-pink-200'
                        }`}
                      >
                        {previewItem.sourceType === 'webpro' ? '🌐' : '⚡'}{' '}
                        {previewItem.badge || 'HD'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[9px] font-bold font-mono-code">
                        {previewItem.dimensions || '4K'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleConfirmPreview}
                      disabled={isOptimizing}
                      className="w-full py-3 rounded-2xl bg-[#0A6CFF] hover:bg-blue-600 disabled:opacity-50 text-white font-extrabold text-sm shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
                    >
                      {isOptimizing ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      <span>{isOptimizing ? 'Procesando...' : 'Usar esta imagen'}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              PESTAÑA 2: SUBIR DESDE PC (DRAG & DROP)
             ════════════════════════════════════════════════════════════ */}
          {activeTab === 'upload' && (
            <div className="flex-1 p-6 sm:p-10 flex flex-col items-center justify-center bg-slate-50/70 overflow-y-auto">
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleProcessLocalFile(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full max-w-xl p-10 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center text-center transition-all cursor-pointer bg-white ${
                  isDragOver
                    ? 'border-[#0A6CFF] bg-blue-50/50 scale-[1.02]'
                    : 'border-slate-300 hover:border-[#0A6CFF] hover:shadow-lg'
                }`}
              >
                <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 shadow-xs">
                  <Upload className="w-8 h-8" />
                </div>
                <h4 className="font-display font-bold text-lg text-slate-900 mb-1">
                  Arrastra aquí tu imagen o haz clic para examinar
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mb-4">
                  Soporta PNG, JPG, JPEG o WebP. Se procesará automáticamente en Canvas sobre un{' '}
                  <strong>fondo blanco sólido (#FFFFFF)</strong> centrado en 800×800 px.
                </p>
                <button
                  type="button"
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors"
                >
                  Examinar archivos en este equipo
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleProcessLocalFile(f);
                  }}
                />
              </div>

              <div className="mt-6 flex items-center gap-6 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  Salida: WebP Ultraligero (&lt;50KB)
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-[#0A6CFF]" />
                  Lienzo 1:1 Cuadrado
                </span>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              PESTAÑA 3: PEGAR URL DIRECTA CON PREVISUALIZACIÓN EN VIVO
             ════════════════════════════════════════════════════════════ */}
          {activeTab === 'url' && (
            <div className="flex-1 p-6 sm:p-10 flex flex-col items-center justify-center bg-slate-50/70 overflow-y-auto">
              <div className="w-full max-w-xl bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-lg space-y-6">
                <div>
                  <h4 className="font-display font-bold text-base text-slate-900">
                    Vincular Imagen desde URL Externa
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pega el enlace directo de la fotografía. El preprocesador Canvas la descargará y convertirá a WebP con fondo blanco limpio.
                  </p>
                </div>

                <form onSubmit={handleProcessDirectUrl} className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      URL de la Imagen:
                    </label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="url"
                        value={directUrlInput}
                        onChange={(e) => {
                          setDirectUrlInput(e.target.value);
                          setUrlPreviewValid(false);
                        }}
                        placeholder="https://ejemplo.com/fotos/control-ps5.jpg"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs sm:text-sm text-slate-900 outline-none focus:bg-white focus:border-[#0A6CFF] focus:ring-2 focus:ring-blue-500/15"
                      />
                    </div>
                  </div>

                  {/* Previsualización en vivo */}
                  {directUrlInput.trim() && (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-4">
                      <div className="w-24 h-24 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner">
                        <img
                          src={directUrlInput.trim()}
                          alt="Vista previa URL"
                          className="w-full h-full object-contain"
                          onLoad={() => setUrlPreviewValid(true)}
                          onError={() => setUrlPreviewValid(false)}
                        />
                      </div>
                      <div className="flex-1 overflow-hidden space-y-1">
                        <span className="text-[10px] font-mono-code font-bold uppercase text-slate-400 block">
                          Estado del Enlace:
                        </span>
                        {urlPreviewValid ? (
                          <p className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Enlace válido y listo para optimizar
                          </p>
                        ) : (
                          <p className="text-xs text-slate-500">Cargando previsualización...</p>
                        )}
                        <p className="text-[10px] text-slate-400 truncate">{directUrlInput}</p>
                        <div className="mt-2 p-2 rounded-lg bg-blue-50 border border-blue-100">
                          <p className="text-[9px] text-blue-700 font-semibold">
                            ✓ Se aplicará fondo blanco #FFFFFF · 800×800 px · &lt;50 KB
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!directUrlInput.trim() || isOptimizing}
                    className="w-full py-3 rounded-2xl bg-[#0A6CFF] hover:bg-blue-600 text-white font-bold text-sm shadow-md shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <span>Optimizar y Asignar a Producto (WebP)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              PESTAÑA 4: MAGNIFIC WEB INMERSIVO (NAVEGACIÓN LIBRE + BOTÓN USAR)
             ════════════════════════════════════════════════════════════ */}
          {activeTab === 'magnific_web' && (
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-900">
              {/* Barra de Navegación Inmersiva */}
              <div className="p-3 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-600 to-rose-600 flex items-center justify-center text-white shadow-xs">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white">Magnific Web Studio</span>
                      <span className="text-[9px] font-mono-code font-bold uppercase px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                        Navegación Libre
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Explora libremente y pulsa el botón <strong>"Usar ▾"</strong> sobre la tarjeta para importar al producto.
                    </span>
                  </div>
                </div>

                {/* Formulario de búsqueda rápida en Magnific */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!magnificWebQuery.trim()) return;
                    const iframe = magnificIframeRef.current;
                    if (iframe && iframe.contentWindow) {
                      try {
                        iframe.contentWindow.postMessage(
                          { type: 'MAGNIFIC_SEARCH_QUERY', query: magnificWebQuery.trim() },
                          window.location.origin
                        );
                        return; // postMessage sent — no reload needed
                      } catch (_) {}
                    }
                    setIframeKey((prev) => prev + 1); // fallback: full reload
                  }}
                  className="flex items-center gap-2 flex-1 max-w-md min-w-[240px]"
                >
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={magnificWebQuery}
                      onChange={(e) => setMagnificWebQuery(e.target.value)}
                      placeholder="Buscar en Magnific Web: estuche, repetidor wifi, macbook..."
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 outline-none focus:border-pink-500 shadow-2xs"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-xs shadow-xs transition-all cursor-pointer whitespace-nowrap"
                  >
                    Buscar
                  </button>
                </form>

                {/* Capturador Rápido por URL Manual */}
                <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
                  <input
                    type="url"
                    value={magnificDirectInput}
                    onChange={(e) => setMagnificDirectInput(e.target.value)}
                    placeholder="O pega URL de Magnific..."
                    className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-[11px] text-slate-200 w-44 sm:w-52 outline-none focus:border-blue-400"
                  />
                  <button
                    type="button"
                    disabled={!magnificDirectInput.trim() || isOptimizing}
                    onClick={async () => {
                      if (!magnificDirectInput.trim()) return;
                      setIsOptimizing(true);
                      setStatusMessage('Preprocesando URL de Magnific en Canvas (#FFFFFF) → WebP...');
                      try {
                        const opt = await webImageSearchService.fetchAndCompressWebP(magnificDirectInput.trim());
                        if (onSelectImage) {
                          onSelectImage(opt.dataUrl, opt.compressedSizeKb || 40, {
                            title: productTitle || 'Producto Magnific',
                            searchTerm: magnificWebQuery || 'Magnific Web',
                            source: 'Magnific Web Direct',
                          });
                        }
                        onClose();
                      } catch {
                        if (onSelectImage) onSelectImage(magnificDirectInput.trim(), 45, {
                          title: productTitle || 'Producto Magnific',
                          searchTerm: 'Magnific Web',
                          source: 'Magnific Web Direct',
                        });
                        onClose();
                      } finally {
                        setIsOptimizing(false);
                        setStatusMessage('');
                      }
                    }}
                    className="px-3 py-1 rounded-lg bg-[#0A6CFF] hover:bg-blue-600 text-white font-bold text-[11px] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Capturar
                  </button>
                </div>
              </div>

              {/* Banner de Guía Activa */}
              <div className="px-4 py-1.5 bg-gradient-to-r from-pink-950/70 via-slate-900 to-blue-950/70 border-b border-pink-900/40 flex items-center justify-between text-[11px] text-pink-200">
                <span className="flex items-center gap-2 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                  <span>
                    Navegación libre activa: haz clic sobre filtros, busca y navega normalmente. Usa el botón <strong>"Usar ▾"</strong> sobre la imagen elegida para capturar a WebP (#FFFFFF).
                  </span>
                </span>
                <span className="hidden md:inline text-[10px] font-mono-code text-pink-300">
                  Botón Exclusivo "Usar ▾"
                </span>
              </div>

              {/* Contenedor Iframe con Live Studio Magnific */}
              <div className="flex-1 relative w-full h-full bg-slate-950">
                <iframe
                  key={iframeKey}
                  ref={magnificIframeRef}
                  src={`/api/magnific-search?embed=1&q=${encodeURIComponent(magnificWebQuery || searchTerm || 'repetidor wifi')}`}
                  title="Entorno Inmersivo Magnific Web"
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                />
              </div>
            </div>
          )}

        </div>{/* fin cuerpo principal */}

        {/* ── PIE DEL MODAL ────────────────────────────────────────────── */}
        <div className="px-5 py-3 border-t border-slate-200/80 bg-white flex items-center justify-between flex-shrink-0 text-xs">
          <div className="flex items-center gap-2 text-slate-500 text-[11px]">
            <span>Lienzo 800×800 px con fondo blanco (#FFFFFF) • Protege cuota Supabase (&lt;50 KB por producto).</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
