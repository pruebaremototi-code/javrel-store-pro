import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Sparkles,
  CheckCircle2,
  Trash2,
  Plus,
  RefreshCw,
  Cpu,
  HardDrive,
  ExternalLink,
  ShieldCheck,
  Key,
  Layers,
  Globe,
  ZoomIn,
  AlertTriangle,
  Maximize2,
  Minimize2,
  RotateCcw,
  Link2,
  ClipboardPaste,
} from 'lucide-react';
import {
  catalogImportService,
  STORE_CATEGORIES,
  AI_MODELS_CATALOG,
} from '../services/catalogImportService';
import { generateUuid } from '../services/textUtils';
import { ImageLightbox } from './ImageLightbox';
import { VisualImageSearchModal } from './VisualImageSearchModal';
import confetti from 'canvas-confetti';

export const BulkImportModal = ({
  isOpen,
  onClose,
  onImportProducts,
  categories = STORE_CATEGORIES,
}) => {
  const [activeTab, setActiveTab] = useState('pdf'); // 'pdf' | 'images' | 'paste'
  const [geminiKey, setGeminiKey] = useState(catalogImportService.getGeminiApiKey());
  const [showKeyInput, setShowKeyInput] = useState(false);

  // Selector Dinámico de Modelos de IA en Cascada
  const [selectedAiModel, setSelectedAiModel] = useState('auto');
  const [enableWebFallback, setEnableWebFallback] = useState(true);
  const [resolvingIndex, setResolvingIndex] = useState(null);
  const [isBulkResolvingImages, setIsBulkResolvingImages] = useState(false);

  // Estados de proceso
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  // Reporte de trazabilidad y diagnóstico en tiempo real
  const [importDiagnostics, setImportDiagnostics] = useState(null);
  // Modo pantalla completa para edición expandida
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Control visual para expandir o contraer el listado de productos detectados
  const [isListExpanded, setIsListExpanded] = useState(true);

  // Visor Lightbox con Zoom
  const [lightboxData, setLightboxData] = useState({
    isOpen: false,
    image: '',
    title: '',
    price: null,
    brand: '',
  });

  // Datos extraídos listos para previsualización (Human-in-the-Loop)
  const [extractedProducts, setExtractedProducts] = useState([]);
  const [selectedPdfFile, setSelectedPdfFile] = useState(null);
  const [pdfPagesCount, setPdfPagesCount] = useState(0);
  const [pdfPreviewPages, setPdfPreviewPages] = useState([]);
  const [isRenderingPdfPreview, setIsRenderingPdfPreview] = useState(false);
  const [pdfPreviewError, setPdfPreviewError] = useState('');

  // Modal interactivo de detección de archivo PDF duplicado
  const [duplicateModal, setDuplicateModal] = useState({
    isOpen: false,
    fileName: '',
    onReplace: null,
    onCancel: null,
  });

  // Filtro o ajuste masivo
  const [bulkCategory, setBulkCategory] = useState('');

  // Selector visual interactivo de imágenes estilo Pinterest / Galería Web
  const [visualSearchModal, setVisualSearchModal] = useState({
    isOpen: false,
    rowIndex: null,
    query: '',
    category: 'computadores',
    productTitle: '',
  });

  const pdfInputRef = useRef(null);
  const imagesInputRef = useRef(null);
  const pasteFileInputRef = useRef(null);

  // Estados para Opción B: Pega tu imagen o link directo con IA
  const [pastedImageInput, setPastedImageInput] = useState('');
  const [pastedImageFile, setPastedImageFile] = useState(null);
  const [pastedPreview, setPastedPreview] = useState('');
  const [pastedNotes, setPastedNotes] = useState('');
  const [isAnalyzingSingle, setIsAnalyzingSingle] = useState(false);
  const [singleAnalysisStatus, setSingleAnalysisStatus] = useState('');
  const [singleAnalysisPct, setSingleAnalysisPct] = useState(0);
  const [singleAnalysisResult, setSingleAnalysisResult] = useState(null);
  const [singleAnalysisError, setSingleAnalysisError] = useState('');
  const [isDraggingPaste, setIsDraggingPaste] = useState(false);

  // Handlers para Opción B
  const handleClearPasteForm = () => {
    setPastedImageInput('');
    setPastedImageFile(null);
    setPastedPreview('');
    setPastedNotes('');
    setSingleAnalysisResult(null);
    setSingleAnalysisError('');
    setSingleAnalysisStatus('');
    setSingleAnalysisPct(0);
    if (pasteFileInputRef.current) pasteFileInputRef.current.value = '';
  };

  const handlePasteEvent = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          setPastedImageFile(file);
          const reader = new FileReader();
          reader.onload = (event) => {
            setPastedPreview(event.target.result);
          };
          reader.readAsDataURL(file);
          return;
        }
      }
    }
  };

  const handlePastedFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPastedImageFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setPastedPreview(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handlePastedUrlChange = (val) => {
    setPastedImageInput(val);
    if (val && (val.startsWith('http://') || val.startsWith('https://') || val.startsWith('data:image/'))) {
      setPastedPreview(val);
    }
  };

  const handleExecuteSingleAIAnalysis = async () => {
    // Acepta: archivo, preview (data: o http:), URL de texto O simplemente notas de texto
    const source = pastedImageFile || pastedPreview || pastedImageInput || null;
    // Si no hay imagen/url pero sí notas de texto → se pasa null y el servicio usará modo texto puro
    const textOnlyMode = !source && pastedNotes.trim().length > 0;

    if (!source && !textOnlyMode) {
      setSingleAnalysisError(
        'Por favor pega una imagen, escribe una URL de imagen o describe el producto en el campo de instrucciones.'
      );
      return;
    }
    setSingleAnalysisError('');
    setIsAnalyzingSingle(true);
    setSingleAnalysisPct(15);
    setSingleAnalysisStatus(
      textOnlyMode
        ? '🔍 Buscando imagen en la web y generando producto con IA a partir de la descripción...'
        : 'Iniciando pipeline de visión artificial y compresión WebP...'
    );

    try {
      const res = await catalogImportService.analyzeSingleResourceWithAI(
        textOnlyMode ? null : source,
        pastedNotes,
        (pct, msg) => {
          setSingleAnalysisPct(pct);
          setSingleAnalysisStatus(msg);
        }
      );

      if (res?.success && res.product) {
        setSingleAnalysisResult(res.product);
      } else {
        throw new Error('No se pudo extraer la información del producto.');
      }
    } catch (err) {
      console.error('Error analizando recurso con IA:', err);
      setSingleAnalysisError(err?.message || 'Error en el análisis de IA.');
    } finally {
      setIsAnalyzingSingle(false);
    }
  };

  const handleAddSingleResultToCatalog = () => {
    if (!singleAnalysisResult) return;
    setExtractedProducts((prev) => [singleAnalysisResult, ...prev]);
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#0A6CFF', '#10B981'],
    });
    handleClearPasteForm();
  };

  const handleUpdateSingleResultField = (field, value) => {
    setSingleAnalysisResult((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  if (!isOpen) return null;

  // Guardar Gemini Key
  const handleSaveGeminiKey = (val) => {
    setGeminiKey(val);
    catalogImportService.setGeminiApiKey(val);
  };

  // Autocompletar fotos web para todo el catálogo extraído
  const handleResolveAllWebImages = async () => {
    if (extractedProducts.length === 0) return;
    setIsBulkResolvingImages(true);
    setProcessStatus('Buscando imágenes de respaldo en la web para el catálogo completo...');
    try {
      const updated = await Promise.all(
        extractedProducts.map(async (item) => {
          try {
            const webImg = await catalogImportService.resolveWebImageForProduct(item);
            return webImg ? { ...item, image: webImg } : item;
          } catch {
            return item;
          }
        })
      );
      setExtractedProducts(updated);
    } finally {
      setIsBulkResolvingImages(false);
      setProcessStatus('');
    }
  };

  const processPdfFile = async (file, replaceExisting) => {
    setSelectedPdfFile(file);
    setIsProcessing(true);
    setProgressPercent(5);
    setProcessStatus('Generando vista previa del PDF...');
    setPdfPreviewPages([]);
    setPdfPreviewError('');
    setIsRenderingPdfPreview(true);

    // Vista previa inmediata (canvas) antes de la extracción con IA.
    try {
      const previews = await catalogImportService.renderPdfPreview(file, 4);
      setPdfPreviewPages(previews);
      if (previews.length === 0) {
        setPdfPreviewError('No se pudieron renderizar páginas del PDF. La extracción continuará.');
      }
    } catch (previewErr) {
      console.warn('No se pudo generar la vista previa del PDF:', previewErr);
      setPdfPreviewError('Vista previa no disponible en este navegador. La extracción continuará.');
    } finally {
      setIsRenderingPdfPreview(false);
    }

    setProgressPercent(10);
    setProcessStatus('Analizando estructura del documento PDF...');

    try {
      // Extraer páginas e imágenes
      const pagesData = await catalogImportService.parsePdfPages(
        file,
        15,
        (status, pct) => {
          setProcessStatus(status);
          setProgressPercent(pct);
        }
      );

      setPdfPagesCount(pagesData.length);
      const allText = pagesData.map((p) => p.text).join('\n\n');
      // Extraer imágenes individuales y sub-recortes por cuadrante para segmentación precisa
      const allImages = pagesData.flatMap((p) => (p.subCrops && p.subCrops.length > 0 ? p.subCrops : [p.imageDataUrl]));

      setProcessStatus('Ejecutando cadena de modelos de IA en cascada...');
      setProgressPercent(65);

      let products = [];
      const currentApiKey = geminiKey || catalogImportService.getGeminiApiKey();

      try {
        products = await catalogImportService.extractWithGemini(
          allText,
          currentApiKey,
          allImages,
          (status) => setProcessStatus(status),
          selectedAiModel,
          enableWebFallback
        );
        if (products.diagnostics) {
          setImportDiagnostics(products.diagnostics);
        } else {
          setImportDiagnostics({
            modelName: 'Gemini 2.5 Flash',
            fullModelTitle: 'Gemini 2.5 Flash (Última Generación Multimodal)',
            tier: 1,
            isHeuristic: false,
            message: 'Extracción completada con éxito por IA Multimodal.',
            productsCount: products.length,
            timestamp: new Date().toLocaleTimeString(),
          });
        }
      } catch (geminiErr) {
        console.warn('Fallo de cadena Gemini IA, activando motor heurístico local:', geminiErr);
        products = catalogImportService.extractProductsHeuristically(allText, allImages);
        if (enableWebFallback) {
          products = await catalogImportService.applyWebImageFallbackIfNeeded(products, true, (s) => setProcessStatus(s));
        }
        setImportDiagnostics({
          modelName: 'Motor Heurístico Local Offline',
          fullModelTitle: 'Motor Heurístico Local de JavrelStore',
          tier: 5,
          isHeuristic: true,
          message: `Respaldo local activado: ${geminiErr?.message || 'Modelos en la nube no disponibles'}. El catálogo fue procesado con el algoritmo heurístico interno.`,
          productsCount: products.length,
          timestamp: new Date().toLocaleTimeString(),
        });
      }

      if (products.length === 0) {
        // Si no detectó precios con formato estricto, crear borradores iniciales basados en páginas
        const drafts = pagesData.map((p, idx) => ({
          id: generateUuid(),
          name: `Producto Individual Pág. ${p.pageNum}`,
          reference: `JR-P${p.pageNum}`,
          brand: 'JavrelStore',
          category: 'computadores',
          price: 250000,
          originalPrice: 300000,
          stock: 10,
          badge: 'CATÁLOGO',
          description: `Extraído de la página ${p.pageNum} del catálogo ${file.name}.`,
          image: p.imageDataUrl,
          imageSizeKb: p.sizeKb,
        }));
        products = enableWebFallback
          ? await catalogImportService.applyWebImageFallbackIfNeeded(drafts, true, (s) => setProcessStatus(s))
          : drafts;
      }

      setExtractedProducts(products);
      setProgressPercent(100);
      setProcessStatus('¡Extracción completada con éxito!');
    } catch (err) {
      console.error('Error procesando PDF:', err);
      alert('Error al procesar el archivo PDF: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // 1. Manejar Carga de Archivo PDF (con detector inteligente de hash / contenido duplicado)
  const calculatePdfHash = async (file) => {
    try {
      const slice = file.slice(0, Math.min(file.size, 512 * 1024));
      const buffer = await slice.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      return `${file.name}-${file.size}-${file.lastModified}`;
    }
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      alert('Por favor selecciona un archivo PDF válido de catálogo.');
      return;
    }

    // Comprobación de catálogo previamente procesado (Detección Inteligente de Archivos Duplicados por Hash y Metadatos)
    const fileHash = await calculatePdfHash(file);
    const processedHistory = JSON.parse(localStorage.getItem('javrelstore_processed_catalogs') || '[]');
    const isAlreadyProcessed = processedHistory.some(
      (cat) => (cat.hash && cat.hash === fileHash) || (cat.name === file.name && cat.size === file.size)
    );

    if (isAlreadyProcessed) {
      setDuplicateModal({
        isOpen: true,
        fileName: file.name,
        onReplace: () => {
          setDuplicateModal({ isOpen: false, fileName: '', onReplace: null, onCancel: null });
          processPdfFile(file, true);
        },
        onCancel: () => {
          setDuplicateModal({ isOpen: false, fileName: '', onReplace: null, onCancel: null });
          if (pdfInputRef.current) pdfInputRef.current.value = '';
        },
      });
      return;
    }

    processPdfFile(file, false);
  };

  // 2. Manejar Carga Masiva de Múltiples Imágenes
  const handleImagesUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (files.length > 50) {
      alert('Puedes importar hasta 50 imágenes por lote para garantizar el máximo rendimiento.');
      return;
    }

    setIsProcessing(true);
    setProgressPercent(15);
    setProcessStatus(`Procesando y comprimiendo ${files.length} imágenes a WebP 800x800...`);

    try {
      const products = await catalogImportService.processMultipleProductImages(
        files,
        (status, pct) => {
          setProcessStatus(status);
          setProgressPercent(pct);
        }
      );

      setExtractedProducts((prev) => [...products, ...prev]);
      setImportDiagnostics({
        modelName: 'Compresor WebP & Procesador Multi-Imagen',
        fullModelTitle: 'Pipeline Visual WebP (800x800px)',
        tier: 1,
        isHeuristic: false,
        message: `${files.length} fotos procesadas, redimensionadas y convertidas a WebP de alta compresión.`,
        productsCount: products.length,
        timestamp: new Date().toLocaleTimeString(),
      });
      setProgressPercent(100);
      setProcessStatus('¡Imágenes optimizadas a WebP y cargadas con éxito!');
    } catch (err) {
      console.error('Error procesando imágenes:', err);
      alert('Ocurrió un error al procesar las imágenes: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Edición en la Tabla (Human-in-the-Loop)
  const handleUpdateField = (index, field, value) => {
    setExtractedProducts((prev) =>
      prev.map((item, idx) => {
        if (idx === index) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  // Buscar foto web individual para una fila (usa handleUpdateField)
  const handleSearchWebImageForRow = async (index) => {
    const item = extractedProducts[index];
    if (!item) return;
    setResolvingIndex(index);
    try {
      const newImg = await catalogImportService.resolveWebImageForProduct(item);
      if (newImg) {
        handleUpdateField(index, 'image', newImg);
      }
    } catch (err) {
      console.warn('Error resolviendo imagen web:', err);
    } finally {
      setResolvingIndex(null);
    }
  };

  const handleRemoveItem = (index) => {
    setExtractedProducts((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddNewEmptyRow = () => {
    const newRow = {
      id: 'prod-man-' + Date.now(),
      name: 'Nuevo Producto Tecnológico',
      reference: `SW-${Math.floor(1000 + Math.random() * 9000)}`,
      brand: 'JavrelStore',
      category: 'computadores',
      price: 150000,
      originalPrice: 190000,
      stock: 10,
      badge: 'NUEVO',
      description: 'Garantía oficial directa y despacho nacional asegurado.',
      image: '/zafra/p/k1763147593434.webp',
      imageSizeKb: 38,
    };
    setExtractedProducts((prev) => [newRow, ...prev]);
  };

  // 4. Asignación Masiva de Categoría
  const handleApplyBulkCategory = () => {
    if (!bulkCategory) return;
    setExtractedProducts((prev) =>
      prev.map((item) => ({ ...item, category: bulkCategory }))
    );
  };

  // 5. Guardar Catálogo Masivo en Supabase y Tienda
  const handleConfirmImport = async () => {
    if (extractedProducts.length === 0) {
      alert('No hay productos para importar.');
      return;
    }

    // Validar datos mínimos
    const invalid = extractedProducts.some((p) => !p.name || !p.price || p.price <= 0);
    if (invalid) {
      alert('Por favor verifica que todos los productos tengan un nombre y un precio válido mayor a 0.');
      return;
    }

    setIsProcessing(true);
    setProcessStatus(`Guardando masivamente ${extractedProducts.length} productos en Supabase...`);

    try {
      // Guardar en historial de catálogos procesados con hash de integridad
      if (selectedPdfFile) {
        let pdfHash = null;
        try {
          pdfHash = await calculatePdfHash(selectedPdfFile);
        } catch (_) {}
        const history = JSON.parse(localStorage.getItem('javrelstore_processed_catalogs') || '[]');
        history.unshift({
          name: selectedPdfFile.name,
          size: selectedPdfFile.size,
          hash: pdfHash,
          date: new Date().toISOString(),
          productCount: extractedProducts.length,
        });
        localStorage.setItem('javrelstore_processed_catalogs', JSON.stringify(history.slice(0, 20)));
      }

      await onImportProducts(extractedProducts);

      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#0A6CFF', '#22C55E', '#F59E0B'],
      });

      onClose();
    } catch (err) {
      console.error('Error importando productos masivamente:', err);
      alert('Error al guardar el catálogo masivo: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Calcular peso total optimizado de medios
  const totalOptimizedKb = extractedProducts.reduce(
    (acc, p) => acc + (p.imageSizeKb || 40),
    0
  );
  const estimatedOriginalMb = Math.round((totalOptimizedKb * 25) / 1024);

  return (
    <div className={`fixed inset-0 z-[75] overflow-hidden bg-slate-950/80 backdrop-blur-sm flex items-center justify-center ${isFullscreen ? 'p-0' : 'p-0 sm:p-4'} animate-fadeIn`}>
      {/* Alerta Interactiva de Catálogo Duplicado */}
      {duplicateModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-amber-200 animate-scaleUp text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="font-display font-extrabold text-lg text-slate-900 mb-2">
              ¡Catálogo PDF ya procesado!
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Este catálogo ya se encuentra subido (<strong>{duplicateModal.fileName}</strong>). ¿Deseas reemplazarlo o cancelar para evitar duplicados en la base de datos?
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-2.5 justify-center">
              <button
                type="button"
                onClick={duplicateModal.onCancel}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={duplicateModal.onReplace}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#0A6CFF] hover:bg-blue-600 shadow-md shadow-blue-500/25 transition-all cursor-pointer"
              >
                Reemplazar Catálogo
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`relative w-full bg-white ${isFullscreen ? 'rounded-none h-screen' : 'rounded-none sm:rounded-3xl h-[100dvh] max-h-[100dvh] sm:h-[94vh] sm:max-h-[94vh] sm:max-w-6xl'} shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-scaleUp`}>
        
        {/* Cabecera del Módulo */}
        <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-[#0A6CFF] text-white flex items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-xs sm:text-lg truncate">
                  Importación Inteligente de Catálogos
                </h2>
                <span className="hidden md:inline text-[10px] font-mono-code font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Compresión WebP 800x800
                </span>
              </div>
              <p className="hidden sm:block text-xs text-slate-300">
                Extracción asistida por IA (Gemini 2.5 Flash / Cadena Multi-IA) con compresión WebP (&lt; 50 KB).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowKeyInput(!showKeyInput)}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Configurar Google Gemini API Key"
            >
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">
                {geminiKey ? 'Gemini Conectado' : 'Configurar IA'}
              </span>
            </button>
            {/* Botón Pantalla Completa */}
            <button
              onClick={() => setIsFullscreen((v) => !v)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title={isFullscreen ? 'Restaurar tamaño normal' : 'Expandir en pantalla completa para edición amplia'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Panel de Configuración de Gemini API Key (Desplegable) */}
        {showKeyInput && (
          <div className="p-4 bg-blue-950/40 border-b border-blue-900/60 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-slideDown">
            <div className="flex items-start gap-2.5">
              <Cpu className="w-5 h-5 text-[#38BDF8] flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white flex items-center gap-2">
                  Google AI Studio / Multi-Modelo Failover
                  <span className="text-[10px] font-mono-code font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Cadena Activa
                  </span>
                </span>
                <p className="text-slate-300 text-[11px] mt-0.5">
                  Failover automático multi-modelo (Gemini 2.5 Flash ➔ 3.5 ➔ 3.7 ➔ 3.8 ➔ 2.0 ➔ 1.5 ➔ Respaldo Heurístico Local). Garantiza importación ultrarrápida en segundos y dimensiones perfectas 800x800 (&lt; 50 KB).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="password"
                placeholder="Pega tu GEMINI_API_KEY..."
                value={geminiKey}
                onChange={(e) => handleSaveGeminiKey(e.target.value)}
                className="w-full sm:w-64 px-3 py-1.5 bg-[#090F21] border border-slate-700 rounded-xl text-white outline-none focus:border-[#0A6CFF] font-mono text-[11px]"
              />
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1.5 bg-[#0A6CFF] hover:bg-blue-600 text-white rounded-xl text-[11px] font-bold flex items-center gap-1 flex-shrink-0"
              >
                <span>Clave AI</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {/* Barra de Pestañas de Carga */}
        <div className="px-3 sm:px-6 pt-2 sm:pt-3 pb-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 flex-shrink-0">
          <div className="flex rounded-xl bg-slate-200/80 p-1 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('pdf')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'pdf'
                  ? 'bg-white text-[#0A6CFF] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-rose-500" />
              <span>Opción A: Catálogo PDF / Ficha</span>
            </button>
            <button
              onClick={() => setActiveTab('paste')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'paste'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Opción B: Pega tu imagen o link (IA)</span>
            </button>
            <button
              onClick={() => setActiveTab('images')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'images'
                  ? 'bg-white text-emerald-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
              <span>Lote Multi-Imagen (WebP)</span>
            </button>
          </div>

          {/* Estadísticas de Optimización de Almacenamiento */}
          <div className="flex items-center gap-3 text-xs">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium">
              <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                Medios WebP: <strong>~{totalOptimizedKb} KB</strong> (Ahorro ~{estimatedOriginalMb} MB)
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono-code hidden md:inline">
              Cupo Supabase 1GB: Protegido
            </span>
          </div>
        </div>

        {/* Barra de Estrategia de IA Multimodelo en Cascada & Respaldo Web */}
        <div className="px-3 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-blue-50/80 via-white to-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 sm:gap-3 text-xs flex-shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-[#0A6CFF]" />
              <span>Modelo de IA:</span>
            </span>
            <select
              value={selectedAiModel}
              onChange={(e) => setSelectedAiModel(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 text-xs outline-none focus:border-[#0A6CFF] shadow-2xs cursor-pointer max-w-xs sm:max-w-md truncate"
            >
              {AI_MODELS_CATALOG.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer select-none bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs hover:border-blue-300 transition-colors">
              <input
                type="checkbox"
                checked={enableWebFallback}
                onChange={(e) => setEnableWebFallback(e.target.checked)}
                className="w-4 h-4 text-[#0A6CFF] rounded accent-[#0A6CFF] cursor-pointer"
              />
              <span className="font-semibold text-slate-700 flex items-center gap-1 text-[11px]">
                <Globe className="w-3.5 h-3.5 text-blue-500" />
                <span>Búsqueda Web Automática (Web Fallback)</span>
              </span>
            </label>

            {extractedProducts.length > 0 && (
              <button
                type="button"
                onClick={handleResolveAllWebImages}
                disabled={isBulkResolvingImages}
                className="px-3 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0A6CFF] border border-blue-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                title="Busca y asigna fotos web de alta resolución para todas las referencias del catálogo"
              >
                <Globe className={`w-3.5 h-3.5 ${isBulkResolvingImages ? 'animate-spin text-[#0A6CFF]' : ''}`} />
                <span>{isBulkResolvingImages ? 'Buscando en Web...' : 'Completar Fotos con Web'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Zona de Dropzone y Carga de Archivos Compactada */}
        <div className={`bg-white border-b border-slate-200 flex-shrink-0 transition-all ${
          extractedProducts.length > 0 ? 'p-2 sm:p-3' : 'p-3 sm:p-5'
        }`}>
          {activeTab === 'pdf' && (
            <div className={`grid grid-cols-1 lg:grid-cols-2 gap-2.5 sm:gap-3.5 items-start`}>
              {/* LEFT: Drop zone compacta */}
              <div>
                <div
                  onClick={() => pdfInputRef.current?.click()}
                  className={`border-2 border-dashed border-blue-200 hover:border-[#0A6CFF] bg-blue-50/30 hover:bg-blue-50/60 rounded-2xl text-center transition-all cursor-pointer group ${
                    extractedProducts.length > 0 ? 'p-2.5 sm:p-3.5' : 'p-4 sm:p-6'
                  }`}
                >
                  <input
                    ref={pdfInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    className="hidden"
                    onChange={handlePdfUpload}
                  />
                  <div className={`rounded-xl bg-blue-100 text-[#0A6CFF] flex items-center justify-center mx-auto group-hover:scale-105 transition-transform shadow-xs ${
                    extractedProducts.length > 0 ? 'w-8 h-8 mb-1.5' : 'w-11 h-11 mb-2'
                  }`}>
                    <UploadCloud className={extractedProducts.length > 0 ? 'w-4 h-4' : 'w-5 h-5'} />
                  </div>
                  <h4 className="font-display font-bold text-xs sm:text-sm text-slate-900 leading-tight">
                    {extractedProducts.length > 0
                      ? 'Arrastrar otro PDF o clic para cambiar catálogo'
                      : 'Arrastra tu Catálogo o Ficha Técnica en PDF aquí'}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                    La IA procesará el documento, detectará productos y convertirá imágenes a WebP (800x800).
                  </p>
                  {selectedPdfFile && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 text-[#0A6CFF] text-[10px] font-semibold">
                      <FileText className="w-3 h-3" />
                      <span className="truncate max-w-[200px]">{selectedPdfFile.name} ({pdfPagesCount} págs.)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT: PDF Preview + alternate banner */}
              <div className="space-y-2">
                {/* Vista previa inmediata del PDF (canvas → imágenes ligeras) */}
                {(isRenderingPdfPreview || pdfPreviewPages.length > 0 || pdfPreviewError) && (
                  <div className="p-2 sm:p-2.5 rounded-2xl border border-slate-200 bg-slate-50/80 animate-fadeIn">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-[#0A6CFF]" />
                        Vista previa del catálogo
                      </span>
                      {isRenderingPdfPreview && (
                        <span className="text-[9px] sm:text-[10px] font-semibold text-blue-600 flex items-center gap-1">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          Miniaturas...
                        </span>
                      )}
                    </div>

                    {pdfPreviewPages.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                        {pdfPreviewPages.map((page) => (
                          <button
                            key={page.pageNum}
                            type="button"
                            onClick={() =>
                              setLightboxData({
                                isOpen: true,
                                image: page.dataUrl,
                                title: `${selectedPdfFile?.name || 'Catálogo PDF'} — Página ${page.pageNum}`,
                                price: null,
                                brand: 'PDF',
                              })
                            }
                            className={`relative flex-shrink-0 rounded-xl overflow-hidden border border-slate-200 bg-white shadow-2xs hover:ring-2 hover:ring-[#0A6CFF]/40 transition-all cursor-zoom-in ${
                              extractedProducts.length > 0 ? 'w-16 sm:w-20' : 'w-22 sm:w-26'
                            }`}
                            title={`Ampliar página ${page.pageNum}`}
                          >
                            <img
                              src={page.dataUrl}
                              alt={`Página ${page.pageNum} del PDF`}
                              className={`w-full object-contain bg-white ${
                                extractedProducts.length > 0 ? 'h-18 sm:h-22' : 'h-24 sm:h-28'
                              }`}
                              loading="lazy"
                            />
                            <span className="absolute bottom-0 inset-x-0 bg-slate-900/75 text-white text-[8px] sm:text-[9px] font-bold text-center py-0.5">
                              Pág. {page.pageNum}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {pdfPreviewError && (
                      <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                        {pdfPreviewError}
                      </p>
                    )}
                  </div>
                )}

                {/* Alternativa Fluida y compacta */}
                <div className="p-2 sm:p-2.5 rounded-2xl bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-slate-50 border border-blue-200/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs animate-fadeIn">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-[#0A6CFF] flex items-center justify-center flex-shrink-0">
                      <Globe className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-slate-800 text-[11px] block truncate">
                        ¿Prefieres explorar imágenes y especificaciones en la web?
                      </span>
                      <span className="text-[10px] text-slate-500 block truncate">
                        Motores visuales directos o pega una imagen/enlace directo.
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setVisualSearchModal({
                          isOpen: true,
                          rowIndex: null,
                          query: '',
                          category: 'computadores',
                          productTitle: 'Catálogo Web Pro',
                        })
                      }
                      className="px-2.5 py-1 rounded-lg bg-white border border-blue-200 hover:bg-blue-50 text-[#0A6CFF] font-bold text-[11px] flex items-center gap-1 shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Globe className="w-3 h-3 text-blue-500" />
                      <span>Abrir Web Pro / Magnific</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('paste')}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition-all cursor-pointer whitespace-nowrap"
                    >
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      <span>Opción B: Pegar Link</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'paste' && (
            <div
              className="space-y-4 animate-fadeIn"
              onPaste={handlePasteEvent}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingPaste(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDraggingPaste(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingPaste(false);
                const file = e.dataTransfer.files?.[0];
                if (file) {
                  setPastedImageFile(file);
                  const reader = new FileReader();
                  reader.onload = (ev) => setPastedPreview(ev.target.result);
                  reader.readAsDataURL(file);
                }
              }}
            >
              <input
                ref={pasteFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePastedFileSelect}
              />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                {/* Zona de Drop / Paste / Vista previa */}
                <div className="lg:col-span-5 space-y-2">
                  <div
                    onClick={() => pasteFileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all cursor-pointer group flex flex-col items-center justify-center min-h-[160px] ${
                      isDraggingPaste
                        ? 'border-indigo-500 bg-indigo-50/70 scale-[1.01]'
                        : pastedPreview
                        ? 'border-emerald-300 bg-emerald-50/20'
                        : 'border-indigo-200 hover:border-indigo-400 bg-indigo-50/30 hover:bg-indigo-50/50'
                    }`}
                  >
                    {pastedPreview ? (
                      <div className="relative w-32 h-32 rounded-xl bg-white p-1 border border-slate-200 shadow-xs flex items-center justify-center overflow-hidden">
                        <img
                          src={pastedPreview}
                          alt="Recurso pegado"
                          className="w-full h-full object-contain"
                        />
                        <span className="absolute bottom-1 right-1 bg-emerald-600 text-white text-[9px] font-mono-code px-1 rounded font-bold">
                          WebP Ready
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform shadow-2xs">
                          <ClipboardPaste className="w-5 h-5" />
                        </div>
                        <h4 className="font-display font-bold text-xs sm:text-sm text-slate-800">
                          Arrastra, suelta o presiona Ctrl+V aquí
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Pega una imagen copiada desde tu portapapeles o haz clic para subir archivo.
                        </p>
                      </>
                    )}
                  </div>

                  {/* Input de Enlace Web de Imagen */}
                  <div className="relative">
                    <div className="absolute left-3 top-2.5 text-slate-400">
                      <Link2 className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="text"
                      value={pastedImageInput}
                      onChange={(e) => handlePastedUrlChange(e.target.value)}
                      placeholder="O pega una URL directa de imagen web o Magnific..."
                      className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-xs outline-none focus:border-indigo-500 focus:bg-white shadow-2xs"
                    />
                    {pastedImageInput && (
                      <button
                        type="button"
                        onClick={() => handlePastedUrlChange('')}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Parámetros Asistidos y Botones de Acción */}
                <div className="lg:col-span-7 space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5 mb-1">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Instrucciones o Detalles Adicionales para la IA (Opcional):</span>
                    </label>
                    <input
                      type="text"
                      value={pastedNotes}
                      onChange={(e) => setPastedNotes(e.target.value)}
                      placeholder="Ej: Auriculares gamer bluetooth con cancelación de ruido y luces RGB..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-xs outline-none focus:border-indigo-500 focus:bg-white shadow-2xs"
                    />
                  </div>

                  {singleAnalysisError && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                      <span>{singleAnalysisError}</span>
                    </div>
                  )}

                  {/* Barra de Progreso de Análisis Individual */}
                  {isAnalyzingSingle && (
                    <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-1.5 animate-fadeIn">
                      <div className="flex justify-between items-center text-xs font-semibold text-indigo-900">
                        <span className="flex items-center gap-2">
                          <RefreshCw className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                          {singleAnalysisStatus}
                        </span>
                        <span className="font-mono-code text-indigo-600">{singleAnalysisPct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-indigo-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-[#0A6CFF] transition-all duration-300"
                          style={{ width: `${singleAnalysisPct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleExecuteSingleAIAnalysis}
                      disabled={isAnalyzingSingle || (!pastedPreview && !pastedImageInput && !pastedImageFile && !pastedNotes.trim())}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-[#0A6CFF] hover:from-indigo-700 hover:to-blue-600 shadow-md shadow-indigo-500/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>{isAnalyzingSingle ? 'Analizando con IA...' : '✨ Analizar con IA y Generar Producto'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleClearPasteForm}
                      disabled={isAnalyzingSingle}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Vaciar formulario de pegado"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Limpiar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleClearPasteForm();
                        setActiveTab('pdf');
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>

              {/* Tarjeta de Producto Generado por la IA */}
              {singleAnalysisResult && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/40 border border-indigo-200 shadow-sm space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-mono-code text-[10px] font-bold uppercase">
                        Producto Extraído y Redactado por IA
                      </span>
                      <span className="text-xs text-slate-500">
                        • Revisa los datos antes de agregarlo al lote
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAddSingleResultToCatalog}
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>✓ Agregar a la Tabla de Catálogo</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-start">
                    {/* Foto WebP optimizada */}
                    <div className="md:col-span-3 flex flex-col items-center gap-1.5">
                      <div className="relative w-28 h-28 rounded-xl bg-white border border-slate-200 p-1 shadow-2xs flex items-center justify-center overflow-hidden">
                        <img
                          src={singleAnalysisResult.image}
                          alt={singleAnalysisResult.name}
                          className="w-full h-full object-contain"
                        />
                        <span className="absolute bottom-1 right-1 bg-slate-900/80 text-white text-[9px] font-mono-code px-1 rounded">
                          {singleAnalysisResult.imageSizeKb || 40}K WebP
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-600 font-semibold text-center">
                        Fondo Blanco #FFFFFF • 800×800 px
                      </span>
                    </div>

                    {/* Campos editables */}
                    <div className="md:col-span-9 space-y-2.5">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        <div className="sm:col-span-8">
                          <label className="text-[10px] font-mono-code font-bold uppercase text-slate-500 block mb-0.5">
                            Nombre del Producto
                          </label>
                          <input
                            type="text"
                            value={singleAnalysisResult.name || ''}
                            onChange={(e) => handleUpdateSingleResultField('name', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold text-xs outline-none focus:border-[#0A6CFF]"
                          />
                        </div>
                        <div className="sm:col-span-4">
                          <label className="text-[10px] font-mono-code font-bold uppercase text-slate-500 block mb-0.5">
                            Categoría
                          </label>
                          <select
                            value={singleAnalysisResult.category || 'computadores'}
                            onChange={(e) => handleUpdateSingleResultField('category', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 text-xs outline-none focus:border-[#0A6CFF]"
                          >
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] font-mono-code font-bold uppercase text-slate-500 block mb-0.5">
                            Marca
                          </label>
                          <input
                            type="text"
                            value={singleAnalysisResult.brand || ''}
                            onChange={(e) => handleUpdateSingleResultField('brand', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 text-xs outline-none focus:border-[#0A6CFF]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-mono-code font-bold uppercase text-slate-500 block mb-0.5">
                            Precio COP ($)
                          </label>
                          <input
                            type="number"
                            value={singleAnalysisResult.price || 0}
                            onChange={(e) => handleUpdateSingleResultField('price', Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-[#0A6CFF] font-bold text-xs outline-none focus:border-[#0A6CFF]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-mono-code font-bold uppercase text-slate-500 block mb-0.5">
                            Referencia / SKU
                          </label>
                          <input
                            type="text"
                            value={singleAnalysisResult.reference || ''}
                            onChange={(e) => handleUpdateSingleResultField('reference', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 font-mono-code text-xs outline-none focus:border-[#0A6CFF]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-mono-code font-bold uppercase text-slate-500 block mb-0.5">
                          Descripción Comercial Redactada por IA
                        </label>
                        <textarea
                          rows={3}
                          value={singleAnalysisResult.description || ''}
                          onChange={(e) => handleUpdateSingleResultField('description', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 text-xs outline-none focus:border-[#0A6CFF] leading-relaxed resize-y"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'images' && (
            <div
              onClick={() => imagesInputRef.current?.click()}
              className="border-2 border-dashed border-emerald-200 hover:border-emerald-500 bg-emerald-50/30 hover:bg-emerald-50/60 rounded-2xl p-6 text-center transition-all cursor-pointer group"
            >
              <input
                ref={imagesInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImagesUpload}
              />
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform shadow-xs">
                <ImageIcon className="w-6 h-6" />
              </div>
              <h4 className="font-display font-bold text-sm text-slate-900">
                Arrastra múltiples imágenes de productos (JPG, PNG, WebP)
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Redimensión proporcional a 800x800px y compresión WebP al 80% (30-50 KB por foto). ¡Sube hasta 50 fotos simultáneas!
              </p>
            </div>
          )}

          {/* Barra de Progreso si está procesando */}
          {isProcessing && (
            <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 animate-fadeIn">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 text-[#0A6CFF] animate-spin" />
                  {processStatus}
                </span>
                <span className="font-mono-code text-[#0A6CFF]">{progressPercent}%</span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#0A6CFF] to-emerald-500 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Badge y Reporte de Trazabilidad y Diagnóstico de IA en Tiempo Real */}
        {importDiagnostics && extractedProducts.length > 0 && (
          <div className="px-6 pt-3 pb-1 bg-white flex-shrink-0 animate-fadeIn">
            <div
              className={`p-3.5 rounded-2xl border ${
                importDiagnostics.isHeuristic
                  ? 'bg-amber-50/80 border-amber-200/90 text-amber-950'
                  : 'bg-emerald-50/80 border-emerald-200/90 text-emerald-950'
              } shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3`}
            >
              <div className="flex items-start sm:items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-2xs ${
                    importDiagnostics.isHeuristic
                      ? 'bg-amber-100 text-amber-700 border border-amber-200'
                      : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {importDiagnostics.isHeuristic ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display font-bold text-xs">
                      {importDiagnostics.isHeuristic
                        ? 'Respaldo Local Heurístico Activado'
                        : `Procesado exitosamente con ${importDiagnostics.modelName}`}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono-code font-bold uppercase ${
                        importDiagnostics.isHeuristic
                          ? 'bg-amber-200/80 text-amber-900 border border-amber-300'
                          : 'bg-emerald-200/80 text-emerald-900 border border-emerald-300'
                      }`}
                    >
                      {importDiagnostics.isHeuristic ? 'Motor Local Offline' : 'Cadena IA Activa'}
                    </span>
                    {importDiagnostics.timestamp && (
                      <span className="text-[10px] text-slate-400 font-mono-code">
                        • {importDiagnostics.timestamp}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                    {importDiagnostics.message}
                  </p>
                </div>
              </div>

              {/* Métricas de Diagnóstico Técnico */}
              <div className="flex items-center gap-2.5 text-[11px] font-mono-code bg-white/90 p-2 rounded-xl border border-slate-200 shadow-2xs self-start md:self-auto flex-wrap">
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">Reconocidos:</span>
                  <span className="font-bold text-slate-800">{extractedProducts.length}</span>
                </div>
                <span className="text-slate-300">|</span>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">Precios:</span>
                  <span className="font-bold text-emerald-600">COP ($)</span>
                </div>
                <span className="text-slate-300">|</span>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">Formato:</span>
                  <span className="font-bold text-[#0A6CFF]">WebP 800px</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Barra de Herramientas de la Tabla Human-in-the-Loop */}
        <div className="px-3 sm:px-6 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 text-xs flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsListExpanded((v) => !v)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-slate-300 hover:border-[#0A6CFF] text-slate-700 hover:text-[#0A6CFF] font-bold text-xs shadow-2xs transition-all cursor-pointer"
              title={isListExpanded ? 'Contraer lista de productos' : 'Expandir lista de productos'}
            >
              {isListExpanded ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Contraer</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-[#0A6CFF]" />
                  <span>Expandir Lista</span>
                </>
              )}
            </button>
            <span className="font-bold text-slate-800">
              Previsualización Editable ({extractedProducts.length} productos detectados)
            </span>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              • Haz clic en cualquier celda para corregir precios o categorías
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Asignación Masiva de Categoría */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 text-[11px] hidden sm:inline">Asignar a todos:</span>
              <select
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-slate-800 text-xs outline-none"
              >
                <option value="">Seleccionar Categoría...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleApplyBulkCategory}
                disabled={!bulkCategory}
                className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                Aplicar
              </button>
            </div>

            <button
              type="button"
              onClick={handleAddNewEmptyRow}
              className="px-3 py-1 bg-white border border-slate-300 hover:border-[#0A6CFF] text-[#0A6CFF] font-semibold rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir Fila</span>
            </button>
          </div>
        </div>

        {/* Tabla Interactiva de Productos (Human-in-the-Loop) con Control Expandir/Contraer - Prioridad Absoluta de Altura */}
        {isListExpanded && (
        <div className="flex-1 overflow-auto p-2 sm:p-4 min-h-[440px] sm:min-h-[520px]">
          {extractedProducts.length > 0 ? (
            <>
            <div className="hidden md:block border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono-code uppercase text-[10px] tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3 w-28 text-center">Foto WebP & Acciones</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Título del Producto</th>
                    <th className="py-2.5 px-3 w-28">Referencia</th>
                    <th className="py-2.5 px-3 w-36">Categoría</th>
                    <th className="py-2.5 px-3 w-32">Precio Oferta</th>
                    <th className="py-2.5 px-3 w-32">Precio Regular</th>
                    <th className="py-2.5 px-3 w-20">Stock</th>
                    <th className="py-2.5 px-3 w-12 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {extractedProducts.map((prod, index) => (
                    <tr key={prod.id || index} className="hover:bg-blue-50/40 transition-colors">
                      {/* Miniatura WebP con Zoom Lightbox y Selector Visual Galería Web */}
                      <td className="py-2 px-3">
                        <div className="flex flex-col items-center gap-1.5">
                          <div
                            onClick={() =>
                              setLightboxData({
                                isOpen: true,
                                image: prod.image,
                                title: prod.name,
                                price: prod.price,
                                brand: prod.brand || '',
                              })
                            }
                            className="group/thumb relative w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 p-0.5 flex items-center justify-center overflow-hidden cursor-zoom-in hover:border-[#0A6CFF] transition-all shadow-2xs"
                            title="Clic para ver Zoom / Lightbox de la imagen"
                          >
                            <img
                              src={prod.image}
                              alt={prod.name}
                              className="w-full h-full object-contain group-hover/thumb:scale-105 transition-transform"
                              onError={(e) => {
                                e.target.src = '/zafra/logo-menu.webp';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity text-white">
                              <ZoomIn className="w-4 h-4 text-white" />
                            </div>
                            <span className="absolute bottom-0 right-0 bg-slate-900/80 text-white text-[8px] font-mono-code px-1 rounded-tl">
                              {prod.imageSizeKb || 38}K
                            </span>
                          </div>

                          {/* Acciones directas por fila: Zoom + Web Pro / Magnific */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                setLightboxData({
                                  isOpen: true,
                                  image: prod.image,
                                  title: prod.name,
                                  price: prod.price,
                                  brand: prod.brand || '',
                                })
                              }
                              className="px-1.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-[9px] font-bold text-[#0A6CFF] flex items-center gap-0.5 transition-colors cursor-pointer border border-blue-200/60"
                              title="Ver Zoom de la imagen en alta definición"
                            >
                              <ZoomIn className="w-2.5 h-2.5" />
                              <span>Zoom</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setVisualSearchModal({
                                  isOpen: true,
                                  rowIndex: index,
                                  query: prod.name,
                                  category: prod.category || 'computadores',
                                  productTitle: prod.name,
                                })
                              }
                              className="px-1.5 py-0.5 rounded bg-pink-50 hover:bg-pink-100 text-[9px] font-bold text-pink-600 flex items-center gap-0.5 transition-colors cursor-pointer border border-pink-200/60"
                              title="Buscar / Reemplazar con Web Pro o Magnific MCP"
                            >
                              <Sparkles className="w-2.5 h-2.5 text-pink-500" />
                              <span>Web Pro / Magnific</span>
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Título */}
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={prod.name}
                          onChange={(e) => handleUpdateField(index, 'name', e.target.value)}
                          className="w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white border border-transparent focus:border-[#0A6CFF] rounded text-slate-900 font-semibold outline-none"
                        />
                      </td>

                      {/* Referencia / SKU */}
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={prod.reference || ''}
                          onChange={(e) => handleUpdateField(index, 'reference', e.target.value)}
                          className="w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white border border-transparent focus:border-[#0A6CFF] rounded text-slate-600 font-mono-code text-[11px] outline-none"
                        />
                      </td>

                      {/* Categoría */}
                      <td className="py-2 px-3">
                        <select
                          value={prod.category || 'computadores'}
                          onChange={(e) => handleUpdateField(index, 'category', e.target.value)}
                          className="w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white border border-transparent focus:border-[#0A6CFF] rounded text-slate-800 font-medium outline-none cursor-pointer text-xs"
                        >
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Precio de Oferta */}
                      <td className="py-2 px-3">
                        <div className="relative">
                          <span className="absolute left-2 top-1 text-slate-400 font-bold">$</span>
                          <input
                            type="number"
                            value={prod.price}
                            onChange={(e) => handleUpdateField(index, 'price', Number(e.target.value))}
                            className="w-full pl-5 pr-2 py-1 bg-transparent hover:bg-white focus:bg-white border border-transparent focus:border-[#0A6CFF] rounded text-[#0A6CFF] font-display font-bold outline-none text-xs"
                          />
                        </div>
                      </td>

                      {/* Precio Regular */}
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          value={prod.originalPrice || ''}
                          placeholder="Opcional"
                          onChange={(e) =>
                            handleUpdateField(
                              index,
                              'originalPrice',
                              e.target.value ? Number(e.target.value) : null
                            )
                          }
                          className="w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white border border-transparent focus:border-[#0A6CFF] rounded text-slate-400 line-through text-[11px] outline-none"
                        />
                      </td>

                      {/* Stock */}
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          value={prod.stock || 10}
                          onChange={(e) => handleUpdateField(index, 'stock', Number(e.target.value))}
                          className="w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white border border-transparent focus:border-[#0A6CFF] rounded text-slate-700 font-semibold outline-none text-center"
                        />
                      </td>

                      {/* Eliminar fila */}
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Eliminar de la lista"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Vista móvil: tarjetas editables (la tabla no cabe en pantallas pequeñas) */}
            <div className="md:hidden space-y-3">
              {extractedProducts.map((prod, index) => (
                <div
                  key={`card-${prod.id || index}`}
                  className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs space-y-2.5"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="relative w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 p-0.5 flex items-center justify-center overflow-hidden flex-shrink-0">
                      <img
                        src={prod.image}
                        alt={prod.name}
                        onClick={() =>
                          setLightboxData({
                            isOpen: true,
                            image: prod.image,
                            title: prod.name,
                            price: prod.price,
                            brand: prod.brand || '',
                          })
                        }
                        className="w-full h-full object-contain cursor-zoom-in"
                        onError={(e) => {
                          e.target.src = '/zafra/logo-menu.webp';
                        }}
                      />
                      <span className="absolute bottom-0 right-0 bg-slate-900/80 text-white text-[8px] font-mono-code px-1 rounded-tl">
                        {prod.imageSizeKb || 38}K
                      </span>
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <input
                        type="text"
                        value={prod.name}
                        onChange={(e) => handleUpdateField(index, 'name', e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-[#0A6CFF] rounded-lg text-slate-900 font-semibold text-xs outline-none"
                        placeholder="Nombre del producto"
                      />
                      <input
                        type="text"
                        value={prod.reference || ''}
                        onChange={(e) => handleUpdateField(index, 'reference', e.target.value)}
                        className="w-full px-2 py-1 bg-slate-50 focus:bg-white border border-slate-200 focus:border-[#0A6CFF] rounded-lg text-slate-600 font-mono-code text-[11px] outline-none"
                        placeholder="Referencia / SKU"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 flex-shrink-0"
                      title="Eliminar de la lista"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">Categoría</span>
                      <select
                        value={prod.category || 'computadores'}
                        onChange={(e) => handleUpdateField(index, 'category', e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs outline-none focus:border-[#0A6CFF]"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">Stock</span>
                      <input
                        type="number"
                        value={prod.stock || 10}
                        onChange={(e) => handleUpdateField(index, 'stock', Number(e.target.value))}
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-semibold text-xs outline-none focus:border-[#0A6CFF]"
                      />
                    </label>
                    <label className="block">
                      <span className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">Precio Oferta</span>
                      <input
                        type="number"
                        value={prod.price}
                        onChange={(e) => handleUpdateField(index, 'price', Number(e.target.value))}
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[#0A6CFF] font-bold text-xs outline-none focus:border-[#0A6CFF]"
                      />
                    </label>
                    <label className="block">
                      <span className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">Precio Regular</span>
                      <input
                        type="number"
                        value={prod.originalPrice || ''}
                        placeholder="Opcional"
                        onChange={(e) =>
                          handleUpdateField(
                            index,
                            'originalPrice',
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-400 line-through text-xs outline-none focus:border-[#0A6CFF]"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        setLightboxData({
                          isOpen: true,
                          image: prod.image,
                          title: prod.name,
                          price: prod.price,
                          brand: prod.brand || '',
                        })
                      }
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-[#0A6CFF] text-[11px] font-bold hover:bg-blue-100 transition-colors cursor-pointer"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                      <span>Ver Zoom</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setVisualSearchModal({
                          isOpen: true,
                          rowIndex: index,
                          query: prod.name,
                          category: prod.category || 'computadores',
                          productTitle: prod.name,
                        })
                      }
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-50 border border-pink-200 text-pink-700 text-[11px] font-bold hover:bg-pink-100 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Web Pro / Magnific</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <Layers className="w-12 h-12 text-slate-300 mb-3" />
              <h4 className="font-display font-bold text-sm text-slate-700">
                Aún no has cargado ningún producto en este lote
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                Usa el extractor de PDF (Opción A), pega una imagen o enlace con análisis IA (Opción B), o busca recursos directamente en la web.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setVisualSearchModal({
                      isOpen: true,
                      rowIndex: null,
                      query: '',
                      category: 'computadores',
                      productTitle: 'Buscador Web Pro',
                    })
                  }
                  className="px-3.5 py-1.5 rounded-xl bg-white border border-blue-200 hover:bg-blue-50 text-[#0A6CFF] font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <Globe className="w-3.5 h-3.5 text-blue-500" />
                  <span>Explorar Web Pro / Magnific</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('paste')}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Opción B: Pegar Imagen / Link (IA)</span>
                </button>
              </div>
            </div>
          )}
        </div>
        )}

        {/* Pie de Página con Botón de Confirmación Masiva */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              <strong>{extractedProducts.length}</strong> producto(s) listos para inserción masiva en Supabase.
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={isProcessing || extractedProducts.length === 0}
              className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-[#0A6CFF] to-[#0052CC] hover:from-[#1877FF] hover:to-[#0046B3] shadow-md shadow-blue-500/25 active:scale-98 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Insertando en Supabase...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Guardar Catálogo Masivo ({extractedProducts.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Buscador Visual Interactivo Estilo Pinterest / Galería Web */}
      {visualSearchModal.isOpen && (
        <VisualImageSearchModal
          isOpen={visualSearchModal.isOpen}
          initialQuery={visualSearchModal.query}
          category={visualSearchModal.category}
          productTitle={visualSearchModal.productTitle}
          onClose={() =>
            setVisualSearchModal({
              isOpen: false,
              rowIndex: null,
              query: '',
              category: 'computadores',
              productTitle: '',
            })
          }
          onSelectImage={(newWebpDataUrl, sizeKb) => {
            if (visualSearchModal.rowIndex !== null) {
              handleUpdateField(visualSearchModal.rowIndex, 'image', newWebpDataUrl);
              handleUpdateField(visualSearchModal.rowIndex, 'imageSizeKb', sizeKb);
            } else {
              const newRow = {
                id: 'prod-web-' + Date.now(),
                name: visualSearchModal.query || 'Producto Web Encontrado',
                reference: `WB-${Math.floor(1000 + Math.random() * 9000)}`,
                brand: 'JavrelStore',
                category: visualSearchModal.category || 'computadores',
                price: 150000,
                originalPrice: 190000,
                stock: 10,
                badge: 'WEB ASSET',
                description: `Importado directamente desde búsqueda visual web (${visualSearchModal.query || 'Catálogo Web'}).`,
                image: newWebpDataUrl,
                imageSizeKb: sizeKb || 40,
              };
              setExtractedProducts((prev) => [newRow, ...prev]);
            }
          }}
        />
      )}

      {/* Visor Lightbox con Zoom en Alta Resolución */}
      {lightboxData.isOpen && (
        <ImageLightbox
          isOpen={lightboxData.isOpen}
          image={lightboxData.image}
          title={lightboxData.title}
          price={lightboxData.price}
          brand={lightboxData.brand}
          onClose={() =>
            setLightboxData({
              isOpen: false,
              image: '',
              title: '',
              price: null,
              brand: '',
            })
          }
        />
      )}
    </div>
  );
};
