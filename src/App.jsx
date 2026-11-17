import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense, lazy } from 'react';
import { BackgroundCanvas } from './components/BackgroundCanvas';
import { Navbar } from './components/Navbar';
import { HeroBanner } from './components/HeroBanner';
import { CategoryPills } from './components/CategoryPills';
import { ProductCard } from './components/ProductCard';
import { WhatsAppRail } from './components/WhatsAppRail';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { FloatingCartWidget } from './components/FloatingCartWidget';
import { PaymentMethodsSection } from './components/PaymentMethodsSection';
import { ScrollToTop } from './components/ScrollToTop';
import { CategoryIconBar } from './components/CategoryIconBar';
import { CampaignBanner } from './components/CampaignBanner';
import { ShowcaseVideoReel } from './components/ShowcaseVideoReel';
import { CategorySidebar } from './components/CategorySidebar';
import { storeService } from './services/storeService';
import { supabase } from './supabaseClient';
import { generateUuid, isUuid, resolveCategoryLabel, sanitizeCommercialText, cleanBrand, normalizeSearchText } from './services/textUtils';
import { orderService } from './services/orderService';
import { adminAuthService } from './services/adminAuthService';
import { INITIAL_CONFIG, INITIAL_CATEGORIES, INITIAL_PRODUCTS } from './data/initialData';
import { VisualEditorProvider } from './context/VisualEditorContext';
import { PERMISSIONS } from './config/rbac';

// Code-Splitting para Carga Instantánea de la Tienda (Evita empaquetar modales de gestión pesados)
const ProductModal = lazy(() =>
  import('./components/ProductModal').then((m) => ({ default: m.ProductModal }))
);
const ImageLightbox = lazy(() =>
  import('./components/ImageLightbox').then((m) => ({ default: m.ImageLightbox }))
);
const MobileFiltersModal = lazy(() =>
  import('./components/MobileFiltersModal').then((m) => ({ default: m.MobileFiltersModal }))
);
const WixEditorTopBar = lazy(() =>
  import('./components/WixEditorTopBar').then((m) => ({ default: m.WixEditorTopBar }))
);
const InPlaceEditorToolbar = lazy(() =>
  import('./components/InPlaceEditorToolbar').then((m) => ({ default: m.InPlaceEditorToolbar }))
);
const AdminAuthModal = lazy(() =>
  import('./components/AdminAuthModal').then((m) => ({ default: m.AdminAuthModal }))
);
const AdminOrdersDashboard = lazy(() =>
  import('./components/AdminOrdersDashboard').then((m) => ({ default: m.AdminOrdersDashboard }))
);
const BulkImportModal = lazy(() =>
  import('./components/BulkImportModal').then((m) => ({ default: m.BulkImportModal }))
);
const ImagePickerModal = lazy(() =>
  import('./components/ImagePickerModal').then((m) => ({ default: m.ImagePickerModal }))
);
const StoreChatbot = lazy(() =>
  import('./components/StoreChatbot').then((m) => ({ default: m.StoreChatbot }))
);
import {
  ArrowUpDown,
  Sparkles,
  Search,
  PackageOpen,
  CheckCircle,
  Menu,
  Layers,
  LayoutGrid,
  X,
} from 'lucide-react';

const CART_STORAGE_KEY = 'super_wow_cart_items_v2';

/** Densidad de la grilla del catálogo: tarjetas por fila en desktop. */
const DENSITY_OPTIONS = [
  { id: '4', label: '4 tarjetas por fila', cols: 'xl:grid-cols-4' },
  { id: '5', label: '5 tarjetas por fila', cols: 'xl:grid-cols-5' },
  { id: '6', label: '6 tarjetas por fila', cols: 'xl:grid-cols-6' },
];

const DENSITY_STORAGE_KEY = 'javrel_catalog_density';

const readStoredDensity = () => {
  try {
    const stored = localStorage.getItem(DENSITY_STORAGE_KEY);
    return DENSITY_OPTIONS.some((option) => option.id === stored) ? stored : '4';
  } catch {
    return '4';
  }
};

/**
 * Normaliza la configuración remota/local para que ningún componente reciba
 * `undefined` en campos clave (storeName, whatsappNumber, campañas, pagos).
 */
const normalizeConfig = (raw) => ({
  ...INITIAL_CONFIG,
  ...(raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}),
});

/** Normaliza categorías: descarta nulos, duplicados e ids vacíos. */
const normalizeCategories = (raw) => {
  const list = Array.isArray(raw) ? raw : [];
  const seen = new Set();
  return list
    .filter((cat) => cat && cat.id !== undefined && cat.id !== null && String(cat.id).trim())
    .map((cat) => ({
      ...cat,
      id: String(cat.id),
      name: String(cat.name || cat.slug || cat.id),
      slug: String(cat.slug || ''),
      icon: cat.icon || 'Sparkles',
    }))
    .filter((cat) => {
      if (seen.has(cat.id)) return false;
      seen.add(cat.id);
      return true;
    });
};

/** Normaliza productos para que el filtrado/orden nunca acceda a null. */
const normalizeProducts = (raw) => {
  const list = Array.isArray(raw) ? raw : [];
  const seen = new Set();
  return list
    .filter((product) => product && product.id !== undefined && product.id !== null)
    .map((product) => ({
      ...product,
      id: String(product.id),
      name: String(product.name || product.title || 'Producto'),
      description: typeof product.description === 'string' ? product.description : '',
      brand: typeof product.brand === 'string' ? product.brand : '',
      category: product.category || 'computadores',
      price: Number(product.price) || 0,
      originalPrice:
        product.originalPrice !== null &&
        product.originalPrice !== undefined &&
        product.originalPrice !== ''
          ? Number(product.originalPrice)
          : null,
      stock: Number(product.stock ?? 10),
      specs: Array.isArray(product.specs) ? product.specs : [],
      images: Array.isArray(product.images) ? product.images : undefined,
      featured: Boolean(product.featured),
    }))
    .filter((product) => {
      if (seen.has(product.id)) return false;
      seen.add(product.id);
      return true;
    });
};

/** Carrito seguro: números válidos y cantidades positivas. */
const normalizeCartItems = (raw) => {
  const list = Array.isArray(raw) ? raw : [];
  return list
    .filter((item) => item && item.id !== undefined && item.id !== null)
    .map((item) => ({
      ...item,
      id: String(item.id),
      price: Number(item.price) || 0,
      quantity: Math.max(1, Number(item.quantity) || 1),
    }));
};


export function App() {
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [config, setConfig] = useState(INITIAL_CONFIG);

  // Estados de navegación y catálogo
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('featured'); // 'featured', 'price-asc', 'price-desc', 'name'
  const [gridDensity, setGridDensity] = useState(readStoredDensity);

  // Estados de Modales y Experiencia E-commerce
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [lightboxData, setLightboxData] = useState({
    isOpen: false,
    image: '',
    images: [],
    initialIndex: 0,
    title: '',
    price: null,
    brand: '',
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [toastMessage, setToastMessage] = useState(null);
  const toastTimeoutRef = useRef(null);

  // Notificaciones Toast centralizadas (declaradas al inicio para evitar TDZ en callbacks)
  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 3500);
  }, []);

  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Apertura centralizada del Lightbox con soporte multi-imagen y galería sincronizada
  const handleOpenLightboxModal = useCallback((prod, initialIndex = 0, customImages = null) => {
    if (!prod) return;
    const mainImg = prod.image || prod.image_url || '';
    let extraList = [];
    if (Array.isArray(customImages) && customImages.length > 0) {
      extraList = customImages.filter(Boolean);
    } else if (Array.isArray(prod.images) && prod.images.length > 0) {
      extraList = prod.images.filter(Boolean);
    } else {
      extraList = [
        prod.image,
        prod.secondaryImage,
        prod.packageImage,
        prod.detailImage,
      ].filter(Boolean);
    }
    const secondaryFiltered = extraList.filter((img) => img && img !== mainImg);
    const normalizedGallery = mainImg ? [mainImg, ...secondaryFiltered] : extraList;
    const safeGallery = normalizedGallery.length > 0 ? normalizedGallery : [mainImg || '/zafra/logo-menu.webp'];
    const safeIndex = initialIndex >= 0 && initialIndex < safeGallery.length ? initialIndex : 0;

    setLightboxData({
      isOpen: true,
      image: safeGallery[safeIndex] || mainImg,
      images: safeGallery,
      initialIndex: safeIndex,
      title: prod.name,
      price: prod.price,
      brand: prod.brand,
    });
  }, []);

  // Estados de Administrador, RBAC & Edición In-Situ
  const [adminSession, setAdminSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isOrdersDashboardOpen, setIsOrdersDashboardOpen] = useState(false);
  const [dashboardInitialTab, setDashboardInitialTab] = useState(null);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [imagePickerTarget, setImagePickerTarget] = useState(null); // { id, currentImage }
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const catalogRef = useRef(null);
  const sharedProductHandledRef = useRef('');

  const currentUser = adminSession?.user || null;
  const permissions = currentUser?.permissions || {};
  const isPrimary = Boolean(currentUser?.isPrimary);

  const can = useCallback(
    (permission) => {
      if (!currentUser) return false;
      if (currentUser.isPrimary) return true;
      return Boolean(currentUser.permissions?.[permission]);
    },
    [currentUser]
  );

  const showEditorTopBar = Boolean(isAdmin && (isPrimary || can(PERMISSIONS.EDIT_PAGE)));
  const canOpenDashboard = Boolean(
    isAdmin &&
      (isPrimary ||
        can(PERMISSIONS.POS_SALES) ||
        can(PERMISSIONS.MANAGE_PRODUCTS) ||
        can(PERMISSIONS.MANAGE_ORDERS))
  );

  // Función reutilizable de recarga forzada e invalidación de caché
  const loadStoreData = useCallback(async (forceFresh = false) => {
    try {
      const [fetchedConfig, fetchedCategories, fetchedProducts] = await Promise.all([
        storeService.getConfig(),
        storeService.getCategories(),
        storeService.getProducts({ forceFresh }),
      ]);

      if (fetchedConfig) setConfig(normalizeConfig(fetchedConfig));
      if (Array.isArray(fetchedCategories) && fetchedCategories.length > 0) {
        setCategories(normalizeCategories(fetchedCategories));
      }
      if (Array.isArray(fetchedProducts)) {
        setProducts(normalizeProducts(fetchedProducts));
      }
    } catch (err) {
      console.warn('Error sincronizando tienda:', err);
    }
  }, []);

  // Sincronización en tiempo real multi-dispositivo (Supabase Realtime + eventos de caché)
  useEffect(() => {
    let channel;
    try {
      channel = supabase
        .channel('realtime:public-products')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'products' },
          (payload) => {
            console.info('[JavrelStore Realtime] Mutación en products:', payload?.eventType);
            loadStoreData(true);
          }
        )
        .subscribe();
    } catch (realtimeErr) {
      console.warn('No se pudo inicializar Supabase Realtime:', realtimeErr);
    }

    const handleCustomSync = (e) => {
      if (e.detail?.products && Array.isArray(e.detail.products)) {
        setProducts(normalizeProducts(e.detail.products));
      } else {
        loadStoreData(true);
      }
    };
    window.addEventListener('javrelstore:products-synced', handleCustomSync);

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (_) {}
      }
      window.removeEventListener('javrelstore:products-synced', handleCustomSync);
    };
  }, [loadStoreData]);

  // Purgado forzado de caché y sincronización fresca desde la nube
  const handleForceCleanRefresh = useCallback(async () => {
    try {
      const freshProducts = await storeService.forceRefreshFromCloud();
      if (freshProducts && Array.isArray(freshProducts)) {
        setProducts(normalizeProducts(freshProducts));
      } else {
        await loadStoreData(true);
      }
      showToast('✅ Catálogo sincronizado en vivo con Supabase y caché purgada.');
    } catch (err) {
      await loadStoreData(true);
      showToast('✅ Catálogo recargado desde Supabase.');
    }
  }, [loadStoreData, showToast]);

  // 1. Cargar datos iniciales desde Supabase y la nube global
  useEffect(() => {
    async function init() {
      await loadStoreData();

      // Cargar Carrito desde localStorage
      try {
        const savedCart = localStorage.getItem(CART_STORAGE_KEY);
        if (savedCart) {
          const parsedCart = JSON.parse(savedCart);
          if (Array.isArray(parsedCart)) setCartItems(normalizeCartItems(parsedCart));
        }
      } catch (e) {
        console.warn('Error loading cart:', e);
      }

      // Restaurar sesión RBAC (Supabase Auth, sesión local o compatibilidad legacy).
      try {
        const restoredSession = await adminAuthService.restoreSession();
        if (restoredSession?.user) {
          setAdminSession(restoredSession);
          setIsAdmin(true);
        }
      } catch (sessionError) {
        console.warn('No se pudo restaurar la sesión administrativa:', sessionError);
      }

      // 🧹 Barrido de Registros Fantasma al Inicializar (Orphan Sweep silencioso en background)
      // Elimina de Supabase cualquier registro previamente marcado como purgado que pudiera
      // haber reaparecido por caché de red, sincronización cruzada o reinserción accidental.
      Promise.all([
        storeService.sweepOrphanProducts().catch(() => {}),
        orderService.sweepOrphanOrders().catch(() => {}),
      ]).then(() => {
        console.info('[JavrelStore] Orphan sweep completado al inicializar.');
      });
    }
    init();
  }, []);

  // 1b. Deep link de producto compartido: /?product_id=<id> o /?producto=<id> abre su ficha.
  useEffect(() => {
    if (!Array.isArray(products) || products.length === 0) return;

    let sharedId = '';
    try {
      const searchParams = new URLSearchParams(window.location.search);
      sharedId =
        searchParams.get('product_id') ||
        searchParams.get('producto') ||
        searchParams.get('productId') ||
        searchParams.get('p') ||
        searchParams.get('id') ||
        '';

      if (!sharedId && window.location.pathname.startsWith('/p/')) {
        sharedId = decodeURIComponent(window.location.pathname.replace(/^\/p\//, '')).trim();
      }
    } catch {
      sharedId = '';
    }

    if (!sharedId || sharedProductHandledRef.current === sharedId) return;

    const match = products.find(
      (item) =>
        String(item.id) === String(sharedId) ||
        (item.slug && String(item.slug).toLowerCase() === String(sharedId).toLowerCase()) ||
        (item.reference && String(item.reference).toLowerCase() === String(sharedId).toLowerCase())
    );
    if (!match) return;

    sharedProductHandledRef.current = sharedId;
    setSelectedProduct(match);
  }, [products]);

  // 2. Mecanismo de sincronización en caliente multi-dispositivo (al reenfocar la ventana o cada 45s)
  useEffect(() => {
    const handleSyncCheck = async () => {
      if (isAdmin && hasPendingChanges) return; // Proteger edición local del admin
      try {
        const [latestConfig, latestProducts] = await Promise.all([
          storeService.getConfig(),
          storeService.getProducts(),
        ]);
        if (latestConfig) setConfig(normalizeConfig(latestConfig));
        if (Array.isArray(latestProducts) && latestProducts.length > 0) {
          setProducts(normalizeProducts(latestProducts));
        }
      } catch {
        // Ignorar
      }
    };

    window.addEventListener('focus', handleSyncCheck);
    const interval = setInterval(handleSyncCheck, 45000);

    return () => {
      window.removeEventListener('focus', handleSyncCheck);
      clearInterval(interval);
    };
  }, [isAdmin, hasPendingChanges]);

  // 3. Escuchar atajo secreto de administrador: Ctrl + Alt + Shift + A
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const isAlt = e.altKey;
      const isShift = e.shiftKey;
      const isKeyA = e.key === 'A' || e.key === 'a' || e.code === 'KeyA';

      if (isCtrlOrCmd && isAlt && isShift && isKeyA) {
        e.preventDefault();
        setIsAuthModalOpen(true);
      }
    };

    const checkSecretRoute = () => {
      const hash = window.location.hash.toLowerCase();
      const path = window.location.pathname.toLowerCase();
      if (hash === '#admin' || path === '/admin' || window.location.search.includes('admin=true')) {
        setIsAuthModalOpen(true);
      }
    };

    checkSecretRoute();
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('hashchange', checkSecretRoute);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('hashchange', checkSecretRoute);
    };
  }, []);

  // Guardar carrito en localStorage al cambiar
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch (e) {
      console.warn('Error saving cart to local:', e);
    }
  }, [cartItems]);

  // Revalidar la sesión para revocar accesos de inmediato (focus + cada 60s).
  useEffect(() => {
    if (!isAdmin || !adminSession?.user?.id) return undefined;

    let isMounted = true;
    const validateSession = async () => {
      try {
        const restored = await adminAuthService.restoreSession();
        if (!isMounted) return;

        if (!restored) {
          setAdminSession(null);
          setIsAdmin(false);
          setIsOrdersDashboardOpen(false);
          setIsBulkImportOpen(false);
          setImagePickerTarget(null);
          showToast('Tu acceso administrativo fue revocado o desactivado.');
          return;
        }

        const permissionsChanged =
          JSON.stringify(restored.user.permissions || {}) !==
          JSON.stringify(adminSession.user.permissions || {});
        const statusChanged = restored.user.isActive !== adminSession.user.isActive;

        if (permissionsChanged || statusChanged) {
          setAdminSession(restored);
          showToast('Tus permisos de colaborador fueron actualizados.');
        }
      } catch (err) {
        console.warn('No se pudo revalidar la sesión administrativa:', err);
      }
    };

    const interval = setInterval(validateSession, 60000);
    window.addEventListener('focus', validateSession);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('focus', validateSession);
    };
  }, [isAdmin, adminSession?.user?.id, adminSession?.user?.isActive, adminSession?.user?.permissions]);

  // Acciones del Carrito
  const handleAddToCart = (product, qty = 1) => {
    if (!product || product.id === undefined || product.id === null) return;
    const safeQty = Math.max(1, Number(qty) || 1);
    setCartItems((prev) => {
      const items = Array.isArray(prev) ? prev : [];
      const existing = items.find((item) => String(item.id) === String(product.id));
      if (existing) {
        return items.map((item) =>
          String(item.id) === String(product.id)
            ? { ...item, quantity: (Number(item.quantity) || 0) + safeQty }
            : item
        );
      }
      return [...items, { ...product, price: Number(product.price) || 0, quantity: safeQty }];
    });
    showToast(`¡"${product.name || 'Producto'}" añadido al carrito!`);
  };

  const handleRemoveCartItem = (id) => {
    setCartItems((prev) =>
      (Array.isArray(prev) ? prev : []).filter((item) => String(item?.id) !== String(id))
    );
  };

  const handleUpdateCartQuantity = (id, newQty) => {
    if (newQty <= 0) {
      handleRemoveCartItem(id);
      return;
    }
    setCartItems((prev) =>
      (Array.isArray(prev) ? prev : []).map((item) =>
        String(item?.id) === String(id) ? { ...item, quantity: Math.max(1, Number(newQty) || 1) } : item
      )
    );
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  // Acciones de Edición In-Situ
  const handleUpdateProductField = (productId, field, value) => {
    if (!productId || !field) return;
    setProducts((prev) =>
      (Array.isArray(prev) ? prev : []).map((p) => {
        if (String(p.id) === String(productId)) {
          return { ...p, [field]: value };
        }
        return p;
      })
    );
    setHasPendingChanges(true);
    setPendingCount((c) => c + 1);
  };

  const handleUpdateProductStock = (productId, qtyToDeduct) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const currentStock = p.stock ?? 10;
          const newStock = Math.max(0, currentStock - qtyToDeduct);
          return { ...p, stock: newStock };
        }
        return p;
      })
    );
    setHasPendingChanges(true);
    setPendingCount((c) => c + 1);
  };

  const handleUpdateImageInSitu = (newImageUrl) => {
    if (!imagePickerTarget) return;
    handleUpdateProductField(imagePickerTarget.id, 'image', newImageUrl);
    setImagePickerTarget(null);
    showToast('Imagen actualizada in-situ.');
  };

  const handleUpdateConfigInSitu = (newConfig) => {
    setConfig(normalizeConfig(newConfig));
    setHasPendingChanges(true);
    setPendingCount((c) => c + 1);
  };

  const handleAddNewProductInSitu = async (productData) => {
    // Alta con UUID real (la columna products.id es UUID en producción) y
    // persistencia inmediata con galería completa y sincronización multi-dispositivo.
    const mainImg = productData?.image || (Array.isArray(productData?.images) ? productData.images[0] : '');
    const allImgs = Array.isArray(productData?.images) && productData.images.length > 0
      ? productData.images
      : (mainImg ? [mainImg] : []);
    const secondaryImgs = Array.isArray(productData?.additional_images) && productData.additional_images.length > 0
      ? productData.additional_images
      : allImgs.filter((img) => img !== mainImg);

    const newProduct = {
      ...productData,
      id: isUuid(productData?.id) ? productData.id : generateUuid(),
      name: String(productData?.name || '').trim(),
      description: sanitizeCommercialText(productData?.description || ''),
      brand: cleanBrand(productData?.brand),
      category: productData?.category || 'computadores',
      image: mainImg,
      image_url: mainImg,
      images: allImgs,
      additional_images: secondaryImgs,
      condition: productData?.condition || 'Nuevo',
      commercialTag: productData?.commercialTag || productData?.badge || '',
    };

    const optimisticList = [newProduct, ...products];
    setProducts(optimisticList);
    setHasPendingChanges(false);
    setPendingCount(0);

    try {
      const saved = await storeService.saveProduct(newProduct);
      const persisted = saved?.product ? { ...newProduct, ...saved.product } : newProduct;
      const finalList = [
        persisted,
        ...products.filter((p) => String(p.id) !== String(newProduct.id)),
      ];
      setProducts(finalList);

      await storeService.syncAllToSupabaseAndGlobal(finalList, categories, config);

      // Refetch automático forzado para actualizar instantáneamente catálogo y caché
      if (typeof loadStoreData === 'function') {
        await loadStoreData(false);
      }

      showToast(
        saved?.savedInSupabase
          ? '✅ Producto publicado con galería sincronizada en Supabase.'
          : '✅ Producto publicado en el catálogo. Revisa la conexión con Supabase.'
      );
    } catch (err) {
      console.warn('Error persistiendo producto nuevo:', err);
      setHasPendingChanges(true);
      setPendingCount((c) => c + 1);
      showToast('Producto agregado. Presiona "Guardar en Supabase" para reintentar la sincronización.');
    }
  };

  // Eliminación individual de producto desde panel de administración — harddelete real con confirmación irreversible
  const handleDeleteProductInSitu = async (productId) => {
    const confirmed = window.confirm(
      '⚠️ ELIMINACIÓN PERMANENTE\n\nEsta acción es irreversible y no puede deshacerse.\nEl producto será borrado definitivamente de Supabase y del catálogo.\n\n¿Deseas eliminar este producto definitivamente?'
    );
    if (!confirmed) return;

    try {
      // 1. Harddelete directo en Supabase + eliminación en Storage + notificación atómica a /api/sync-store
      await storeService.deleteProduct(productId);

      // 2. Limpiar estado reactivo local
      const updated = products.filter((p) => String(p.id).trim() !== String(productId).trim());
      setProducts(updated);
      setHasPendingChanges(false);
      setPendingCount(0);

      showToast('✅ Producto eliminado permanentemente de Supabase y Storage.');
    } catch (err) {
      console.warn('Error al eliminar producto:', err);
      const updated = products.filter((p) => String(p.id).trim() !== String(productId).trim());
      setProducts(updated);
      showToast('⚠️ Producto eliminado del catálogo local.');
    }
  };

  // Eliminación masiva de productos (Borrado duro estricto)
  const handleDeleteMultipleProductsInSitu = async (productIds) => {
    if (!productIds || productIds.length === 0) return 0;
    const idSet = new Set(productIds.map((id) => String(id).trim()));
    const updated = products.filter((p) => !idSet.has(String(p.id).trim()));
    const removedCount = products.length - updated.length;

    try {
      await storeService.deleteMultipleProducts(productIds);
      setProducts(updated);
      setHasPendingChanges(false);
      setPendingCount(0);
      showToast(`✅ ${removedCount} producto(s) eliminados definitivamente de Supabase y Storage.`);
    } catch (err) {
      console.warn('Error en eliminación masiva:', err);
      setProducts(updated);
      showToast(`⚠️ ${removedCount} producto(s) eliminados del catálogo local.`);
    }
    return removedCount;
  };

  // Autorelleno inteligente: Duplicar / Crear similar a partir de referencia
  const handleDuplicateProductInSitu = async (baseProduct) => {
    const newSimilarProduct = {
      ...baseProduct,
      id: generateUuid(),
      name: `${baseProduct.name} (Variante / Similar)`,
      reference: `${baseProduct.reference || 'REF'}-VAR`,
      stock: baseProduct.stock || 10,
    };
    await handleAddNewProductInSitu(newSimilarProduct);
    showToast(`Artículo similar creado y guardado con datos de "${baseProduct.name}".`);
  };

  // Reversión de Última Carga por PDF conectada a base de datos
  const handleRevertLastImport = async () => {
    let lastBatchIds = JSON.parse(localStorage.getItem('javrelstore_last_import_ids') || '[]');

    // Si no estaban los IDs específicos, buscar los productos importados más recientes
    if (!lastBatchIds || lastBatchIds.length === 0) {
      const importedRecent = products.filter(
        (p) => p.id && (p.id.startsWith('prod-imp-') || p.id.startsWith('prod-ai-'))
      );
      if (importedRecent.length > 0) {
        lastBatchIds = importedRecent.map((p) => p.id);
      }
    }

    if (lastBatchIds.length === 0) {
      showToast('No hay registros de catálogo masivo previo para reversar.');
      return 0;
    }

    const idSet = new Set(lastBatchIds);
    const updated = products.filter((p) => !idSet.has(p.id));
    const removedCount = products.length - updated.length;
    setProducts(updated);
    setHasPendingChanges(false);
    setPendingCount(0);
    localStorage.removeItem('javrelstore_last_import_ids');

    try {
      await storeService.syncAllToSupabaseAndGlobal(updated, categories, config);
      showToast(`¡Lote revertido! Se eliminaron ${removedCount} producto(s) de Supabase.`);
    } catch (err) {
      showToast(`Se reversaron ${removedCount} producto(s) localmente.`);
    }

    return removedCount;
  };

  const handleImportBulkProducts = async (importedProducts) => {
    // Normalizar SIEMPRE a UUID real y limpiar metadatos antes de persistir.
    const normalizedImported = (Array.isArray(importedProducts) ? importedProducts : []).map(
      (product) => ({
        ...product,
        id: isUuid(product?.id) ? product.id : generateUuid(),
        name: String(product?.name || 'Producto').trim(),
        description: sanitizeCommercialText(product?.description || ''),
        brand: cleanBrand(product?.brand),
      })
    );

    // Guardar IDs de este lote para permitir reversión
    const importedIds = normalizedImported.map((p) => p.id);
    localStorage.setItem('javrelstore_last_import_ids', JSON.stringify(importedIds));

    const updatedProducts = [...normalizedImported, ...products];
    setProducts(updatedProducts);
    setHasPendingChanges(true);
    setPendingCount((c) => c + normalizedImported.length);

    // Persistir de inmediato masivamente en Supabase y sincronización multi-dispositivo
    try {
      const result = await storeService.syncAllToSupabaseAndGlobal(
        updatedProducts,
        categories,
        config
      );
      if (Array.isArray(result?.products)) setProducts(result.products);
      setHasPendingChanges(false);
      setPendingCount(0);
      showToast(
        result?.supabaseSuccess
          ? `¡${normalizedImported.length} producto(s) importados y guardados con éxito en Supabase!`
          : `¡${normalizedImported.length} producto(s) cargados! Supabase rechazó la escritura; revisa RLS y ejecuta database/08_fix_catalog_persistence.sql.`
      );
    } catch (err) {
      console.warn('Error guardando catálogo importado:', err);
      showToast(`¡${normalizedImported.length} producto(s) cargados al catálogo! Recuerda presionar "Guardar en Supabase".`);
    }
  };

  // Guardar Cambios Obligatorio en Supabase y Sincronización Global Multi-Dispositivo
  const handleSaveChangesInSitu = async () => {
    setIsSaving(true);
    try {
      const { supabaseSuccess, visualFieldsSynced, products: normalized } =
        await storeService.syncAllToSupabaseAndGlobal(products, categories, config);
      if (Array.isArray(normalized)) setProducts(normalized);
      setHasPendingChanges(false);
      setPendingCount(0);

      if (supabaseSuccess && visualFieldsSynced) {
        showToast('¡Todos los campos sincronizados en Supabase y propagados a los dispositivos!');
      } else if (supabaseSuccess) {
        showToast(
          'Cambios guardados en Supabase. Marca/etiquetas/especificaciones quedaron en persistencia local: ejecuta database/04_product_visual_fields.sql para sincronizarlas también.'
        );
      } else {
        showToast(
          'Cambios guardados localmente y en la caché global. Supabase rechazó la escritura: ejecuta database/08_fix_catalog_persistence.sql para habilitar RLS y el esquema de texto.'
        );
      }
    } catch (err) {
      console.error('Error saving changes:', err);
      showToast('Cambios guardados localmente y en la caché global.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardChanges = async () => {
    if (confirm('¿Deseas descartar todas las modificaciones no guardadas?')) {
      const [origConfig, origProducts] = await Promise.all([
        storeService.getConfig(),
        storeService.getProducts(),
      ]);
      if (origConfig) setConfig(normalizeConfig(origConfig));
      if (origProducts) setProducts(origProducts);
      setHasPendingChanges(false);
      setPendingCount(0);
      showToast('Cambios descartados.');
    }
  };

  const handleLogoutAdmin = async () => {
    await adminAuthService.logout();
    if (window.location.hash.toLowerCase() === '#admin') {
      window.history.replaceState(null, '', window.location.pathname);
    }
    setAdminSession(null);
    setIsAdmin(false);
    setIsOrdersDashboardOpen(false);
    setIsBulkImportOpen(false);
    setImagePickerTarget(null);
    showToast('Sesión de administración cerrada.');
  };

  const handleAuthSuccess = (session) => {
    setAdminSession(session);
    setIsAdmin(true);
    setIsAuthModalOpen(false);
    const roleText = session?.user?.isPrimary
      ? 'Administrador Principal'
      : session?.user?.role === 'pos_operator'
        ? 'Operador POS'
        : session?.user?.role === 'editor'
          ? 'Editor'
          : 'Colaborador';
    showToast(`¡Bienvenido, ${roleText}! Permisos cargados correctamente.`);
  };

  // Filtrado y Ordenamiento (100% tolerante a datos nulos o incompletos)
  const filteredProducts = useMemo(() => {
    let result = (Array.isArray(products) ? products : []).filter(Boolean);

    if (activeCategory !== 'all') {
      const targetCat = normalizeSearchText(activeCategory);
      result = result.filter((p) => {
        const category = normalizeSearchText(p.category);
        const categoryName = normalizeSearchText(p.categoryName);
        const brand = normalizeSearchText(p.brand);
        const name = normalizeSearchText(p.name);
        const description = normalizeSearchText(p.description);
        const badge = normalizeSearchText(p.badge);
        return (
          category === targetCat ||
          categoryName === targetCat ||
          brand === targetCat ||
          name.includes(targetCat) ||
          description.includes(targetCat) ||
          badge.includes(targetCat)
        );
      });
    }

    const term = normalizeSearchText(searchTerm);
    if (term) {
      const keywords = term.split(/\s+/).filter(Boolean);
      result = result.filter((p) => {
        const name = normalizeSearchText(p.name);
        const brand = normalizeSearchText(p.brand);
        const description = normalizeSearchText(p.description);
        const category = normalizeSearchText(p.category);
        const categoryName = normalizeSearchText(p.categoryName);
        const reference = normalizeSearchText(p.reference || p.sku);
        const condition = normalizeSearchText(p.condition);
        const commercialTag = normalizeSearchText(p.commercialTag);
        const badge = normalizeSearchText(p.badge);
        const specs = Array.isArray(p.specs) ? p.specs.map(normalizeSearchText).join(' ') : '';
        const haystack = `${name} ${brand} ${description} ${category} ${categoryName} ${reference} ${condition} ${commercialTag} ${badge} ${specs}`;
        return keywords.every((kw) => haystack.includes(kw));
      });
    }

    if (sortBy === 'price-asc') {
      result.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    } else if (sortBy === 'name') {
      result.sort((a, b) =>
        String(a.name || '').localeCompare(String(b.name || ''), 'es', { sensitivity: 'base' })
      );
    } else {
      result.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }

    return result;
  }, [products, activeCategory, searchTerm, sortBy]);

  // Etiqueta legible del filtro activo (nunca mostrar un UUID crudo al usuario).
  const activeCategoryLabel = useMemo(() => {
    if (!activeCategory || activeCategory === 'all') return '';
    const fromCategories = resolveCategoryLabel(categories, activeCategory);
    if (fromCategories) return fromCategories;
    const fromProduct = products.find(
      (p) =>
        String(p.category || '').toLowerCase() === String(activeCategory).toLowerCase() &&
        p.categoryName
    );
    return fromProduct?.categoryName || '';
  }, [categories, products, activeCategory]);

  const totalCartCount = (Array.isArray(cartItems) ? cartItems : []).reduce(
    (acc, item) => acc + (Number(item?.quantity) || 0),
    0
  );

  const scrollToCatalog = () => {
    catalogRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDensityChange = (value) => {
    setGridDensity(value);
    try {
      localStorage.setItem(DENSITY_STORAGE_KEY, value);
    } catch {
      // Almacenamiento no disponible: la preferencia vive solo en la sesión.
    }
  };

  const densityCols =
    (DENSITY_OPTIONS.find((option) => option.id === gridDensity) || DENSITY_OPTIONS[0]).cols;

  return (
    <VisualEditorProvider
      isAdmin={isAdmin}
      permissions={permissions}
      isPrimary={isPrimary}
      adminEmail={currentUser?.email || ''}
      onShowToast={showToast}
    >
      <div className={`relative min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col selection:bg-[#0A6CFF] selection:text-white font-sans overflow-x-clip ${showEditorTopBar ? 'pt-11' : ''} ${isAdmin ? 'pb-24 sm:pb-20' : ''}`}>
        {/* Barra Superior Flotante del Modo Editor Wix / Elementor */}
        {showEditorTopBar && (
          <Suspense fallback={null}>
            <WixEditorTopBar
              currentUser={currentUser}
              can={can}
              onOpenBulkImport={() => setIsBulkImportOpen(true)}
              onOpenOrdersDashboard={(tab = null) => {
                setDashboardInitialTab(tab);
                setIsOrdersDashboardOpen(true);
              }}
              onOpenUsers={() => {
                setDashboardInitialTab('users');
                setIsOrdersDashboardOpen(true);
              }}
              onAddNewProduct={() => {
                // Abrir modal de nuevo producto
                const addBtn = document.querySelector('[data-action="add-new-product"]');
                if (addBtn) addBtn.click();
              }}
              onLogout={handleLogoutAdmin}
              onSaveStore={handleSaveChangesInSitu}
              storePendingChanges={hasPendingChanges}
            />
          </Suspense>
        )}

        {/* Fondo Inmersivo de Ondas Sinusoidales Zafiro y Platino */}
        <BackgroundCanvas />

      {/* Toast Notificación */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0B1430] text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-2.5 text-xs font-semibold animate-scaleUp">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Barra de Navegación (Oscura sobre Hero, Blanca al Bajar) */}
      <Navbar
        config={config}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        cartCount={totalCartCount}
        onOpenCart={() => setIsCartOpen(true)}
        onSecretAdminClick={() => setIsAuthModalOpen(true)}
        onOpenMobileFilters={() => setIsMobileFiltersOpen(true)}
      />

      {/* Banner de Campaña Promocional (Black Friday, Aniversario, San Valentín) */}
      <CampaignBanner
        campaign={config.activeCampaign}
        onExploreClick={scrollToCatalog}
      />

      {/* Banner Hero Oscuro e Inmersivo */}
      <HeroBanner
        config={config}
        onExploreClick={scrollToCatalog}
        isAdmin={isAdmin}
        onUpdateConfig={handleUpdateConfigInSitu}
      />

      {/* Barra de Iconos Interactivos de Categorías (Estilo Clones & Periféricos) */}
      <CategoryIconBar
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        onCategoryClickScroll={scrollToCatalog}
      />

      {/* Catálogo de Productos con Experiencia Móvil de Alta Gama & Desktop Full-Width */}
      <main ref={catalogRef} className="relative z-10 flex-1 w-full max-w-[1920px] mx-auto px-3 sm:px-5 lg:px-6 xl:pl-4 xl:pr-6 2xl:pl-6 2xl:pr-8 py-6 sm:py-8">
        <div className="flex flex-col lg:flex-row items-start gap-4 lg:gap-5 xl:gap-5">
          {/* Sidebar Lateral de Categorías Fijo y Flotante (Sticky fluido al hacer scroll) */}
          <div className="hidden lg:block self-start sticky top-24 z-30 transition-all duration-300">
            <CategorySidebar
              categories={categories}
              products={products}
              activeCategory={activeCategory}
              onSelectCategory={(catId) => {
                setActiveCategory(catId);
                scrollToCatalog();
              }}
            />
          </div>

          {/* Columna Principal: Showcase Alargado Translúcido + Buscador & Filtros + Grilla de Productos */}
          <div className="flex-1 min-w-0 w-full">
            {/* Showcase Video Reel Alargado y Translúcido (Glassmorphism Puro) */}
            <ShowcaseVideoReel />

            {/* Cabecera y Botón de Filtros Móvil */}
            <div className="lg:hidden mb-4">
              <button
                onClick={() => setIsMobileFiltersOpen(true)}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200 text-slate-800 shadow-sm active:scale-98 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[#0A6CFF]">
                    <Menu className="w-4 h-4" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold">Categorías y filtros</span>
                </div>
                <span className="text-[11px] font-mono-code font-bold text-[#0A6CFF] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  {filteredProducts.length} productos
                </span>
              </button>
            </div>

            {/* Controles de Búsqueda y Ordenamiento - Cristal Translúcido Luminoso de Alta Gama */}
            <div className="mb-6 space-y-3">
              {/* Buscador Rápido de Alta Gama */}
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[#0A6CFF] pointer-events-none transition-transform group-focus-within:scale-105">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar producto, periférico, referencia o marca..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-13 pr-10 py-3.5 text-xs sm:text-sm font-medium rounded-2xl bg-white/80 backdrop-blur-2xl border border-slate-200/90 text-slate-900 placeholder-slate-400 focus:border-[#0A6CFF] focus:bg-white focus:ring-4 focus:ring-blue-500/15 outline-none shadow-sm transition-all"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-xl transition-all"
                    title="Limpiar búsqueda"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Sub-barra: Contador de Productos y Selector de Orden con Estilo Cristal */}
              <div className="flex items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono-code font-bold uppercase tracking-wider text-slate-600 bg-white/80 backdrop-blur-md px-3 py-1 rounded-full border border-slate-200/80 shadow-2xs">
                    {filteredProducts.length} PRODUCTOS
                  </span>
                  {activeCategory !== 'all' && (
                    <button
                      onClick={() => setActiveCategory('all')}
                      className="text-[10px] font-mono-code font-semibold uppercase text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 flex items-center gap-1 transition-colors"
                      title="Quitar filtro de categoría"
                    >
                      <span>Filtro: {activeCategoryLabel || 'Categoría seleccionada'}</span>
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="hidden xl:flex items-center gap-1.5">
                    <span className="text-[11px] font-mono-code uppercase font-semibold text-slate-500">
                      VISTA:
                    </span>
                    <div className="flex items-center gap-0.5 rounded-xl border border-slate-200/90 bg-white/90 p-0.5 shadow-2xs">
                      {DENSITY_OPTIONS.map((option) => {
                        const isDensityActive = gridDensity === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => handleDensityChange(option.id)}
                            aria-pressed={isDensityActive}
                            title={option.label}
                            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                              isDensityActive
                                ? 'bg-[#0A6CFF] text-white shadow-sm'
                                : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <LayoutGrid className="w-3 h-3" />
                            {option.id}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <span className="text-[11px] font-mono-code uppercase font-semibold text-slate-500 hidden sm:inline">
                    ORDENAR POR:
                  </span>
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="py-1.5 pl-3 pr-7 rounded-xl bg-white/90 backdrop-blur-md border border-slate-200/90 text-xs text-slate-700 font-semibold outline-none appearance-none cursor-pointer hover:border-slate-300 focus:border-[#0A6CFF] transition-all shadow-2xs"
                    >
                      <option value="featured">Recomendado</option>
                      <option value="price-asc">Menor Precio</option>
                      <option value="price-desc">Mayor Precio</option>
                      <option value="name">Alfabético</option>
                    </select>
                    <ArrowUpDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Grid de Productos Móvil 2 Columnas / Desktop Amplio 4-5 Columnas */}
            {filteredProducts.length > 0 ? (
              <div className={`grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 ${densityCols} gap-3 sm:gap-4 lg:gap-4 xl:gap-5 2xl:gap-5`}>
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    config={config}
                    categories={categories}
                    isAdmin={isAdmin}
                    onQuickView={setSelectedProduct}
                    onAddToCart={handleAddToCart}
                    onOpenLightbox={handleOpenLightboxModal}
                    onOpenImagePicker={(prod) =>
                      setImagePickerTarget({ id: prod.id, currentImage: prod.image })
                    }
                    onUpdateProductField={handleUpdateProductField}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 px-4 bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200/80 shadow-md max-w-lg mx-auto">
                <PackageOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <h3 className="font-display font-bold text-lg text-slate-900 mb-1">
                  No encontramos productos
                </h3>
                <p className="text-xs text-slate-500 mb-5">
                  No hay productos que coincidan con los filtros seleccionados o tu búsqueda.
                </p>
                <button
                  onClick={() => {
                    setActiveCategory('all');
                    setSearchTerm('');
                  }}
                  className="px-5 py-2.5 rounded-full text-xs font-bold text-white bg-[#0A6CFF] hover:bg-[#0058D6] transition-colors shadow-sm cursor-pointer"
                >
                  Restablecer Filtros
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Riel Magnético Interactivo de WhatsApp */}
        <div className="mt-16">
          <WhatsAppRail config={config} />
        </div>
      </main>

      {/* Sección de Medios de Pago Seguros y Confianza */}
      <PaymentMethodsSection />

      {/* Pie de Página */}
      <Footer
        config={config}
        onSecretAdminClick={() => setIsAuthModalOpen(true)}
      />

      {/* Drawer Deslizante del Carrito con Pasarela de Pagos Completa en Línea */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        config={config}
      />

      {/* Widget de Carrito Flotante Persistente en Tiempo Real */}
      <FloatingCartWidget
        cartItems={cartItems}
        onOpenCart={() => setIsCartOpen(true)}
      />

      {/* Modal de Ficha Técnica / Vista Rápida */}
      {selectedProduct && (
        <Suspense fallback={null}>
          <ProductModal
            product={selectedProduct}
            config={config}
            isAdmin={isAdmin}
            canEdit={isAdmin && (currentUser?.isPrimary || can(PERMISSIONS.EDIT_PAGE) || can(PERMISSIONS.MANAGE_PRODUCTS))}
            onUpdateProductField={(field, val) => {
              if (selectedProduct) {
                handleUpdateProductField(selectedProduct.id, field, val);
                setSelectedProduct((prev) => (prev ? { ...prev, [field]: val } : null));
              }
            }}
            onUpdateConfig={handleUpdateConfigInSitu}
            onRefetchProducts={loadStoreData}
            onForceRefresh={handleForceCleanRefresh}
            onClose={() => setSelectedProduct(null)}
            onAddToCart={handleAddToCart}
            onOpenLightbox={handleOpenLightboxModal}
          />
        </Suspense>
      )}

      {/* Lightbox / Zoom Modal de Alta Resolución Centralizado (Estilo MercadoLibre con Galería Completa) */}
      {lightboxData.isOpen && (
        <Suspense fallback={null}>
          <ImageLightbox
            isOpen={lightboxData.isOpen}
            image={lightboxData.image}
            images={lightboxData.images}
            initialIndex={lightboxData.initialIndex}
            title={lightboxData.title}
            price={lightboxData.price}
            brand={lightboxData.brand}
            onClose={() => setLightboxData((prev) => ({ ...prev, isOpen: false }))}
          />
        </Suspense>
      )}

      <Suspense fallback={null}>
        {/* Modal Secreto de Autenticación de Administrador (Token OTP con Resend API) */}
        {isAuthModalOpen && (
          <AdminAuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            onAuthSuccess={handleAuthSuccess}
          />
        )}

        {/* Selector Rápido de Imagen In-Situ */}
        {can(PERMISSIONS.MANAGE_PRODUCTS) && imagePickerTarget && (
          <ImagePickerModal
            isOpen={!!imagePickerTarget}
            currentImage={imagePickerTarget?.currentImage}
            onSave={handleUpdateImageInSitu}
            onClose={() => setImagePickerTarget(null)}
          />
        )}

        {/* Barra de Herramientas Flotante In-Situ */}
        {isAdmin && (
          <InPlaceEditorToolbar
            currentUser={currentUser}
            can={can}
            hasPendingChanges={hasPendingChanges}
            pendingChangesCount={pendingCount}
            onSaveChanges={handleSaveChangesInSitu}
            onDiscardChanges={handleDiscardChanges}
            onAddNewProduct={handleAddNewProductInSitu}
            onOpenOrdersDashboard={(tab = null) => {
              setDashboardInitialTab(tab);
              setIsOrdersDashboardOpen(true);
            }}
            onOpenUsers={() => {
              setDashboardInitialTab('users');
              setIsOrdersDashboardOpen(true);
            }}
            onOpenBulkImport={() => setIsBulkImportOpen(true)}
            onLogout={handleLogoutAdmin}
            isSaving={isSaving}
            categories={categories}
            onAddCategory={(newCat) => {
              setCategories((prev) => {
                if (prev.some((c) => c.id === newCat.id)) return prev;
                return [...prev, newCat];
              });
              showToast(`Categoría "${newCat.name}" creada con éxito`);
            }}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        {/* Dashboard Privado de Gestión de Pedidos, Pagos QR e Inventario */}
        {canOpenDashboard && isOrdersDashboardOpen && (
          <AdminOrdersDashboard
            isOpen={isOrdersDashboardOpen}
            onClose={() => {
              setIsOrdersDashboardOpen(false);
              setDashboardInitialTab(null);
            }}
            initialTab={dashboardInitialTab}
            currentUser={currentUser}
            can={can}
            session={adminSession}
            products={products}
            onUpdateProductStock={handleUpdateProductStock}
            onUpdateProductField={handleUpdateProductField}
            onRefetchProducts={loadStoreData}
            onForceRefresh={handleForceCleanRefresh}
            onDeleteProduct={handleDeleteProductInSitu}
            onDeleteMultipleProducts={handleDeleteMultipleProductsInSitu}
            onDuplicateProduct={handleDuplicateProductInSitu}
            onAddNewProduct={handleAddNewProductInSitu}
            onRevertLastImport={handleRevertLastImport}
            config={config}
            onUpdateConfig={handleUpdateConfigInSitu}
            onOpenBulkImport={() => setIsBulkImportOpen(true)}
            categories={categories}
            onAddCategory={(newCat) => {
              setCategories((prev) => {
                if (prev.some((c) => c.id === newCat.id)) return prev;
                return [...prev, newCat];
              });
              showToast(`Categoría "${newCat.name}" creada con éxito`);
            }}
          />
        )}

        {/* Módulo de Importación Inteligente de Catálogos (PDFs e Imágenes con IA) */}
        {can(PERMISSIONS.MANAGE_PRODUCTS) && isBulkImportOpen && (
          <BulkImportModal
            isOpen={isBulkImportOpen}
            onClose={() => setIsBulkImportOpen(false)}
            onImportProducts={handleImportBulkProducts}
            categories={categories}
          />
        )}
      </Suspense>

      {/* Modal Desplegable Móvil: Categorías y Filtros con Iconos Alineados */}
      {isMobileFiltersOpen && (
        <Suspense fallback={null}>
          <MobileFiltersModal
            isOpen={isMobileFiltersOpen}
            onClose={() => setIsMobileFiltersOpen(false)}
            categories={categories}
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
            sortBy={sortBy}
            onSelectSortBy={setSortBy}
            products={products}
            onResetFilters={() => {
              setActiveCategory('all');
              setSearchTerm('');
              setSortBy('featured');
            }}
          />
        </Suspense>
      )}

      {/* Asistente Virtual Inteligente (Chatbot Soporte Store JavrelStore) */}
      <Suspense fallback={null}>
        <StoreChatbot
          products={products}
          config={config}
          onQuickView={setSelectedProduct}
          onAddToCart={handleAddToCart}
        />
      </Suspense>

      {/* Botón Flotante Minimalista "Volver Arriba" (Smooth Scroll) */}
      <ScrollToTop isAdminActive={isAdmin} />
    </div>
    </VisualEditorProvider>
  );
}

export default App;
