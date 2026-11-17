import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Save,
  Plus,
  RotateCcw,
  LogOut,
  X,
  PackagePlus,
  ClipboardList,
  UploadCloud,
  Link,
  Upload,
  Layers,
  Building,
  Users,
  Menu,
  Barcode,
  Wand2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Camera,
  Trash2,
} from 'lucide-react';
import { imageOptimizer } from '../services/imageOptimizer';
import {
  generateDescriptionFromImage,
  generateSmartCommercialDescription,
} from '../services/aiDescriptionService';
import { catalogImportService } from '../services/catalogImportService';
import { storeService } from '../services/storeService';
import { generateUuid } from '../services/textUtils';
import { webImageSearchService } from '../services/webImageSearchService';
import { erpFinanceService } from '../services/erpFinanceService';
import { VisualImageSearchModal } from './VisualImageSearchModal';
import { PERMISSIONS, getRoleLabel } from '../config/rbac';
import { useVisualEditor } from '../context/VisualEditorContext';

export const InPlaceEditorToolbar = ({
  currentUser = null,
  can = null,
  hasPendingChanges,
  pendingChangesCount,
  onSaveChanges,
  onDiscardChanges,
  onAddNewProduct,
  onOpenOrdersDashboard,
  onOpenUsers,
  onOpenBulkImport,
  onLogout,
  isSaving,
  categories = [],
  onAddCategory,
}) => {
  const { adminEmail } = useVisualEditor();

  const canAccess = (permission) => {
    if (!currentUser) return false;
    if (currentUser.isPrimary) return true;
    if (typeof can === 'function') return Boolean(can(permission));
    return Boolean(currentUser.permissions?.[permission]);
  };

  const canEditPage = canAccess(PERMISSIONS.EDIT_PAGE);
  const canManageProducts = canAccess(PERMISSIONS.MANAGE_PRODUCTS);
  const canManageOrders = canAccess(PERMISSIONS.MANAGE_ORDERS);
  const canUsePos = canAccess(PERMISSIONS.POS_SALES);
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [newProd, setNewProd] = useState({
    name: '',
    sku: '',
    category: 'computadores',
    brand: '',
    price: '',
    originalPrice: '',
    wholesalePrice: '',
    image: '/zafra/p/k1763147593434.webp',
    images: [],
    condition: 'Nuevo',
    commercialTag: '',
    description: '',
    badge: 'NUEVO',
    stock: 10,
    specs: 'Garantía 12 meses\nEnvío nacional asegurado',
    barcodes: [],
  });
  const [barcodeInput, setBarcodeInput] = useState('');
  const [imageMode, setImageMode] = useState('url'); // 'url' | 'file' | 'magnific'
  const [imagePreview, setImagePreview] = useState('');
  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const [isMagnificModalOpen, setIsMagnificModalOpen] = useState(false);
  const fileInputRef = useRef(null);
  const aiFileInputRef = useRef(null);

  // Estados de IA Vision para descripción y autocompletado completo
  const [aiDescLoading, setAiDescLoading] = useState(false);
  const [aiDescError, setAiDescError] = useState('');
  const [aiDescSuccess, setAiDescSuccess] = useState(false);
  const [aiPasteHint, setAiPasteHint] = useState('');
  const [aiProgress, setAiProgress] = useState(0);
  const [aiProgressMsg, setAiProgressMsg] = useState('');

  // Selector de 10 Imágenes alternativas encontradas en la Web
  const [suggestedImages, setSuggestedImages] = useState([]);
  const [isLoadingSuggestedImages, setIsLoadingSuggestedImages] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Zoom lightbox para imagen pegada
  const [zoomImageUrl, setZoomImageUrl] = useState('');
  const [showZoomLightbox, setShowZoomLightbox] = useState(false);

  // Imagen pegada por clipboard (preview separado del campo image del form)
  const [pastedImagePreview, setPastedImagePreview] = useState('');

  // Estados de Categorías y Marcas Dinámicas
  const [categoriesList, setCategoriesList] = useState(
    categories && categories.length > 0 ? categories : []
  );
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('Sparkles');

  const [brandsList, setBrandsList] = useState([]);
  const [showNewBrandModal, setShowNewBrandModal] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');

  // Notificación de Autocompletado Automático
  const [autoFilledInfo, setAutoFilledInfo] = useState(null);

  // Estados de Optimización de URL Externa WebP (#FFFFFF)
  const [isOptimizingUrl, setIsOptimizingUrl] = useState(false);
  const [urlStatusMsg, setUrlStatusMsg] = useState('');
  const [urlInputError, setUrlInputError] = useState('');

  // Sugerir SKU automáticamente basado en Nombre / Categoría
  const handleSuggestSku = () => {
    const suggested = erpFinanceService.generateSku(
      newProd.name || 'Nuevo Producto',
      newProd.category || 'tecnologia'
    );
    setNewProd((prev) => ({ ...prev, sku: suggested }));
  };

  // Añadir código de barras
  const handleAddBarcode = () => {
    const code = barcodeInput.trim();
    if (!code) return;
    if (newProd.barcodes?.includes(code)) {
      setBarcodeInput('');
      return;
    }
    setNewProd((prev) => ({
      ...prev,
      barcodes: [...(prev.barcodes || []), code],
    }));
    setBarcodeInput('');
  };

  // Generar código EAN-13 oficial con prefijo 770
  const handleGenerateEan = () => {
    const generated = erpFinanceService.generateEan13();
    setNewProd((prev) => ({
      ...prev,
      barcodes: [...(prev.barcodes || []), generated],
    }));
  };

  const handleRemoveBarcode = (indexToRemove) => {
    setNewProd((prev) => ({
      ...prev,
      barcodes: (prev.barcodes || []).filter((_, idx) => idx !== indexToRemove),
    }));
  };

  // 1. Botón de Limpiar Formulario (Restablecer Todos los Campos)
  const handleResetForm = () => {
    setNewProd({
      name: '',
      sku: '',
      category: categoriesList[0]?.id || 'computadores',
      brand: '',
      price: '',
      originalPrice: '',
      wholesalePrice: '',
      image: '',
      images: [],
      condition: 'Nuevo',
      commercialTag: '',
      description: '',
      badge: 'NUEVO',
      stock: 10,
      specs: 'Garantía 12 meses\nEnvío nacional asegurado',
      barcodes: [],
    });
    setSuggestedImages([]);
    setSelectedImageIndex(0);
    setPastedImagePreview('');
    setBarcodeInput('');
    setImageMode('url');
    setImagePreview('');
    setUrlInputError('');
    setUrlStatusMsg('');
    setAutoFilledInfo(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 2. Procesamiento Inmediato de URL Externa con Canvas WebP Fondo Blanco #FFFFFF
  const handleProcessExternalUrl = async (rawUrl) => {
    const url = (rawUrl || newProd.image || '').trim();
    if (!url) {
      setUrlInputError('');
      setUrlStatusMsg('');
      setNewProd((prev) => ({ ...prev, image: '' }));
      setImagePreview('');
      return;
    }

    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:')) {
      setUrlInputError('Ingresa una URL válida que empiece por http:// o https://');
      return;
    }

    setIsOptimizingUrl(true);
    setUrlInputError('');
    setUrlStatusMsg('Descargando imagen y procesando en Canvas WebP (#FFFFFF)...');
    try {
      const res = await webImageSearchService.fetchAndCompressWebP(url);
      if (res && res.dataUrl) {
        setNewProd((prev) => ({ ...prev, image: res.dataUrl }));
        setImagePreview(res.dataUrl);
        setUrlStatusMsg(
          `✅ Imagen optimizada a WebP (${res.compressedSizeKb || 40} KB, 800x800 px, fondo blanco sólido #FFFFFF).`
        );
      } else {
        setNewProd((prev) => ({ ...prev, image: url }));
        setImagePreview(url);
        setUrlStatusMsg('URL asignada directamente.');
      }
    } catch (err) {
      console.warn('Error optimizando URL externa:', err);
      setNewProd((prev) => ({ ...prev, image: url }));
      setImagePreview(url);
      setUrlInputError('Aviso: no se pudo aplicar el canvas CORS a la URL remota; se usará la URL directa.');
    } finally {
      setIsOptimizingUrl(false);
    }
  };

  // Cargar categorías y marcas dinámicas desde storeService / Supabase
  useEffect(() => {
    async function loadData() {
      try {
        const [cats, brands] = await Promise.all([
          storeService.getCategories(),
          storeService.getBrands(),
        ]);
        if (cats && cats.length > 0) setCategoriesList(cats);
        if (brands && brands.length > 0) setBrandsList(brands);
      } catch (err) {
        console.warn('Error loading dynamic metadata:', err);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (categories && categories.length > 0) {
      setCategoriesList(categories);
    }
  }, [categories]);

  const handleCreateNewCategory = async (e) => {
    e?.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      const created = await storeService.addCategory({
        name: newCategoryName.trim(),
        icon: newCategoryIcon || 'Sparkles',
      });
      if (created) {
        setCategoriesList((prev) => {
          const exists = prev.some((c) => c.id === created.id);
          return exists ? prev : [...prev, created];
        });
        setNewProd((prev) => ({ ...prev, category: created.id }));
        if (onAddCategory) onAddCategory(created);
      }
    } catch (err) {
      console.warn('Error creating category:', err);
    } finally {
      setNewCategoryName('');
      setShowNewCategoryModal(false);
    }
  };

  const handleCreateNewBrand = async (e) => {
    e?.preventDefault();
    if (!newBrandName.trim()) return;
    try {
      const created = await storeService.addBrand(newBrandName.trim());
      if (created) {
        const brandName = created.name || newBrandName.trim();
        setBrandsList((prev) => Array.from(new Set([...prev, brandName])).sort());
        setNewProd((prev) => ({ ...prev, brand: brandName }));
      }
    } catch (err) {
      console.warn('Error creating brand:', err);
    } finally {
      setNewBrandName('');
      setShowNewBrandModal(false);
    }
  };

  // ─── IA Vision: Generar descripción desde imagen (con soporte de contexto) ──
  const handleGenerateDescriptionFromImage = async (fileOrDataUrl, optionalContext = null) => {
    if (!fileOrDataUrl) return;
    setAiDescLoading(true);
    setAiDescError('');
    setAiDescSuccess(false);
    setAiPasteHint('');
    setAiProgress(30);
    setAiProgressMsg('IA Vision: Analizando imagen y redactando descripción comercial...');

    try {
      let dataUrl = '';
      if (typeof fileOrDataUrl === 'string') {
        if (fileOrDataUrl.startsWith('data:')) {
          dataUrl = fileOrDataUrl;
        } else if (fileOrDataUrl.startsWith('http://') || fileOrDataUrl.startsWith('https://')) {
          try {
            const comp = await webImageSearchService.fetchAndCompressWebP(fileOrDataUrl);
            dataUrl = comp?.dataUrl || fileOrDataUrl;
          } catch {
            dataUrl = fileOrDataUrl;
          }
        } else {
          dataUrl = fileOrDataUrl;
        }
      } else {
        const compressed = await imageOptimizer.compressToWebP(fileOrDataUrl, {
          maxSizeKb: 400,
          width: 800,
          height: 800,
        });
        dataUrl = compressed?.dataUrl || compressed;
      }

      setAiProgress(65);
      const context = optionalContext || {
        name: newProd.name,
        brand: newProd.brand,
        category: newProd.category,
      };

      const description = await generateDescriptionFromImage(dataUrl, 'image/webp', context);
      if (description) {
        setNewProd((prev) => ({ ...prev, description }));
        setAiDescSuccess(true);
        setAutoFilledInfo('✨ IA Vision: Descripción comercial generada y lista para editar.');
        setTimeout(() => {
          setAiDescSuccess(false);
          setAutoFilledInfo(null);
        }, 5000);
      }
      setAiProgress(100);
    } catch (err) {
      console.warn('AI description error:', err);
      // Fallback heurístico inteligente garantizado
      const fallbackDesc = generateSmartCommercialDescription({
        name: newProd.name,
        brand: newProd.brand,
        category: newProd.category,
      });
      setNewProd((prev) => ({ ...prev, description: fallbackDesc }));
      setAiDescSuccess(true);
      setTimeout(() => setAiDescSuccess(false), 4000);
    } finally {
      setAiDescLoading(false);
      setTimeout(() => {
        setAiProgress(0);
        setAiProgressMsg('');
      }, 1200);
    }
  };

  // ─── IA Vision FULL: Autocompletar TODOS los campos desde imagen ──────────
  const handleFullAiAutocomplete = async (fileOrDataUrl) => {
    setAiDescLoading(true);
    setAiDescError('');
    setAiDescSuccess(false);
    setAiProgress(5);
    setAiProgressMsg('Optimizando imagen...');
    setSuggestedImages([]);
    setSelectedImageIndex(0);

    try {
      let dataUrl = '';
      if (typeof fileOrDataUrl === 'string' && fileOrDataUrl.startsWith('data:')) {
        dataUrl = fileOrDataUrl;
      } else {
        const compressed = await imageOptimizer.compressToWebP(fileOrDataUrl, {
          maxWidth: 1024,
          maxHeight: 1024,
          forceSquare: true,
          backgroundColor: '#FFFFFF',
          initialQuality: 0.85,
          targetMaxKb: 60,
          padding: 24,
        });
        dataUrl = compressed?.dataUrl || compressed;
      }
      if (!dataUrl) throw new Error('No se pudo procesar la imagen.');

      // Mostrar de inmediato la imagen pegada
      setPastedImagePreview(dataUrl);
      setNewProd((prev) => ({ ...prev, image: dataUrl }));
      setImagePreview(dataUrl);
      setImageMode('file');

      setAiProgress(20);
      setAiProgressMsg('Analizando producto con Gemini Vision...');

      const result = await catalogImportService.analyzeSingleResourceWithAI(
        dataUrl,
        '',
        (pct, msg) => {
          setAiProgress(Math.min(pct, 75));
          setAiProgressMsg(msg || 'Extrayendo detalles técnicos...');
        }
      );

      // Desempaquetar respuesta de analyzeSingleResourceWithAI
      const productData = result?.product || result;

      if (productData && (productData.name || productData.description)) {
        const productName = productData.name || '';
        const productCategory = productData.category || 'accesorios';
        const productBrand = productData.brand || '';

        setNewProd((prev) => ({
          ...prev,
          name: productName || prev.name,
          description: productData.description || prev.description,
          brand: productBrand || prev.brand,
          category: productCategory || prev.category,
          price: productData.price ? String(productData.price) : prev.price,
          originalPrice: productData.originalPrice ? String(productData.originalPrice) : prev.originalPrice,
          sku: productData.reference || erpFinanceService.generateSku(productName || 'Producto', productCategory),
          specs: Array.isArray(productData.specs)
            ? productData.specs.join('\n')
            : (productData.specs || prev.specs),
          image: dataUrl,
        }));

        setAutoFilledInfo(`✨ IA Vision: Campos autocompletados para "${productName}"`);
        setTimeout(() => setAutoFilledInfo(null), 7000);
        setAiDescSuccess(true);

        // Búsqueda en paralelo de 10 imágenes alternativas de alta resolución
        setAiProgress(85);
        setAiProgressMsg('Buscando 10 imágenes alternativas en Catálogo Web...');
        setIsLoadingSuggestedImages(true);

        try {
          const queryTerm = `${productName} ${productBrand}`.trim();
          const webImages = await webImageSearchService.searchMultipleImages(queryTerm, productCategory, 12);
          if (webImages && webImages.length > 0) {
            // Limitar a máximo 10 imágenes y agregar la original pegada al principio
            const top10 = [
              { url: dataUrl, thumb: dataUrl, title: 'Imagen original pegada (Portapapeles)', isOriginal: true },
              ...webImages.slice(0, 9).map((img) => ({
                url: img.url || img.thumb,
                thumb: img.thumb || img.url,
                title: img.title || 'Catálogo Oficial Web',
              })),
            ];
            setSuggestedImages(top10);
            setSelectedImageIndex(0);
          }
        } catch (searchErr) {
          console.warn('[handleFullAiAutocomplete] Búsqueda de imágenes alternativas web:', searchErr);
        } finally {
          setIsLoadingSuggestedImages(false);
        }
      }

      setAiProgress(100);
      setAiProgressMsg('¡Producto autocompletado con éxito!');
      setTimeout(() => {
        setAiProgress(0);
        setAiProgressMsg('');
      }, 2500);
    } catch (err) {
      console.error('Full AI autocomplete error:', err);
      setAiDescError('Aviso: No se pudo conectar con Gemini Vision. Puedes completar los campos manualmente o intentar de nuevo.');
      setTimeout(() => setAiDescError(''), 8000);
      setAiProgress(0);
      setAiProgressMsg('');
    } finally {
      setAiDescLoading(false);
    }
  };

  // ─── Selector de Imagen sugerida: cambiar imagen activa + IA Vision ───────
  const handleSelectSuggestedImage = async (imgObj, index) => {
    setSelectedImageIndex(index);
    let targetImage = imgObj.url;

    if (imgObj.isOriginal) {
      setNewProd((prev) => ({ ...prev, image: imgObj.url }));
      setImagePreview(imgObj.url);
      setImageMode('file');
      targetImage = imgObj.url;
    } else {
      try {
        setIsCompressingImage(true);
        const optimized = await webImageSearchService.fetchAndCompressWebP(imgObj.url, imgObj.thumb);
        if (optimized && optimized.dataUrl) {
          targetImage = optimized.dataUrl;
          setNewProd((prev) => ({ ...prev, image: optimized.dataUrl }));
          setImagePreview(optimized.dataUrl);
          setImageMode('url');
        } else {
          setNewProd((prev) => ({ ...prev, image: imgObj.url }));
          setImagePreview(imgObj.url);
          setImageMode('url');
        }
      } catch (e) {
        console.warn('Error optimizando imagen sugerida:', e);
        setNewProd((prev) => ({ ...prev, image: imgObj.url }));
        setImagePreview(imgObj.url);
        setImageMode('url');
      } finally {
        setIsCompressingImage(false);
      }
    }

    // DISPARAR IA VISION AUTOMÁTICAMENTE AL HACER CLIC EN CUALQUIER MINIATURA
    await handleGenerateDescriptionFromImage(targetImage);
  };

  // ─── Eliminar miniatura de la galería oficial ──────────────────────────────
  const handleRemoveSuggestedImage = (e, indexToRemove) => {
    e.stopPropagation();
    const updated = suggestedImages.filter((_, idx) => idx !== indexToRemove);
    setSuggestedImages(updated);
    if (selectedImageIndex === indexToRemove) {
      const nextIdx = Math.max(0, indexToRemove - 1);
      setSelectedImageIndex(nextIdx);
      if (updated[nextIdx]) {
        const nextImg = updated[nextIdx];
        const nextUrl = nextImg.url || nextImg.thumb;
        setNewProd((prev) => ({ ...prev, image: nextUrl }));
        setImagePreview(nextUrl);
      }
    } else if (selectedImageIndex > indexToRemove) {
      setSelectedImageIndex(selectedImageIndex - 1);
    }
  };

  // ─── Ctrl+V: Interceptar imagen del portapapeles (autocompletado completo) ─
  useEffect(() => {
    if (!showNewProductModal) return;
    const handlePaste = async (e) => {
      const clipboardData = e.clipboardData;
      if (!clipboardData) return;

      // 1. Verificar si hay archivos de imagen en items
      const items = clipboardData.items;
      if (items && items.length > 0) {
        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            e.preventDefault();
            e.stopPropagation();
            const file = item.getAsFile();
            if (file) {
              setAiPasteHint('📸 Imagen detectada en portapapeles — procesando con IA Vision...');
              await handleFullAiAutocomplete(file);
              return;
            }
          }
        }
      }

      // 2. Verificar si hay archivos de imagen en files
      const files = clipboardData.files;
      if (files && files.length > 0) {
        for (const file of Array.from(files)) {
          if (file.type.startsWith('image/')) {
            e.preventDefault();
            e.stopPropagation();
            setAiPasteHint('📸 Archivo de imagen pegado — procesando con IA Vision...');
            await handleFullAiAutocomplete(file);
            return;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste, true);
    return () => window.removeEventListener('paste', handlePaste, true);
  }, [showNewProductModal]);

  const handleCreateProduct = (e) => {
    e.preventDefault();
    if (!newProd.name || !newProd.price) {
      alert('Por favor ingresa al menos nombre y precio.');
      return;
    }

    const finalSku =
      newProd.sku?.trim() ||
      erpFinanceService.generateSku(newProd.name, newProd.category);
    const finalBarcode = newProd.barcodes?.[0] || '';

    // Ensamblar galería completa de imágenes múltiples
    const rawImagesList = [
      newProd.image,
      ...suggestedImages
        .map((img) => (typeof img === 'string' ? img : img.url || img.thumb))
        .filter(Boolean),
      ...(Array.isArray(newProd.images) ? newProd.images : []),
    ];
    // Eliminar duplicados manteniendo orden
    const uniqueImages = Array.from(new Set(rawImagesList.filter(Boolean)));
    const mainImage = uniqueImages[0] || newProd.image || '/zafra/logo-menu.webp';
    const secondaryImages = uniqueImages.filter((img) => img !== mainImage);

    const payload = {
      ...newProd,
      id: generateUuid(),
      sku: finalSku,
      reference: finalSku,
      barcode: finalBarcode,
      ean: finalBarcode,
      barcodes: newProd.barcodes || [],
      price: Number(newProd.price),
      originalPrice: newProd.originalPrice ? Number(newProd.originalPrice) : null,
      wholesalePrice: newProd.wholesalePrice ? Number(newProd.wholesalePrice) : null,
      stock: Number(newProd.stock !== undefined && newProd.stock !== '' ? newProd.stock : 10),
      description: newProd.description || '',
      image: mainImage,
      image_url: mainImage,
      images: uniqueImages,
      additional_images: secondaryImages,
      condition: newProd.condition || 'Nuevo',
      commercialTag: newProd.commercialTag || newProd.badge || '',
      specs: String(newProd.specs || '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
    };

    onAddNewProduct?.(payload);
    setShowNewProductModal(false);
    handleResetForm();
  };

  const handleLocalImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsCompressingImage(true);
    try {
      const result = await imageOptimizer.compressToWebP(file, { maxWidth: 800, maxHeight: 800, quality: 0.82 });
      const dataUrl = result.dataUrl || result;
      setNewProd((prev) => ({
        ...prev,
        image: dataUrl,
        images: [dataUrl, ...(prev.images || [])],
      }));
      setImagePreview(dataUrl);
      setImageMode('file');

      // Agregar a las miniaturas oficiales de la galería
      setSuggestedImages((prev) => [
        { url: dataUrl, thumb: dataUrl, title: 'Imagen subida desde PC', isOriginal: true },
        ...prev,
      ]);
      setSelectedImageIndex(0);

      // Disparar IA Vision automáticamente sobre la nueva imagen
      await handleGenerateDescriptionFromImage(dataUrl);
    } catch (err) {
      console.warn('Error comprimiendo imagen:', err);
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const rawDataUrl = ev.target.result;
        setNewProd((prev) => ({
          ...prev,
          image: rawDataUrl,
          images: [rawDataUrl, ...(prev.images || [])],
        }));
        setImagePreview(rawDataUrl);
        setSuggestedImages((prev) => [
          { url: rawDataUrl, thumb: rawDataUrl, title: 'Imagen subida desde PC', isOriginal: true },
          ...prev,
        ]);
        setSelectedImageIndex(0);
        await handleGenerateDescriptionFromImage(rawDataUrl);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsCompressingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <>
      {/* Barra Flotante Inferior In-Situ (Optimizada y Delgada) */}
      <div className="fixed bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 z-40 w-[96%] sm:w-auto max-w-5xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-[0_10px_35px_rgba(0,0,0,0.12)] rounded-2xl sm:rounded-full py-1.5 px-2.5 sm:px-3.5 flex items-center justify-between gap-2 sm:gap-2.5 animate-slideUp">
        {/* Identidad y Estado de Sesión Compacto */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative flex items-center justify-center w-7 h-7 rounded-xl bg-[#2563eb] text-white shadow-xs shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-white" />
            <span className="absolute -right-0.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-400 border-2 border-white"></span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-[11px] font-mono-code font-bold px-2 py-0.5 rounded-md bg-[#e7f5ff] text-[#0064fe] border border-[#d0ebff] max-w-[170px] truncate" title={currentUser?.email || adminEmail}>
              {currentUser?.email || adminEmail}
            </span>
            <span className="text-[9px] font-mono-code font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200">
              {currentUser?.isPrimary ? 'PRINCIPAL' : getRoleLabel(currentUser?.role)}
            </span>
          </div>

          <span className="sm:hidden text-[11px] font-bold text-slate-800 truncate max-w-[110px]">
            {currentUser?.isPrimary ? 'Admin' : getRoleLabel(currentUser?.role) || 'Panel'}
          </span>
        </div>

        {/* Acciones y Botón Guardar (escritorio estilizado y delgado) */}
        <div className="hidden sm:flex items-center gap-1.5">
          {currentUser?.isPrimary && (
            <button
              onClick={onOpenUsers}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-[#e6fcf5] hover:bg-[#d3f9d8] text-[#087f5b] border border-[#b2f2bb] transition-all shadow-2xs cursor-pointer active:scale-95"
              title="Control de Colaboradores, roles y permisos RBAC"
            >
              <Users className="w-3.5 h-3.5 text-[#087f5b]" />
              <span>Colaboradores</span>
            </button>
          )}

          {/* Botón Importador Inteligente de Catálogos (PDFs e Imágenes) */}
          {canManageProducts && (
            <button
              onClick={onOpenBulkImport}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-[#edf2ff] hover:bg-[#dbe4ff] text-[#364fc7] border border-[#bac8ff] transition-all shadow-2xs cursor-pointer active:scale-95 text-center leading-tight"
              title="Módulo de Importación Inteligente de Catálogos (PDFs e Imágenes con IA y Compresión WebP)"
            >
              <UploadCloud className="w-3.5 h-3.5 text-[#364fc7] shrink-0" />
              <span>Importar Catálogo (IA / PDF)</span>
            </button>
          )}

          {/* Botón Gestión de Pedidos e Inventario */}
          {(canManageOrders || canUsePos || canManageProducts) && (
            <button
              onClick={() => onOpenOrdersDashboard?.()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-[#fff9db] hover:bg-[#fff3bf] text-[#78350f] border border-[#fde68a] transition-all shadow-2xs cursor-pointer active:scale-95 text-center leading-tight"
              title="Abrir Gestión de Pedidos, Pagos QR e Inventario"
            >
              <ClipboardList className="w-3.5 h-3.5 text-[#b45309] shrink-0" />
              <span>Pedidos & Stock</span>
            </button>
          )}

          {/* Botón Agregar Producto */}
          {canManageProducts && (
            <button
              data-action="add-new-product"
              onClick={() => setShowNewProductModal(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-[#f1f3f5] hover:bg-[#e9ecef] text-[#495057] border border-slate-200 transition-all shadow-2xs cursor-pointer active:scale-95 text-center leading-tight"
            >
              <Plus className="w-3 h-3 shrink-0" />
              <span>Nuevo Producto</span>
            </button>
          )}

          {/* Descartar si hay pendientes */}
          {hasPendingChanges && (canEditPage || canManageProducts) && (
            <button
              onClick={onDiscardChanges}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all shadow-2xs cursor-pointer"
              title="Descartar cambios no guardados"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Descartar</span>
            </button>
          )}

          {/* Botón Guardar Cambios (Resaltado y Compacto) */}
          {(canEditPage || canManageProducts) && (
            <button
              onClick={onSaveChanges}
              disabled={isSaving}
              className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[11px] font-bold transition-all shadow-sm active:scale-95 cursor-pointer ${
                hasPendingChanges
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/25 ring-2 ring-emerald-400/40 animate-pulse'
                  : 'bg-[#0064fe] hover:bg-[#0052cc] text-white shadow-blue-500/20'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              <span className="font-extrabold">
                {isSaving
                  ? 'Guardando...'
                  : hasPendingChanges
                  ? `Guardar (${pendingChangesCount})`
                  : 'Guardar en Supabase'}
              </span>
            </button>
          )}

          {/* Botón Salir / Logout */}
          <button
            onClick={onLogout}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Cerrar Sesión de Administrador"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Acciones compactas móviles */}
        <div className="flex sm:hidden items-center gap-1.5 shrink-0">
          {(canEditPage || canManageProducts) && (
            <button
              onClick={onSaveChanges}
              disabled={isSaving}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all shadow-md ${
                hasPendingChanges
                  ? 'bg-emerald-600 text-white ring-2 ring-emerald-400/40 animate-pulse'
                  : 'bg-[#0A6CFF] text-white'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>
                {isSaving
                  ? '...'
                  : hasPendingChanges
                  ? `Guardar (${pendingChangesCount})`
                  : 'Guardar'}
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((v) => !v)}
            className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
            title="Más acciones de administración"
            aria-label="Abrir menú de administración"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Drawer móvil de acciones */}
      {isMobileMenuOpen && (
        <>
          <div
            className="sm:hidden fixed inset-0 z-[55] bg-slate-900/30 backdrop-blur-xs"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="sm:hidden fixed inset-x-3 bottom-[76px] z-[60] bg-white rounded-2xl border border-slate-200 shadow-2xl p-2.5 animate-slideUp">
            <div className="grid grid-cols-2 gap-2">
              {currentUser?.isPrimary && (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenUsers?.();
                  }}
                  className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200"
                >
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span>Colaboradores</span>
                </button>
              )}

              {canManageProducts && (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenBulkImport?.();
                  }}
                  className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-bold bg-indigo-50 text-indigo-900 border border-indigo-200"
                >
                  <UploadCloud className="w-4 h-4 text-indigo-600" />
                  <span>Importar catálogo</span>
                </button>
              )}

              {(canManageOrders || canUsePos || canManageProducts) && (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenOrdersDashboard?.();
                  }}
                  className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200"
                >
                  <ClipboardList className="w-4 h-4 text-amber-600" />
                  <span>Pedidos &amp; Stock</span>
                </button>
              )}

              {canManageProducts && (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setShowNewProductModal(true);
                  }}
                  className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nuevo producto</span>
                </button>
              )}

              {hasPendingChanges && (canEditPage || canManageProducts) && (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onDiscardChanges?.();
                  }}
                  className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Descartar cambios</span>
                </button>
              )}

              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onLogout?.();
                }}
                className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-bold bg-slate-50 text-slate-600 border border-slate-200"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal Rápido de Nuevo Producto */}
      {showNewProductModal && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full sm:max-w-6xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-scaleUp flex flex-col h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[94dvh]">
            {/* Accent strip */}
            <div className="h-1.5 bg-gradient-to-r from-[#0A6CFF] via-[#4F46E5] to-[#7C3AED] flex-shrink-0" />
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-[#0A6CFF]/10 text-[#0A6CFF] shadow-xs">
                  <PackagePlus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-slate-900 tracking-tight leading-tight">
                    Agregar Nuevo Producto al Catálogo
                  </h3>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">
                    Modo Enterprise · ✨ Pega una foto con <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono text-[11px] text-slate-800 shadow-2xs">Ctrl + V</kbd> para autocompletar con IA Vision
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowNewProductModal(false)}
                className="p-2 rounded-full hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="p-4 sm:p-6 overflow-y-auto flex-1 text-xs">
              {/* ─── IA Vision Hero Zone ─── */}
              <div className="mb-5 p-4 rounded-2xl bg-gradient-to-br from-violet-50/80 via-blue-50/60 to-indigo-50/80 border border-violet-200/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-violet-100 text-violet-700">
                      <Wand2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-violet-900">✨ IA Vision — Autocompletado Inteligente</p>
                      <p className="text-[10px] text-violet-600 font-medium">Pega imagen (Ctrl+V) o selecciona archivo para rellenar todos los campos automáticamente</p>
                    </div>
                  </div>
                  <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border cursor-pointer transition-all ${aiDescLoading ? 'opacity-50 pointer-events-none' : 'bg-violet-600 hover:bg-violet-700 text-white border-violet-600 shadow-sm shadow-violet-500/30'}`}>
                    <Camera className="w-3.5 h-3.5" />
                    <span>Elegir imagen</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={aiDescLoading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) await handleFullAiAutocomplete(file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>

                {/* Progress bar */}
                {aiDescLoading && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-violet-700 font-semibold flex items-center gap-1.5">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        {aiProgressMsg || 'Analizando con Gemini Vision...'}
                      </span>
                      <span className="text-[10px] font-mono text-violet-500">{aiProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-violet-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${aiProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Pasted image preview with zoom & Selector de 10 Imágenes */}
                {(pastedImagePreview || suggestedImages.length > 0) && (
                  <div className="space-y-3 pt-1 border-t border-violet-200/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span className="text-xs font-bold text-slate-900">
                          {suggestedImages.length > 0
                            ? 'Selector de 10 Imágenes Oficiales (Haz clic en una miniatura para aplicarla)'
                            : 'Imagen capturada para análisis'}
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-violet-700 bg-violet-100/80 px-2 py-0.5 rounded-md">
                        {suggestedImages.length > 0 ? `${suggestedImages.length} vistas disponibles` : 'Original'}
                      </span>
                    </div>

                    {/* Retícula de 10 Vistas Previas */}
                    {suggestedImages.length > 0 ? (
                      <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 p-2 bg-white/80 rounded-2xl border border-violet-200 shadow-inner">
                        {suggestedImages.map((imgItem, idx) => {
                          const isSelected = selectedImageIndex === idx;
                          return (
                            <div key={idx} className="relative group">
                              <button
                                type="button"
                                onClick={() => handleSelectSuggestedImage(imgItem, idx)}
                                className={`w-full aspect-square rounded-xl overflow-hidden border-2 transition-all p-1 bg-white cursor-pointer flex items-center justify-center relative ${
                                  isSelected
                                    ? 'border-[#0A6CFF] ring-2 ring-[#0A6CFF]/30 shadow-md scale-105'
                                    : 'border-slate-200 hover:border-violet-400 opacity-80 hover:opacity-100'
                                }`}
                                title={imgItem.title || 'Seleccionar imagen y autocompletar con IA Vision'}
                              >
                                <img
                                  src={imgItem.thumb || imgItem.url}
                                  alt={`Opción ${idx + 1}`}
                                  className="w-full h-full object-contain"
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                                {isSelected && (
                                  <span className="absolute top-1 right-1 bg-[#0A6CFF] text-white rounded-full p-0.5 shadow-xs">
                                    <CheckCircle2 className="w-2.5 h-2.5" />
                                  </span>
                                )}
                                {imgItem.isOriginal && (
                                  <span className="absolute bottom-0.5 inset-x-0 bg-slate-900/80 text-[8px] text-white font-bold text-center py-0.2">
                                    ORIGINAL
                                  </span>
                                )}
                              </button>

                              {/* Botón Eliminar Miniatura de la Galería */}
                              <button
                                type="button"
                                onClick={(e) => handleRemoveSuggestedImage(e, idx)}
                                className="absolute -top-1 -left-1 bg-white border border-rose-300 rounded-full p-1 text-rose-500 shadow-sm opacity-0 group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-700 transition-opacity z-10 cursor-pointer"
                                title="Eliminar de la galería"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>

                              {/* Botón Lupa / Zoom sobre cada miniatura */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setZoomImageUrl(imgItem.url || imgItem.thumb);
                                  setShowZoomLightbox(true);
                                }}
                                className="absolute -top-1 -right-1 bg-white border border-slate-300 rounded-full p-1 text-slate-700 shadow-sm opacity-0 group-hover:opacity-100 hover:bg-violet-50 hover:text-violet-700 transition-opacity z-10 cursor-pointer"
                                title="Ampliar imagen"
                              >
                                <Sparkles className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Preview individual si aún no hay 10 imágenes */
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => { setZoomImageUrl(pastedImagePreview); setShowZoomLightbox(true); }}
                          className="relative group flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 border-violet-200 hover:border-violet-400 shadow-sm cursor-zoom-in transition-all"
                          title="Clic para ampliar"
                        >
                          <img src={pastedImagePreview} alt="Imagen pegada" className="w-full h-full object-contain bg-white" />
                          <div className="absolute inset-0 bg-violet-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white text-[10px] font-bold">🔍 Zoom</span>
                          </div>
                        </button>
                        <div className="flex-1">
                          {aiDescSuccess && (
                            <div className="flex items-center gap-1.5 mb-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                              <span className="text-xs text-emerald-800 font-bold">Campos autocompletados con éxito</span>
                            </div>
                          )}
                          <p className="text-xs text-slate-700 font-medium">Imagen analizada con éxito · Haz clic para ver en detalle</p>
                          <button
                            type="button"
                            onClick={() => { setPastedImagePreview(''); setSuggestedImages([]); }}
                            className="text-xs text-rose-600 hover:text-rose-800 font-bold mt-0.5 cursor-pointer"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    )}

                    {isLoadingSuggestedImages && (
                      <p className="text-xs text-violet-700 font-semibold flex items-center gap-1.5 animate-pulse">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Obteniendo vistas alternativas de alta resolución en la web...
                      </p>
                    )}
                  </div>
                )}

                {/* Hint Ctrl+V cuando no hay imagen */}
                {!pastedImagePreview && !aiDescLoading && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-violet-300 bg-violet-50/50">
                    <span className="text-violet-400 text-base">📋</span>
                    <span className="text-[11px] text-violet-700">
                      Copia cualquier imagen del producto y presiona{' '}
                      <kbd className="px-1.5 py-0.5 rounded-md bg-white border border-violet-200 font-mono text-[10px] text-violet-800 shadow-sm">Ctrl+V</kbd>
                      {' '}para rellenar todos los campos automáticamente
                    </span>
                  </div>
                )}

                {/* Error state */}
                {aiDescError && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-rose-50 border border-rose-200 rounded-xl animate-fadeIn">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                    <p className="text-[11px] text-rose-700 font-semibold">{aiDescError}</p>
                  </div>
                )}

                {/* AI paste hint */}
                {aiPasteHint && aiDescLoading && (
                  <p className="text-[10px] text-violet-600 font-semibold flex items-center gap-1 animate-pulse">
                    <Camera className="w-3 h-3" />
                    {aiPasteHint}
                  </p>
                )}
              </div>

              {/* ─── Notificación de Autocompletado ─── */}
              {autoFilledInfo && (
                <div className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 text-slate-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn mb-4">
                  <Sparkles className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>{autoFilledInfo}</span>
                </div>
              )}

              {/* ─── Grid de 2 columnas amplias: campos del formulario ─── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">

                {/* Columna Izquierda: Información Básica e Identificación */}
                <div className="space-y-4">
                  {/* Fila 1: CÓDIGO / SKU + NOMBRE */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-900">
                          CÓDIGO / SKU
                        </label>
                        <button
                          type="button"
                          onClick={handleSuggestSku}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200 transition-colors cursor-pointer"
                          title="Generar referencia corta automática basada en el producto"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Sugerir</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        value={newProd.sku || ''}
                        onChange={(e) => setNewProd({ ...newProd, sku: e.target.value.toUpperCase() })}
                        placeholder="Ej. BEB-001"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-950 placeholder:text-slate-500 focus:bg-white focus:border-[#0A6CFF] focus:ring-2 focus:ring-[#0A6CFF]/20 outline-none"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-900">
                          NOMBRE *
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            if (newProd.name.trim()) {
                              setIsMagnificModalOpen(true);
                            } else {
                              alert('Escribe primero el nombre del producto para generar su miniatura');
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200 transition-colors cursor-pointer"
                          title="Buscar miniatura oficial de alta resolución en Magnific / Web"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Buscar Foto</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        value={newProd.name}
                        onChange={(e) => {
                          const name = e.target.value;
                          setNewProd((prev) => ({
                            ...prev,
                            name,
                            sku: prev.sku ? prev.sku : erpFinanceService.generateSku(name, prev.category),
                          }));
                        }}
                        placeholder="Nombre comercial del producto..."
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-950 placeholder:text-slate-500 focus:bg-white focus:border-[#0A6CFF] focus:ring-2 focus:ring-[#0A6CFF]/20 outline-none"
                      />
                    </div>
                  </div>

                  {/* Fila 2: Categoría + Marca */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Selector de Categoría Dinámica */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-900">Categoría</label>
                        <button
                          type="button"
                          onClick={() => setShowNewCategoryModal(true)}
                          className="text-[11px] font-bold text-[#0A6CFF] hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Nueva</span>
                        </button>
                      </div>
                      <select
                        value={newProd.category}
                        onChange={(e) => {
                          if (e.target.value === '__NEW__') {
                            setShowNewCategoryModal(true);
                          } else {
                            setNewProd({ ...newProd, category: e.target.value });
                          }
                        }}
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-slate-950 bg-white font-bold text-xs focus:border-[#0A6CFF] focus:ring-2 focus:ring-[#0A6CFF]/20 outline-none"
                      >
                        {categoriesList
                          .filter((c) => c.id !== 'all')
                          .map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        <option value="__NEW__" className="text-[#0A6CFF] font-bold">
                          + Agregar Nueva Categoría...
                        </option>
                      </select>
                    </div>

                    {/* Selector de Marca Dinámica */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-900">Marca</label>
                        <button
                          type="button"
                          onClick={() => setShowNewBrandModal(true)}
                          className="text-[11px] font-bold text-[#0A6CFF] hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Nueva</span>
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          list="brands-datalist"
                          value={newProd.brand}
                          onChange={(e) => setNewProd({ ...newProd, brand: e.target.value })}
                          placeholder="Ej. Sony, Apple, Razer..."
                          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-slate-950 font-bold text-xs placeholder:text-slate-500 focus:border-[#0A6CFF] focus:ring-2 focus:ring-[#0A6CFF]/20 outline-none"
                        />
                        <datalist id="brands-datalist">
                          {brandsList.map((b) => (
                            <option key={b} value={b} />
                          ))}
                        </datalist>
                      </div>
                    </div>
                  </div>

                  {/* Fila 2b: Condición Física + Etiqueta Comercial */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Selector de Condición */}
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-900 block mb-1.5">
                        Condición del Artículo
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {['Nuevo', 'Seminuevo', 'Usado'].map((cond) => (
                          <button
                            type="button"
                            key={cond}
                            onClick={() => setNewProd((p) => ({ ...p, condition: cond }))}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              (newProd.condition || 'Nuevo') === cond
                                ? cond === 'Nuevo'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300 ring-2 ring-[#0A6CFF]'
                                  : cond === 'Seminuevo'
                                    ? 'bg-amber-100 text-amber-800 border-amber-300 ring-2 ring-[#0A6CFF]'
                                    : 'bg-slate-200 text-slate-800 border-slate-300 ring-2 ring-[#0A6CFF]'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            ● {cond}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Selector de Etiqueta Comercial */}
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-900 block mb-1.5">
                        Etiqueta Comercial
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { label: 'Sin etiqueta', value: '' },
                          { label: 'Black Friday', value: 'Black Friday' },
                          { label: 'Oferta', value: 'Oferta' },
                          { label: 'Destacado', value: 'Destacado' },
                        ].map(({ label, value }) => (
                          <button
                            type="button"
                            key={label}
                            onClick={() =>
                              setNewProd((p) => ({ ...p, commercialTag: value, badge: value }))
                            }
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                              (newProd.commercialTag || '') === value
                                ? value === 'Black Friday'
                                  ? 'bg-black text-amber-300 border-amber-400 ring-2 ring-[#0A6CFF]'
                                  : value === 'Oferta'
                                    ? 'bg-rose-100 text-rose-800 border-rose-300 ring-2 ring-[#0A6CFF]'
                                    : value
                                      ? 'bg-blue-100 text-blue-800 border-blue-300 ring-2 ring-[#0A6CFF]'
                                      : 'bg-slate-100 text-slate-600 border-slate-200 ring-2 ring-[#0A6CFF]'
                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Fila 3: DESCRIPCIÓN COMERCIAL */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-900">
                          DESCRIPCIÓN COMERCIAL
                        </label>
                        {aiDescLoading && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-violet-700 bg-violet-100 px-2 py-0.5 rounded-md animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin" /> IA Vision redactando...
                          </span>
                        )}
                        {aiDescSuccess && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                            <CheckCircle2 className="w-3 h-3" /> Generada por IA
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleGenerateDescriptionFromImage(newProd.image || imagePreview)}
                          disabled={aiDescLoading || (!newProd.image && !imagePreview)}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-violet-100 text-violet-900 border border-violet-300 hover:bg-violet-200 disabled:opacity-50 transition-colors cursor-pointer"
                          title="Redactar descripción comercial con IA Vision a partir de la foto seleccionada"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-violet-700" />
                          <span>Autocompletar con IA</span>
                        </button>
                      </div>
                    </div>

                    <textarea
                      value={newProd.description}
                      onChange={(e) => setNewProd({ ...newProd, description: e.target.value })}
                      placeholder="Redacción comercial persuasiva, beneficios clave y garantía..."
                      rows={4}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-950 placeholder:text-slate-500 focus:bg-white focus:border-[#0A6CFF] focus:ring-2 focus:ring-[#0A6CFF]/20 outline-none resize-none leading-relaxed transition-colors"
                    />
                    <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                      <span>Puedes editar libremente el texto generado en cualquier momento.</span>
                      <span className="font-mono">{newProd.description?.length || 0} caracteres</span>
                    </div>
                  </div>
                </div>

                {/* Columna Derecha: Precios, Stock e Inventario */}
                <div className="space-y-4">
                  {/* Fila Precios */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-900 mb-1.5">
                        Precio Regular / Lista ($ COP)
                      </label>
                      <input
                        type="number"
                        value={newProd.originalPrice}
                        onChange={(e) => setNewProd({ ...newProd, originalPrice: e.target.value })}
                        placeholder="1499000 (opcional)"
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-slate-950 font-bold text-xs placeholder:text-slate-500 outline-none focus:border-[#0A6CFF] focus:ring-2 focus:ring-[#0A6CFF]/20"
                      />
                      <p className="mt-1 text-[10px] font-semibold text-slate-600">
                        Precio habitual tachado de referencia.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-900 mb-1.5">
                        Precio de Oferta ($ COP) *
                      </label>
                      <input
                        type="number"
                        required
                        value={newProd.price}
                        onChange={(e) => setNewProd({ ...newProd, price: e.target.value })}
                        placeholder="1299000"
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-slate-950 focus:border-[#0A6CFF] focus:ring-2 focus:ring-[#0A6CFF]/20 outline-none font-bold text-xs"
                      />
                      <p className="mt-1 text-[10px] font-semibold text-emerald-800">
                        Valor promocional final que paga el cliente.
                      </p>
                    </div>
                  </div>

                  {/* Fila Stock y Precio por Volumen */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Card STOCK INICIAL */}
                    <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-blue-950 font-bold text-xs uppercase tracking-wider">
                          <PackagePlus className="w-4 h-4 text-[#0A6CFF]" />
                          <span>Stock Inicial</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-blue-100 text-blue-900 border border-blue-300">
                          Inventario
                        </span>
                      </div>
                      <input
                        type="number"
                        min={0}
                        value={newProd.stock}
                        onChange={(e) => setNewProd({ ...newProd, stock: e.target.value })}
                        placeholder="0 (ej. 10)"
                        className="w-full px-3.5 py-2 bg-white border border-blue-300 rounded-xl text-xs font-mono font-bold text-slate-950 focus:border-[#0A6CFF] outline-none"
                      />
                    </div>

                    {/* PRECIO POR VOLUMEN (OPCIONAL) */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-900 mb-1.5">
                        Precio por Volumen
                      </label>
                      <input
                        type="number"
                        value={newProd.wholesalePrice || ''}
                        onChange={(e) => setNewProd({ ...newProd, wholesalePrice: e.target.value })}
                        placeholder="Precio ventas al por mayor"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-950 placeholder:text-slate-500 focus:bg-white focus:border-[#0A6CFF] focus:ring-2 focus:ring-[#0A6CFF]/20 outline-none font-bold"
                      />
                      <p className="mt-1 text-[10px] font-semibold text-slate-600">Tarifa especial para compras en lote.</p>
                    </div>
                  </div>

                  {/* Card CÓDIGOS DE BARRAS / QR */}
                  <div className="p-3.5 rounded-xl bg-slate-100/70 border border-slate-300 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                        CÓDIGOS DE BARRAS / QR
                      </h4>
                      <span className="text-[10px] font-semibold text-slate-600">Escáner o cámara</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddBarcode();
                          }
                        }}
                        placeholder="Escanea o escribe código..."
                        className="flex-1 min-w-0 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-950 placeholder:text-slate-500 focus:border-[#0A6CFF] outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddBarcode}
                        className="px-3 py-2 rounded-xl text-xs font-bold bg-[#c3e6cb] hover:bg-[#b1dfba] text-[#155724] border border-[#a3d9ad] transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Añadir</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleGenerateEan}
                        className="px-3 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 border border-emerald-300 text-emerald-900 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                        <span>EAN</span>
                      </button>
                    </div>

                    {/* Caja de Códigos */}
                    <div className="p-2 rounded-xl border border-dashed border-slate-300 bg-white min-h-[38px] flex flex-wrap items-center gap-1.5">
                      {newProd.barcodes && newProd.barcodes.length > 0 ? (
                        newProd.barcodes.map((code, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-950 font-mono text-xs font-bold"
                          >
                            <Barcode className="w-3 h-3 text-emerald-800" />
                            <span>{code}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveBarcode(idx)}
                              className="text-emerald-900 hover:text-rose-700 transition-colors ml-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-slate-600 font-semibold text-center w-full py-0.5">
                          Sin códigos registrados. Búsqueda por nombre o SKU.
                        </span>
                      )}
                    </div>
                  </div>
                </div>

              </div>{/* end grid 2 columnas amplias */}

              {/* Fila Inferior Completa: Imagen del Producto */}
              <div className="mt-5 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    IMAGEN OFICIAL DEL PRODUCTO
                  </label>
                  <span className="text-[11px] font-semibold text-slate-600">
                    WebP HD #FFFFFF centrada (&lt;50KB)
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mb-2.5">
                  <button
                    type="button"
                    onClick={() => setImageMode('url')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      imageMode === 'url'
                        ? 'bg-[#0A6CFF] text-white border-[#0A6CFF] shadow-xs'
                        : 'bg-white text-slate-600 border-slate-300 hover:border-[#0A6CFF]'
                    }`}
                  >
                    <Link className="w-3.5 h-3.5" />
                    <span>🔗 URL Externa</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setImageMode('file');
                      fileInputRef.current?.click();
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      imageMode === 'file'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-300 hover:border-emerald-500'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>📂 Subir desde PC (WebP)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setImageMode('magnific');
                      setIsMagnificModalOpen(true);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      imageMode === 'magnific'
                        ? 'bg-pink-600 text-white border-pink-600 shadow-xs'
                        : 'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100 hover:border-pink-300'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                    <span>🔍 Catálogo Web Magnific</span>
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLocalImageUpload}
                />

                {/* VÍA 1: URL Externa con Optimización Inmediata Canvas WebP #FFFFFF */}
                {imageMode === 'url' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={newProd.image}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNewProd({ ...newProd, image: val });
                            setImagePreview(val);
                            if (val.startsWith('http://') || val.startsWith('https://')) {
                              if (
                                val.length > 15 &&
                                (val.includes('.jpg') ||
                                  val.includes('.png') ||
                                  val.includes('.webp') ||
                                  val.includes('magnific') ||
                                  val.includes('unsplash') ||
                                  val.includes('freepik'))
                              ) {
                                handleProcessExternalUrl(val);
                              }
                            }
                          }}
                          onPaste={(e) => {
                            const pasted = e.clipboardData.getData('text');
                            if (
                              pasted &&
                              (pasted.startsWith('http://') || pasted.startsWith('https://'))
                            ) {
                              setTimeout(() => handleProcessExternalUrl(pasted), 50);
                            }
                          }}
                          placeholder="Pega enlace de imagen (Magnific o web): https://..."
                          className="w-full pl-3 pr-8 py-2 border border-slate-300 rounded-xl text-slate-900 focus:border-[#0A6CFF] outline-none text-xs shadow-2xs font-mono-code"
                        />
                        {newProd.image && (
                          <button
                            type="button"
                            onClick={() => {
                              setNewProd({ ...newProd, image: '' });
                              setImagePreview('');
                              setUrlStatusMsg('');
                              setUrlInputError('');
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                            title="Limpiar campo"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={!newProd.image || isOptimizingUrl}
                        onClick={() => handleProcessExternalUrl(newProd.image)}
                        className="px-3 py-2 bg-[#0A6CFF] hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap transition-all"
                        title="Procesar y convertir inmediatamente a WebP (<50KB) con fondo blanco sólido #FFFFFF"
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${isOptimizingUrl ? 'animate-spin' : ''}`} />
                        <span>{isOptimizingUrl ? 'Optimizando...' : 'Optimizar WebP'}</span>
                      </button>
                    </div>

                    {/* Mensajes de validación o éxito */}
                    {urlStatusMsg && (
                      <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 animate-fadeIn">
                        <span>{urlStatusMsg}</span>
                      </p>
                    )}
                    {urlInputError && (
                      <p className="text-[11px] font-medium text-amber-600 flex items-center gap-1 animate-fadeIn">
                        <span>{urlInputError}</span>
                      </p>
                    )}

                    {imagePreview && (
                      <div className="flex items-center gap-3 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                        <img
                          src={imagePreview}
                          alt="preview"
                          className="w-14 h-14 object-contain bg-white rounded-lg border border-slate-200 p-1 shadow-2xs"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            setUrlInputError('Aviso: la imagen externa no permite previsualización directa.');
                          }}
                        />
                        <div className="flex-1 overflow-hidden space-y-0.5">
                          <span className="text-[10px] font-mono-code font-bold uppercase text-slate-400 block">
                            Vista Previa en Tiempo Real
                          </span>
                          <span className="text-[11px] text-slate-700 truncate block font-medium">
                            {imagePreview.startsWith('data:')
                              ? 'Lienzo WebP Comprimido (<50KB)'
                              : imagePreview}
                          </span>
                          <span className="text-[10px] text-blue-600 font-semibold block">
                            Fondo blanco sólido #FFFFFF • Centrado 800×800 px
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* VÍA 2: Subida desde Archivo Local */}
                {imageMode === 'file' && (
                  <div className="flex items-center gap-3 p-3 border border-dashed border-emerald-300 bg-emerald-50/40 rounded-xl">
                    {isCompressingImage ? (
                      <div className="text-xs text-emerald-600 font-semibold animate-pulse">
                        🔄 Preprocesando en Canvas a WebP 800x800...
                      </div>
                    ) : imagePreview ? (
                      <>
                        <img
                          src={imagePreview}
                          alt="preview"
                          className="w-14 h-14 object-contain bg-white rounded-lg border border-slate-200 p-1 shadow-xs"
                        />
                        <div className="flex-1">
                          <p className="text-xs text-emerald-700 font-semibold">
                            ✅ Imagen optimizada a WebP (&lt;50KB)
                          </p>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-[10px] text-slate-500 underline mt-0.5 cursor-pointer hover:text-slate-800"
                          >
                            Cambiar imagen
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 text-xs text-emerald-700 font-semibold cursor-pointer"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Seleccionar imagen del computador</span>
                      </button>
                    )}
                  </div>
                )}

                {/* VÍA 3: Catálogo Web Magnific (/v1/resources) */}
                {imageMode === 'magnific' && (
                  <div className="flex items-center gap-3 p-3 border border-pink-200 bg-pink-50/50 rounded-xl">
                    {imagePreview || newProd.image ? (
                      <img
                        src={imagePreview || newProd.image}
                        alt="preview"
                        className="w-14 h-14 object-contain rounded-lg bg-white border border-pink-200 p-1 shadow-xs"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-pink-100 flex items-center justify-center text-pink-600">
                        <Sparkles className="w-6 h-6" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-xs text-pink-700 font-bold flex items-center gap-1">
                        <span>⚡</span> Foto asignada desde Catálogo Magnific (WebP)
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsMagnificModalOpen(true)}
                        className="text-[10px] text-pink-600 underline font-semibold hover:text-pink-800 mt-0.5 cursor-pointer"
                      >
                        Abrir Catálogo Magnific y Elegir Foto
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-3 border-t border-slate-100 sticky bottom-0 bg-white pb-1">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                  title="Vaciar todos los campos y reiniciar el formulario"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
                  <span>Limpiar Formulario</span>
                </button>

                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowNewProductModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-[#0A6CFF] to-[#0052CC] hover:from-[#0052CC] hover:to-[#003E9C] shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                  >
                    <PackagePlus className="w-3.5 h-3.5" />
                    Publicar Producto
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Zoom Lightbox para imagen pegada */}
      {showZoomLightbox && zoomImageUrl && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn"
          onClick={() => setShowZoomLightbox(false)}
        >
          <div className="relative max-w-3xl max-h-[90dvh] w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <img
              src={zoomImageUrl}
              alt="Vista ampliada"
              className="w-full h-auto max-h-[80dvh] object-contain rounded-2xl shadow-2xl bg-white"
            />
            <button
              onClick={() => setShowZoomLightbox(false)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center text-slate-700 hover:bg-rose-50 hover:text-rose-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal Flotante: Agregar Nueva Categoría */}
      {showNewCategoryModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-sm max-h-[92dvh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-slate-200 p-5 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-blue-50 text-[#0A6CFF]">
                  <Layers className="w-4 h-4" />
                </div>
                <h4 className="font-display font-bold text-sm text-slate-900">
                  + Nueva Categoría
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowNewCategoryModal(false)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewCategory} className="pt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre de la Categoría
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Ej. Audio & Sonido, Estuches, Wearables..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl text-slate-900 focus:border-[#0A6CFF] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Ícono Representativo
                </label>
                <select
                  value={newCategoryIcon}
                  onChange={(e) => setNewCategoryIcon(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white text-slate-800 outline-none"
                >
                  <option value="Sparkles">✨ Destacados / Sparkles</option>
                  <option value="Headphones">🎧 Audio / Audífonos</option>
                  <option value="Smartphone">📱 Celulares & Estuches</option>
                  <option value="Laptop">💻 Laptops & Computadores</option>
                  <option value="Gamepad2">🎮 Zona Gamer & Consolas</option>
                  <option value="Tv">📺 Pantallas & TV</option>
                  <option value="Printer">🖨️ Impresoras</option>
                  <option value="Shield">🛡️ Seguridad & Protección</option>
                  <option value="Package">📦 Accesorios & Otros</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewCategoryModal(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-[#0A6CFF] hover:bg-blue-600 shadow-xs cursor-pointer"
                >
                  Crear y Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Flotante: Agregar Nueva Marca */}
      {showNewBrandModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-sm max-h-[92dvh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-slate-200 p-5 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-emerald-50 text-emerald-600">
                  <Building className="w-4 h-4" />
                </div>
                <h4 className="font-display font-bold text-sm text-slate-900">
                  + Nueva Marca
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowNewBrandModal(false)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewBrand} className="pt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre de la Marca
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  placeholder="Ej. Anker, JBL, Spigen, SteelSeries..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl text-slate-900 focus:border-emerald-600 outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewBrandModal(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs cursor-pointer"
                >
                  Guardar Marca
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Buscador Web Pro conectado a Magnific (/v1/resources) y Pinterest */}
      {isMagnificModalOpen && (
        <VisualImageSearchModal
          isOpen={isMagnificModalOpen}
          onClose={() => setIsMagnificModalOpen(false)}
          initialQuery={newProd.name}
          category={newProd.category}
          productTitle={newProd.name || 'Nuevo Producto'}
          onSelectImage={(newWebp, sizeKb, meta) => {
            const rawTitle = meta?.title || meta?.searchTerm || '';
            const cleanTitle = rawTitle
              .replace(/\.[a-zA-Z0-9]+$/, '')
              .replace(/^[A-Za-z0-9_-]{12,}\s*/, '')
              .replace(/#\d+/, '')
              .trim();

            setNewProd((prev) => {
              const updatedName =
                (!prev.name.trim() || prev.name === 'Nuevo Producto') && cleanTitle
                  ? cleanTitle
                  : prev.name || cleanTitle;

              const commercialDescription =
                (!prev.description.trim() && updatedName)
                  ? `${updatedName} 100% original con garantía oficial de 12 meses. Diseño de alta durabilidad, rendimiento superior y despacho nacional asegurado con JavrelStore.`
                  : prev.description;

              return {
                ...prev,
                image: newWebp,
                name: updatedName,
                description: commercialDescription,
              };
            });

            if (cleanTitle) {
              setAutoFilledInfo(`✨ Nombre y descripción comercial autocompletados desde "${cleanTitle}"`);
              setTimeout(() => setAutoFilledInfo(null), 5000);
            }

            setImagePreview(newWebp);
            setImageMode('magnific');
            setIsMagnificModalOpen(false);

            // Agregar a miniaturas de galería y disparar IA Vision
            setSuggestedImages((prev) => [
              { url: newWebp, thumb: newWebp, title: cleanTitle || 'Catálogo Magnific', isOriginal: false },
              ...prev,
            ]);
            setSelectedImageIndex(0);
            handleGenerateDescriptionFromImage(newWebp, {
              name: cleanTitle || newProd.name,
              brand: newProd.brand,
              category: newProd.category,
            });
          }}
        />
      )}
    </>
  );
};
