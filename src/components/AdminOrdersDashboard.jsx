import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Eye,
  MessageCircle,
  RefreshCw,
  QrCode,
  DollarSign,
  TrendingUp,
  Boxes,
  Minus,
  Plus,
  Save,
  Check,
  ExternalLink,
  Upload,
  UploadCloud,
  Sparkles,
  Flame,
  Heart,
  PartyPopper,
  Tag,
  Zap,
  Archive,
  Trash2,
  FileText,
  FileCheck,
  Copy,
  Edit3,
  RotateCcw,
  CheckSquare,
  Square,
  Barcode,
  ShoppingCart,
  Printer,
  Calculator,
  User,
  Users,
  Menu,
  Phone,
  CreditCard,
  Banknote,
  Camera,
  ZoomIn,
  Receipt,
  Percent,
  Palette,
  Shield,
  Rocket,
  ShoppingBag,
  TrendingDown,
  Scale,
  Gift,
  ShieldCheck,
  Share2,
  Images,
} from 'lucide-react';
import { orderService } from '../services/orderService';
import { invoiceService } from '../services/invoiceService';
import { formatCurrency, buildWhatsAppUrl, storeService } from '../services/storeService';
import { imageOptimizer } from '../services/imageOptimizer';
import { ImageLightbox } from './ImageLightbox';
import { VisualImageSearchModal } from './VisualImageSearchModal';
import { AdminUsersPanel } from './AdminUsersPanel';
import { AdminPaymentQrModal } from './AdminPaymentQrModal';
import { AdminPurchasesPanel } from './AdminPurchasesPanel';
import { AdminCreditsPanel } from './AdminCreditsPanel';
import { SocialShareModal } from './SocialShareModal';
import { GalleryManagerStrip } from './GalleryManagerStrip';
import { erpFinanceService } from '../services/erpFinanceService';
import { PERMISSIONS, getRoleLabel } from '../config/rbac';
import { normalizeSearchText } from '../services/textUtils';

export const AdminOrdersDashboard = ({
  isOpen,
  onClose,
  initialTab = null,
  currentUser = null,
  can = null,
  session = null,
  products = [],
  onUpdateProductStock,
  onUpdateProductField,
  onRefetchProducts,
  onForceRefresh = null,
  onDeleteProduct,
  onDeleteMultipleProducts,
  onDuplicateProduct,
  onAddNewProduct = null,
  onRevertLastImport,
  config = {},
  onUpdateConfig,
  onOpenBulkImport,
  categories = [],
  onAddCategory = null,
}) => {
  // Pestañas disponibles según el rol/permisos: 'pos' | 'orders' | 'archived_orders' |
  // 'inventory' | 'purchases' | 'credits' | 'promotions' | 'qr_settings' | 'users'
  const [activeTab, setActiveTab] = useState('inventory');
  const [isMobileTabsOpen, setIsMobileTabsOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [archivedOrders, setArchivedOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'Pendiente' | 'Aprobado' | 'Rechazado'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProofImage, setSelectedProofImage] = useState(null);
  const [notification, setNotification] = useState(null);

  // Estados para Módulos ERP, Filtros de Inventario y QR Interactivo
  const [qrSubTab, setQrSubTab] = useState('qrs'); // 'qrs' | 'terminals' | 'gateways'
  const [activeQrModalData, setActiveQrModalData] = useState(null);
  const [inventoryFilter, setInventoryFilter] = useState('active'); // 'active' | 'trash' | 'all'
  const [inventoryBarcodeInput, setInventoryBarcodeInput] = useState('');
  const [selectedInventoryCategory, setSelectedInventoryCategory] = useState('all');

  // Estados de Selección Múltiple para Eliminación Masiva
  const [selectedProductIds, setSelectedProductIds] = useState([]);

  // Estados para Pistola de Código de Barras (Barcode Scanner)
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scannedFeedback, setScannedFeedback] = useState(null);
  const barcodeScannerBuffer = useRef('');
  const lastKeyTimeRef = useRef(0);

  // Estados de Caja POS (Punto de Venta)
  const [posCart, setPosCart] = useState([]);
  const [posPaymentMethod, setPosPaymentMethod] = useState('Efectivo');
  const [posCashReceived, setPosCashReceived] = useState('');
  const [posCustomerName, setPosCustomerName] = useState('Cliente Mostrador');
  const [posCustomerPhone, setPosCustomerPhone] = useState('');
  const [posCustomerEmail, setPosCustomerEmail] = useState('');
  const [posSearchTerm, setPosSearchTerm] = useState('');

  // Estados Avanzados de Caja POS Comercial (Impuestos, Descuentos y Modal de Cobro)
  const [isPosCheckoutOpen, setIsPosCheckoutOpen] = useState(false);
  const [posEmissionType, setPosEmissionType] = useState('ticket'); // 'ticket' | 'electronic'
  const [posPaymentTerm, setPosPaymentTerm] = useState('Contado'); // 'Contado' | 'Crédito'
  const [posPaymentEntity, setPosPaymentEntity] = useState('CAJA : CAJA PRINCIPAL');
  const [posDiscountType, setPosDiscountType] = useState('percent'); // 'percent' | 'fixed'
  const [posDiscountValue, setPosDiscountValue] = useState('');
  const [posCustomerDocType, setPosCustomerDocType] = useState('Cédula ciudadanía');
  const [posCustomerDoc, setPosCustomerDoc] = useState('');
  const [posRemisionCode, setPosRemisionCode] = useState('REM - 5234');
  const [posNotes, setPosNotes] = useState('');

  // Estado para Visualizador de Imagen Original (Lightbox con Zoom)
  const [lightboxData, setLightboxData] = useState({
    isOpen: false,
    image: '',
    title: '',
    price: null,
    brand: '',
  });

  // Centro de Difusión Multicanal para la tabla de inventario
  const [shareProduct, setShareProduct] = useState(null);

  // Modal de confirmación irreversible
  const [deleteModalConfig, setDeleteModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    action: null,
  });

  // Modal para edición completa de producto
  const [editingProduct, setEditingProduct] = useState(null);
  const [brandsList, setBrandsList] = useState([]);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryDraft, setNewCategoryDraft] = useState('');
  const [showNewBrandInput, setShowNewBrandInput] = useState(false);
  const [newBrandDraft, setNewBrandDraft] = useState('');
  const [isSavingMeta, setIsSavingMeta] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [visualGalleryModal, setVisualGalleryModal] = useState({
    isOpen: false,
    query: '',
    category: 'computadores',
    productTitle: '',
  });

  // Cargar marcas dinámicas para el selector del modal de edición.
  useEffect(() => {
    let active = true;
    storeService
      .getBrands()
      .then((list) => {
        if (active && Array.isArray(list)) setBrandsList(list);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Estados para configuración QR y subida de imagen local
  const [qrUrl, setQrUrl] = useState(config.qrPaymentImageUrl || '');
  const [bankAccount, setBankAccount] = useState(config.paymentBankAccount || '');
  const [nequiPhone, setNequiPhone] = useState(config.paymentNequiPhone || '');
  const [titular, setTitular] = useState(config.paymentTitular || '');
  const [wompiLlaveBreve, setWompiLlaveBreve] = useState(config.wompiLlaveBreve || '');
  const [wompiPublicKey, setWompiPublicKey] = useState(config.wompiPublicKey || '');
  const [wompiCheckoutUrl, setWompiCheckoutUrl] = useState(config.wompiCheckoutUrl || '');
  const [paypalPaymentLink, setPaypalPaymentLink] = useState(config.paypalPaymentLink || '');
  const [paypalBusinessEmail, setPaypalBusinessEmail] = useState(config.paypalBusinessEmail || '');
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isOptimizingQr, setIsOptimizingQr] = useState(false);
  const qrFileInputRef = useRef(null);

  // Estados para Módulo de Promociones y Selector de Color
  const activeCamp = config.activeCampaign || {};
  const [promoEnabled, setPromoEnabled] = useState(activeCamp.enabled ?? false);
  const [promoName, setPromoName] = useState(activeCamp.name || 'Black Friday');
  const [promoBadge, setPromoBadge] = useState(activeCamp.badge || '🔥 BLACK FRIDAY');
  const [promoDiscount, setPromoDiscount] = useState(activeCamp.discountPercent || 20);
  const [promoBanner, setPromoBanner] = useState(
    activeCamp.bannerText || '🔥 ¡TEMPORADA BLACK FRIDAY EN JavrelStore! HASTA 25% OFF'
  );
  const [promoCategory, setPromoCategory] = useState(activeCamp.targetCategory || 'all');
  const [promoTheme, setPromoTheme] = useState(activeCamp.theme || 'black_friday');
  const [promoColor, setPromoColor] = useState(activeCamp.customColor || '#0A6CFF');

  // Resolver permisos del usuario actual. `can` se pasa desde App; si no,
  // se evalúa directamente contra el perfil.
  const hasAccess = useMemo(() => {
    return (permission) => {
      if (!currentUser) return true;
      if (currentUser.isPrimary) return true;
      if (typeof can === 'function') return Boolean(can(permission));
      return Boolean(currentUser.permissions?.[permission]);
    };
  }, [currentUser, can]);

  // ─── Cálculos derivados (declarados ANTES de tabMeta) ─────────────────────
  // Las insignias de las pestañas consumen estos valores durante el render.
  // Si se declaran después del objeto `tabMeta`, el motor de JavaScript lanza
  // `ReferenceError: Cannot access '...' before initialization` (TDZ) y el
  // panel administrativo cae en la pantalla de recuperación.
  const filteredProductsList = products.filter((p) => {
    const stock = Number(p?.stock) || 0;
    if (inventoryFilter === 'active' && stock <= 0) return false;
    if (inventoryFilter === 'trash' && stock > 0) return false;

    if (selectedInventoryCategory && selectedInventoryCategory !== 'all') {
      if (String(p?.category).toLowerCase() !== String(selectedInventoryCategory).toLowerCase()) {
        return false;
      }
    }

    if (inventoryBarcodeInput.trim()) {
      const bcode = String(p?.barcode || p?.ean || p?.reference || p?.sku || '').toLowerCase();
      if (!bcode.includes(inventoryBarcodeInput.trim().toLowerCase())) return false;
    }

    if (!searchTerm) return true;
    const term = normalizeSearchText(searchTerm);
    return (
      normalizeSearchText(p?.name).includes(term) ||
      normalizeSearchText(p?.reference).includes(term) ||
      normalizeSearchText(p?.sku).includes(term) ||
      normalizeSearchText(p?.barcode).includes(term) ||
      normalizeSearchText(p?.brand).includes(term) ||
      normalizeSearchText(p?.category).includes(term)
    );
  });

  const isPendingStatus = (status) =>
    status === 'Pendiente' || status === 'pendiente_verificacion';
  const isApprovedStatus = (status) =>
    status === 'Aprobado' || status === 'pagado';

  const filteredOrders = orders.filter((o) => {
    const matchesStatus =
      filterStatus === 'all' ||
      o?.payment_status === filterStatus ||
      (filterStatus === 'Pendiente' && isPendingStatus(o?.payment_status)) ||
      (filterStatus === 'Aprobado' && isApprovedStatus(o?.payment_status));
    const term = normalizeSearchText(searchTerm);
    const matchesSearch =
      !searchTerm ||
      normalizeSearchText(o?.reference_code).includes(term) ||
      normalizeSearchText(o?.customer_name).includes(term) ||
      normalizeSearchText(o?.customer_phone).includes(term);
    return matchesStatus && matchesSearch;
  });

  const pendingOrdersCount = orders.filter((o) => isPendingStatus(o?.payment_status)).length;
  const criticalStockCount = products.filter((p) => (Number(p?.stock) || 0) < 5).length;

  // Cálculos Financieros para Tarjetas de Métricas ERP (Estilo Pastel Enterprise)
  const erpTotalVentas = useMemo(() => {
    return orders.reduce((sum, o) => sum + (Number(o?.total_amount) || 0), 0);
  }, [orders]);

  const erpTotalPorCobrar = useMemo(() => {
    return orders
      .filter((o) => isPendingStatus(o?.payment_status))
      .reduce((sum, o) => sum + (Number(o?.total_amount) || 0), 0);
  }, [orders]);

  const erpTotalVentasBrutas = useMemo(() => {
    return orders
      .filter((o) => isApprovedStatus(o?.payment_status))
      .reduce((sum, o) => sum + (Number(o?.total_amount) || 0), 0);
  }, [orders]);

  const erpPurchasesList = useMemo(() => {
    try {
      return erpFinanceService.getPurchases() || [];
    } catch {
      return [];
    }
  }, [activeTab]);

  const erpTotalEgresos = useMemo(() => {
    return erpPurchasesList.reduce((sum, p) => sum + (Number(p?.total) || 0), 0);
  }, [erpPurchasesList]);

  const erpTotalPorPagar = useMemo(() => {
    return erpPurchasesList
      .filter((p) => p?.status === 'Pendiente')
      .reduce((sum, p) => sum + (Number(p?.total) || 0), 0);
  }, [erpPurchasesList]);

  const erpTotalPagado = useMemo(() => {
    return erpPurchasesList
      .filter((p) => p?.status === 'Pagada' || !p?.status)
      .reduce((sum, p) => sum + (Number(p?.total) || 0), 0);
  }, [erpPurchasesList]);

  const erpBalanceNeto = erpTotalVentas - erpTotalEgresos;
  const erpMargenNeto =
    erpTotalVentas > 0 ? Math.round((erpBalanceNeto / erpTotalVentas) * 100) : 0;

  const availableTabs = useMemo(() => {
    const tabs = [];
    if (hasAccess(PERMISSIONS.POS_SALES)) tabs.push('pos');
    if (hasAccess(PERMISSIONS.MANAGE_PRODUCTS)) tabs.push('inventory');
    if (hasAccess(PERMISSIONS.MANAGE_ORDERS)) tabs.push('purchases', 'credits', 'orders', 'archived_orders');
    if (hasAccess(PERMISSIONS.EDIT_PAGE) || hasAccess(PERMISSIONS.MANAGE_PRODUCTS)) {
      tabs.push('promotions');
    }
    if (hasAccess(PERMISSIONS.MANAGE_ORDERS)) tabs.push('qr_settings');
    if (currentUser?.isPrimary) tabs.push('users');
    return Array.from(new Set(tabs));
  }, [hasAccess, currentUser]);

  const tabMeta = {
    pos: {
      label: 'Caja POS',
      description: 'Mostrador y cobro',
      icon: ShoppingCart,
      badge: posCart.length,
    },
    inventory: {
      label: 'Inventario ERP',
      description: `${products.length} productos`,
      icon: Boxes,
      badge: criticalStockCount,
    },
    purchases: {
      label: 'Compras ERP',
      description: 'Facturas y proveedores',
      icon: FileText,
      badge: 0,
    },
    credits: {
      label: 'Créditos & Cartera',
      description: 'Cuentas por cobrar',
      icon: Receipt,
      badge: 0,
    },
    orders: {
      label: 'Pedidos',
      description: 'Pedidos activos',
      icon: Package,
      badge: pendingOrdersCount,
    },
    archived_orders: {
      label: 'Archivados',
      description: 'Historial',
      icon: Archive,
      badge: archivedOrders.length,
    },
    promotions: {
      label: 'Promociones',
      description: 'Campañas',
      icon: Flame,
      badge: 0,
    },
    qr_settings: {
      label: 'Medios de Pago & QRs',
      description: 'QRs, Cuentas & Datáfonos',
      icon: QrCode,
      badge: 0,
    },
    users: {
      label: 'Colaboradores',
      description: 'Roles y permisos',
      icon: Users,
      badge: 0,
    },
  };

  const activeTabMeta = tabMeta[activeTab] || tabMeta.inventory;
  const ActiveTabIcon = activeTabMeta.icon;

  // Ajustar la pestaña activa cuando cambia el usuario o se abre con una
  // pestaña solicitada explícitamente.
  useEffect(() => {
    if (!isOpen) return;
    if (initialTab && availableTabs.includes(initialTab)) {
      setActiveTab(initialTab);
      return;
    }
    if (!availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0] || 'no_access');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialTab, availableTabs]);

  // Notificaciones efímeras del panel (se declara antes de los manejadores
  // que la invocan para mantener un orden de inicialización limpio).
  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Subir código QR localmente y optimizar a WebP / Base64
  const handleQrFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsOptimizingQr(true);
    try {
      const optimized = await imageOptimizer.compressToWebP(file, {
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.9,
      });
      setQrUrl(optimized.dataUrl);
      showNotification('¡Código QR local cargado y optimizado en WebP!');
    } catch (err) {
      console.warn('Fallo optimización WebP, usando lector directo:', err);
      const reader = new FileReader();
      reader.onload = (event) => {
        setQrUrl(event.target.result);
        showNotification('¡Imagen QR cargada con éxito!');
      };
      reader.readAsDataURL(file);
    } finally {
      setIsOptimizingQr(false);
      if (qrFileInputRef.current) qrFileInputRef.current.value = '';
    }
  };

  // Cargar órdenes
  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const data = await orderService.getOrders(false);
      setOrders(data);
      const archived = orderService.getArchivedOrders();
      setArchivedOrders(archived);
    } catch (err) {
      console.warn('Error cargando órdenes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadOrders();
      setQrUrl(config.qrPaymentImageUrl || '');
      setBankAccount(config.paymentBankAccount || '');
      setNequiPhone(config.paymentNequiPhone || '');
      setTitular(config.paymentTitular || '');
      setWompiLlaveBreve(config.wompiLlaveBreve || '');
      setWompiPublicKey(config.wompiPublicKey || '');
      setWompiCheckoutUrl(config.wompiCheckoutUrl || '');
      setPaypalPaymentLink(config.paypalPaymentLink || '');
      setPaypalBusinessEmail(config.paypalBusinessEmail || '');
      const c = config.activeCampaign || {};
      setPromoEnabled(c.enabled ?? false);
      setPromoName(c.name || 'Black Friday');
      setPromoBadge(c.badge || '🔥 BLACK FRIDAY');
      setPromoDiscount(c.discountPercent || 20);
      setPromoBanner(c.bannerText || '🔥 ¡TEMPORADA BLACK FRIDAY EN JavrelStore! HASTA 25% OFF');
      setPromoCategory(c.targetCategory || 'all');
      setPromoTheme(c.theme || 'black_friday');
      setPromoColor(c.customColor || '#0A6CFF');
    }
  }, [isOpen, config]);

  // --- FUNCIONALIDADES DE CAJA POS ---
  const handleAddToCartPos = (product) => {
    setPosCart((prev) => {
      const idx = prev.findIndex((item) => item.id === product.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + 1 };
        return updated;
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          reference: product.reference || product.id,
          image: product.image,
          brand: product.brand,
        },
      ];
    });
  };

  const handleUpdatePosQuantity = (productId, delta) => {
    setPosCart((prev) =>
      prev
        .map((it) => {
          if (it.id === productId) {
            const newQ = it.quantity + delta;
            return newQ > 0 ? { ...it, quantity: newQ } : null;
          }
          return it;
        })
        .filter(Boolean)
    );
  };

  const handleRemoveFromPosCart = (productId) => {
    setPosCart((prev) => prev.filter((it) => it.id !== productId));
  };

  // Cálculos de Totales, Descuentos e Impuestos (IVA 19%) para POS
  const posTotalBruto = posCart.reduce((acc, it) => acc + (it.price * it.quantity), 0);

  const posDiscountAmount = useMemo(() => {
    const val = Number(posDiscountValue) || 0;
    if (val <= 0) return 0;
    if (posDiscountType === 'percent') {
      return Math.round((posTotalBruto * val) / 100);
    }
    return Math.min(posTotalBruto, val);
  }, [posTotalBruto, posDiscountType, posDiscountValue]);

  // Total a Cobrar efectivo tras aplicar descuento
  const posTotalFinal = Math.max(0, posTotalBruto - posDiscountAmount);
  // Desglose de IVA 19% colombiano
  const posBaseImponible = Math.round(posTotalFinal / 1.19);
  const posIva19 = posTotalFinal - posBaseImponible;

  // Monto recibido y cambio/vueltas
  const posCashNum = Number(posCashReceived) || posTotalFinal;
  const posChange = posCashNum >= posTotalFinal ? posCashNum - posTotalFinal : 0;

  // Impresión de Tirilla POS Térmica
  const printPosReceipt = (saleOrder) => {
    const items = Array.isArray(saleOrder.items_json) ? saleOrder.items_json : [];
    const itemsRows = items
      .map(
        (it) => `
      <tr>
        <td style="padding: 4px 0; font-size: 11px;">${it.quantity}x ${it.name}</td>
        <td style="padding: 4px 0; text-align: right; font-size: 11px;">$${formatCurrency(it.price * it.quantity)}</td>
      </tr>
    `
      )
      .join('');

    const cashReceivedNum = Number(saleOrder.cashReceived) || saleOrder.total_amount;
    const changeNum = Math.max(0, cashReceivedNum - saleOrder.total_amount);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Tirilla POS - ${saleOrder.reference_code}</title>
        <style>
          body { font-family: 'Courier New', Courier, monospace; width: 280px; margin: 0 auto; padding: 12px; font-size: 11px; color: #000; }
          .text-center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          table { width: 100%; border-collapse: collapse; }
          @media print {
            body { width: 100%; margin: 0; padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 10px; text-align: center;">
          <button onclick="window.print()" style="padding: 6px 14px; background: #0A6CFF; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">🖨️ Imprimir Tirilla</button>
        </div>
        <div class="text-center">
          <h2 style="margin: 0; font-size: 16px; font-weight: 900;">JAVRELSTORE</h2>
          <p style="margin: 2px 0;">NIT: 901.482.910-4</p>
          <p style="margin: 2px 0;">Punto de Venta Oficial • Medellín</p>
          <p style="margin: 2px 0;">WhatsApp: +57 3122174851</p>
        </div>
        <div class="divider"></div>
        <p style="margin: 2px 0;"><strong>Ticket N°:</strong> ${saleOrder.reference_code}</p>
        <p style="margin: 2px 0;"><strong>Fecha:</strong> ${new Date(saleOrder.created_at || Date.now()).toLocaleString('es-CO')}</p>
        <p style="margin: 2px 0;"><strong>Cliente:</strong> ${saleOrder.customer_name}</p>
        <p style="margin: 2px 0;"><strong>Cajero:</strong> Administrador</p>
        <div class="divider"></div>
        <table>
          <thead>
            <tr>
              <th style="text-align: left; font-size: 11px; padding-bottom: 4px;">DESCRIPCIÓN</th>
              <th style="text-align: right; font-size: 11px; padding-bottom: 4px;">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>
        <div class="divider"></div>
        <table>
          <tr>
            <td>Total Bruto:</td>
            <td style="text-align: right;">$${formatCurrency(saleOrder.totalBruto || saleOrder.total_amount)}</td>
          </tr>
          ${
            saleOrder.discountAmount > 0
              ? `
          <tr>
            <td>Descuento:</td>
            <td style="text-align: right; color: red;">-$${formatCurrency(saleOrder.discountAmount)}</td>
          </tr>
          `
              : ''
          }
          <tr>
            <td>Subtotal (Base):</td>
            <td style="text-align: right;">$${formatCurrency(saleOrder.baseImponible || Math.round(saleOrder.total_amount / 1.19))}</td>
          </tr>
          <tr>
            <td>IVA (19%):</td>
            <td style="text-align: right;">$${formatCurrency(saleOrder.iva19 || (saleOrder.total_amount - Math.round(saleOrder.total_amount / 1.19)))}</td>
          </tr>
          <tr>
            <td class="bold">TOTAL A PAGAR:</td>
            <td class="bold" style="text-align: right; font-size: 13px;">$${formatCurrency(saleOrder.total_amount)}</td>
          </tr>
          <tr>
            <td>Método de Pago:</td>
            <td style="text-align: right;">${saleOrder.payment_method}</td>
          </tr>
          ${
            saleOrder.customerDoc
              ? `
          <tr>
            <td>Documento:</td>
            <td style="text-align: right;">${saleOrder.customerDoc}</td>
          </tr>
          `
              : ''
          }
          ${
            saleOrder.payment_method?.includes('Efectivo')
              ? `
          <tr>
            <td>Efectivo Recibido:</td>
            <td style="text-align: right;">$${formatCurrency(cashReceivedNum)}</td>
          </tr>
          <tr>
            <td class="bold">CAMBIO / VUELTAS:</td>
            <td class="bold" style="text-align: right; font-size: 12px; color: green;">$${formatCurrency(changeNum)}</td>
          </tr>
          `
              : ''
          }
        </table>
        <div class="divider"></div>
        <div class="text-center" style="font-size: 10px; margin-top: 8px;">
          <p style="margin: 2px 0; font-weight: bold;">¡Gracias por su compra en JavrelStore!</p>
          <p style="margin: 2px 0;">Garantía oficial de 1 año</p>
          <p style="margin: 2px 0;">Conserve este comprobante para cualquier reclamo</p>
        </div>
      </body>
      </html>
    `;

    const win = window.open('', '_blank', 'width=380,height=600');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
    }
  };

  // Finalizar Venta POS
  const handleCompletePosSale = async () => {
    if (posCart.length === 0) {
      alert('El carrito de caja POS está vacío.');
      return;
    }

    if (posPaymentMethod === 'Efectivo' && posCashNum < posTotalFinal) {
      const confirmUnderpaid = window.confirm(
        `El monto recibido ($${formatCurrency(posCashNum)}) es menor al total a cobrar ($${formatCurrency(posTotalFinal)}). ¿Deseas continuar?`
      );
      if (!confirmUnderpaid) return;
    }

    setIsLoading(true);
    try {
      // 1. Crear Orden Aprobada en Base de Datos
      const customerDocText = posCustomerDoc ? ` • Doc: ${posCustomerDocType} ${posCustomerDoc}` : '';
      const notesText = `POS: ${posRemisionCode} • Tipo: ${posEmissionType === 'electronic' ? 'Factura Electrónica' : 'Tiquete POS'} • Pago: ${posPaymentTerm} / ${posPaymentMethod} (${posPaymentEntity})${customerDocText} • Descuento: $${formatCurrency(posDiscountAmount)} • Subtotal: $${formatCurrency(posBaseImponible)} • IVA 19%: $${formatCurrency(posIva19)} • Recibido: $${formatCurrency(posCashNum)} • Cambio: $${formatCurrency(posChange)} ${posNotes ? ' • Obs: ' + posNotes : ''}`;

      const result = await orderService.createOrder({
        customerName: posCustomerName.trim() || 'Cliente Mostrador POS',
        customerEmail: posCustomerEmail.trim() || 'cliente.pos@javrelstore.com',
        customerPhone: posCustomerPhone.trim() || '3122174851',
        items: posCart,
        totalAmount: posTotalFinal,
        paymentMethod: `POS - ${posPaymentMethod} (${posPaymentEntity})`,
        notes: notesText,
        initialStatus: 'Aprobado',
      });

      // 2. Descontar Stock Físico en Inventario
      if (onUpdateProductStock) {
        posCart.forEach((it) => {
          onUpdateProductStock(it.id, it.quantity);
        });
      }

      // 3. Emisión de Comprobante según selección
      if (posEmissionType === 'electronic') {
        const inv = invoiceService.generateInvoice(
          {
            ...result.order,
            customer_name: posCustomerName,
            customer_email: posCustomerEmail,
            customer_phone: posCustomerPhone,
            payment_method: `${posPaymentMethod} - ${posPaymentTerm}`,
            total_amount: posTotalFinal,
            items_json: posCart,
          },
          config
        );
        invoiceService.printInvoice(inv);
      } else {
        printPosReceipt({
          ...result.order,
          cashReceived: posCashNum,
          change: posChange,
          totalBruto: posTotalBruto,
          discountAmount: posDiscountAmount,
          baseImponible: posBaseImponible,
          iva19: posIva19,
          totalAmount: posTotalFinal,
          emissionType: posEmissionType,
          paymentTerm: posPaymentTerm,
          entity: posPaymentEntity,
          customerDoc: posCustomerDoc ? `${posCustomerDocType} ${posCustomerDoc}` : '',
          remisionCode: posRemisionCode,
          notes: posNotes,
        });
      }

      // 4. Limpiar Caja POS para el siguiente cliente
      setPosCart([]);
      setPosCashReceived('');
      setPosDiscountValue('');
      setPosNotes('');
      setIsPosCheckoutOpen(false);
      setPosRemisionCode('REM - ' + Math.floor(1000 + Math.random() * 9000));
      loadOrders();

      showNotification(`¡Venta POS ${result.order.reference_code} procesada e inventario actualizado!`);
    } catch (err) {
      console.error('Error al procesar venta POS:', err);
      alert('Error registrando la venta POS: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Procesar código leído por pistola o ingresado manualmente
  const processScannedBarcode = (code) => {
    const term = code.trim().toLowerCase();
    const foundProduct = products.find(
      (p) =>
        String(p?.reference || '').toLowerCase() === term ||
        String(p?.id || '').toLowerCase() === term ||
        String(p?.ean || '').toLowerCase() === term ||
        String(p?.name || '').toLowerCase().includes(term)
    );

    if (foundProduct) {
      setScannedFeedback({
        found: true,
        text: `✓ Escaneado: ${foundProduct.name} (${foundProduct.reference || foundProduct.id})`,
      });

      if (activeTab === 'pos') {
        // En Caja POS: Agregar al carrito de venta inmediata
        handleAddToCartPos(foundProduct);
        showNotification(`⚡ Agregado a Caja POS: ${foundProduct.name}`);
      } else {
        // En Inventario: Filtrar y destacar
        setSearchTerm(foundProduct.reference || foundProduct.name);
        showNotification(`⚡ Producto localizado: ${foundProduct.name}`);
      }
    } else {
      setScannedFeedback({
        found: false,
        text: `⚠️ Código no registrado: "${code}"`,
      });
    }

    setTimeout(() => setScannedFeedback(null), 3500);
  };

  // --- ESCUCHA GLOBAL DE PISTOLA DE CÓDIGO DE BARRAS Y ATAJOS POS (F9, Ctrl+Z) ---
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isMobileTabsOpen) {
        setIsMobileTabsOpen(false);
        return;
      }

      // Atajos POS (F9 para facturar, Ctrl+Z para cerrar checkout)
      if (activeTab === 'pos') {
        if (e.key === 'F9') {
          e.preventDefault();
          if (isPosCheckoutOpen) {
            handleCompletePosSale();
          } else if (posCart.length > 0) {
            setPosCashReceived(posTotalFinal.toString());
            setIsPosCheckoutOpen(true);
          }
          return;
        }

        if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
          if (isPosCheckoutOpen) {
            e.preventDefault();
            setIsPosCheckoutOpen(false);
            return;
          }
        }
      }

      // Ignorar si el usuario está escribiendo conscientemente en un input o textarea normal
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isInputActive = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';

      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Las pistolas envían teclas con menos de 45ms de intervalo
      if (e.key === 'Enter') {
        const scanned = barcodeScannerBuffer.current.trim();
        barcodeScannerBuffer.current = '';

        if (scanned.length >= 3) {
          processScannedBarcode(scanned);
        }
      } else if (e.key.length === 1) {
        // Acumular caracteres
        if (timeDiff > 120 && !isInputActive) {
          barcodeScannerBuffer.current = '';
        }
        barcodeScannerBuffer.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, products, activeTab, posCart, isPosCheckoutOpen, posTotalFinal, isMobileTabsOpen]);

  // --- SELECCIÓN MÚLTIPLE Y ELIMINACIÓN MASIVA ---
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedProductIds(filteredProductsList.map((p) => p.id));
    } else {
      setSelectedProductIds([]);
    }
  };

  const handleToggleSelectProduct = (id) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const triggerDeleteSelected = () => {
    if (selectedProductIds.length === 0) return;

    setDeleteModalConfig({
      isOpen: true,
      title: `¿Eliminar ${selectedProductIds.length} artículos seleccionados?`,
      message: `Esta acción borrará definitivamente del catálogo y de la base de datos Supabase los ${selectedProductIds.length} productos marcados. Esta acción es IRREVERSIBLE.`,
      action: async () => {
        if (onDeleteMultipleProducts) {
          await onDeleteMultipleProducts(selectedProductIds);
        } else if (onDeleteProduct) {
          selectedProductIds.forEach((id) => onDeleteProduct(id));
        }
        setSelectedProductIds([]);
        setDeleteModalConfig({ isOpen: false, title: '', message: '', action: null });
        showNotification(`¡${selectedProductIds.length} productos eliminados correctamente!`);
      },
    });
  };

  // --- EDICIÓN COMPLETA DE PRODUCTO CON SUBIDA WEBP ---
  const handleProductImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      showNotification('Comprimiendo foto a WebP (<50KB) y subiendo al CDN...');
      const result = await imageOptimizer.processLocalImage(file, file.name);

      setEditingProduct((prev) => {
        if (!prev) return prev;
        const currentImages = Array.isArray(prev.images) && prev.images.length > 0
          ? prev.images
          : [prev.image || result.url];
        const reordered = [result.url, ...currentImages.filter((u) => u !== result.url)];
        return {
          ...prev,
          image: result.url,
          images: reordered,
          additional_images: reordered.slice(1),
        };
      });
      showNotification(`¡Foto WebP optimizada (~${result.compressedSizeKb} KB) y fijada como Portada!`);
    } catch (err) {
      console.warn('Error comprimiendo foto:', err);
      showNotification('Error al optimizar imagen: ' + (err.message || 'Error desconocido'), 'error');
    } finally {
      setIsUploadingImage(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleCreateCategoryInline = async () => {
    const name = newCategoryDraft.trim();
    if (!name || isSavingMeta) return;
    setIsSavingMeta(true);
    try {
      const created = await storeService.addCategory({ name });
      if (created?.id) {
        setEditingProduct((prev) =>
          prev ? { ...prev, category: created.id, categoryName: created.name } : prev
        );
        if (onAddCategory) onAddCategory(created);
        setNewCategoryDraft('');
        setShowNewCategoryInput(false);
        showNotification(`Categoría "${created.name}" creada y guardada.`);
      }
    } catch (err) {
      console.warn('Error creando categoría:', err);
      showNotification('No se pudo crear la categoría. Intenta de nuevo.');
    } finally {
      setIsSavingMeta(false);
    }
  };

  const handleCreateBrandInline = async () => {
    const name = newBrandDraft.trim();
    if (!name || isSavingMeta) return;
    setIsSavingMeta(true);
    try {
      const created = await storeService.addBrand(name);
      if (created) {
        const brandName = created.name || name;
        setBrandsList((prev) => Array.from(new Set([...prev, brandName])).sort());
        setEditingProduct((prev) => (prev ? { ...prev, brand: brandName } : prev));
        setNewBrandDraft('');
        setShowNewBrandInput(false);
        showNotification(`Marca "${brandName}" creada y guardada.`);
      }
    } catch (err) {
      console.warn('Error creando marca:', err);
      showNotification('No se pudo crear la marca. Intenta de nuevo.');
    } finally {
      setIsSavingMeta(false);
    }
  };

  const handleSmartAiAutofill = () => {
    if (!editingProduct) return;
    const name = editingProduct.name || 'Nuevo Producto';
    const cat = editingProduct.category || 'computadores';
    const generatedSku = erpFinanceService.generateSku(name, cat, products);
    const generatedEan = erpFinanceService.generateEan13();
    const priceNum = Number(editingProduct.price) || 35000;
    const costEstimate = editingProduct.cost || Math.round(priceNum * 0.7);

    // Generar descripción técnica automática basada en el nombre
    const autoDescription = name && name !== 'Nuevo Producto'
      ? `${name} — Producto original con garantía oficial de 12 meses. Incluye accesorios de fábrica, especificaciones técnicas certificadas y despacho nacional asegurado. Consulta disponibilidad y versiones con nuestro equipo.`
      : '';

    setEditingProduct((prev) => ({
      ...prev,
      sku: generatedSku,
      reference: generatedSku,
      barcode: generatedEan,
      ean: generatedEan,
      cost: costEstimate,
      description: prev.description || autoDescription,
    }));
    showNotification('⚡ IA: SKU, Código EAN-13 y Costo base autogenerados con éxito.');
  };

  const handleSaveProductEdit = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;

    const skuVal =
      editingProduct.sku ||
      editingProduct.reference ||
      erpFinanceService.generateSku(editingProduct.name, editingProduct.category, products);
    const barcodeVal =
      editingProduct.barcode || editingProduct.ean || erpFinanceService.generateEan13();
    const costVal =
      Number(editingProduct.cost) || Math.round((Number(editingProduct.price) || 0) * 0.7);

    const mainImage = editingProduct.image || '/zafra/logo-menu.webp';
    let allImages = [];
    if (Array.isArray(editingProduct.images) && editingProduct.images.length > 0) {
      allImages = editingProduct.images.filter(Boolean);
    } else {
      allImages = [
        mainImage,
        ...(Array.isArray(editingProduct.additional_images) ? editingProduct.additional_images : []),
      ].filter(Boolean);
    }
    const secondaryImages = allImages.filter((img) => img && img !== mainImage);
    const fullImagesList = [mainImage, ...secondaryImages];

    const conditionVal = editingProduct.condition || 'Nuevo';
    const commercialTagVal = editingProduct.commercialTag || editingProduct.badge || '';

    const productToSave = {
      ...editingProduct,
      name: editingProduct.name || 'Nuevo Producto',
      reference: skuVal,
      sku: skuVal,
      barcode: barcodeVal,
      ean: barcodeVal,
      cost: costVal,
      price: Number(editingProduct.price) || 0,
      originalPrice:
        editingProduct.originalPrice !== null &&
        editingProduct.originalPrice !== undefined &&
        editingProduct.originalPrice !== ''
          ? Number(editingProduct.originalPrice)
          : null,
      stock: Number(editingProduct.stock) || 0,
      category: editingProduct.category,
      brand: editingProduct.brand,
      condition: conditionVal,
      commercialTag: commercialTagVal,
      badge: commercialTagVal || editingProduct.badge || '',
      image: mainImage,
      images: fullImagesList,
      additional_images: secondaryImages,
      description: editingProduct.description || '',
    };

    if (editingProduct.isNew) {
      if (onAddNewProduct) {
        await onAddNewProduct(productToSave);
      } else {
        await storeService.saveProduct(productToSave);
      }
      showNotification(`Producto "${productToSave.name}" registrado con éxito.`);
      if (onRefetchProducts) await onRefetchProducts();
      setEditingProduct(null);
      return;
    }

    // Actualización atómica en Supabase con confirmación de filas afectadas
    const res = await storeService.updateProductAtomic(productToSave);

    if (!res.success) {
      showNotification(
        `❌ Error al actualizar en Supabase: ${res.error || 'Verifica RLS y conexión a la base de datos'}.`,
        'error'
      );
      return;
    }

    if (onUpdateProductField) {
      onUpdateProductField(productToSave.id, 'name', productToSave.name);
      onUpdateProductField(productToSave.id, 'reference', skuVal);
      onUpdateProductField(productToSave.id, 'sku', skuVal);
      onUpdateProductField(productToSave.id, 'barcode', barcodeVal);
      onUpdateProductField(productToSave.id, 'ean', barcodeVal);
      onUpdateProductField(productToSave.id, 'cost', costVal);
      onUpdateProductField(productToSave.id, 'price', productToSave.price);
      onUpdateProductField(productToSave.id, 'originalPrice', productToSave.originalPrice);
      onUpdateProductField(productToSave.id, 'stock', productToSave.stock);
      onUpdateProductField(productToSave.id, 'category', productToSave.category);
      onUpdateProductField(productToSave.id, 'brand', productToSave.brand);
      onUpdateProductField(productToSave.id, 'condition', productToSave.condition);
      onUpdateProductField(productToSave.id, 'commercialTag', productToSave.commercialTag);
      onUpdateProductField(productToSave.id, 'badge', productToSave.badge);
      onUpdateProductField(productToSave.id, 'image', productToSave.image);
      onUpdateProductField(productToSave.id, 'images', productToSave.images);
      onUpdateProductField(productToSave.id, 'additional_images', productToSave.additional_images);
      onUpdateProductField(productToSave.id, 'description', productToSave.description);
    }

    if (onRefetchProducts) {
      await onRefetchProducts();
    }

    const rowMsg = res.rowsAffected ? ` (${res.rowsAffected} fila confirmada)` : '';
    showNotification(`⚡ Producto "${productToSave.name}" actualizado atómicamente en Supabase${rowMsg}.`);
    setEditingProduct(null);
  };

  // --- REVERSIÓN DE ÚLTIMA CARGA PDF ---
  const triggerRevertLastImport = () => {
    setDeleteModalConfig({
      isOpen: true,
      title: '¿Reversar la última carga masiva de PDF?',
      message:
        'Se eliminarán de la base de datos todos los productos importados en el último catálogo PDF procesado, devolviendo el inventario a su estado previo.',
      action: async () => {
        if (onRevertLastImport) {
          const count = await onRevertLastImport();
          showNotification(`Se reversaron ${count || 0} producto(s) del catálogo masivo.`);
        }
        setDeleteModalConfig({ isOpen: false, title: '', message: '', action: null });
      },
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-0 sm:p-3 md:p-6 overflow-hidden animate-fadeIn">
      {/* Toast Notificación */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-2 text-xs font-semibold animate-scaleUp">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Banner de Feedback de Escaneo con Pistola */}
      {scannedFeedback && (
        <div
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-2xl shadow-2xl border flex items-center gap-2.5 text-xs font-bold animate-bounce ${
            scannedFeedback.found
              ? 'bg-emerald-950 text-emerald-200 border-emerald-500/50'
              : 'bg-rose-950 text-rose-200 border-rose-500/50'
          }`}
        >
          <Barcode className="w-4 h-4" />
          <span>{scannedFeedback.text}</span>
        </div>
      )}

      {/* Modal Crítico de Confirmación */}
      {deleteModalConfig.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-rose-200 animate-scaleUp">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-display font-extrabold text-lg text-slate-900 mb-2">
              {deleteModalConfig.title}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              {deleteModalConfig.message}
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setDeleteModalConfig({ isOpen: false, title: '', message: '', action: null })}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={deleteModalConfig.action}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-500/25 transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirmar Eliminación</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDICIÓN COMPLETA DE PRODUCTO */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <form
            onSubmit={handleSaveProductEdit}
            className="bg-white rounded-3xl p-4 sm:p-8 max-w-2xl sm:max-w-3xl w-full shadow-2xl border border-slate-200 animate-scaleUp space-y-4 max-h-[92dvh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0A6CFF] flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-slate-900">
                    Edición Completa del Producto
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    ID Interno: {editingProduct.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Subida de Imagen con Compresión WebP */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Imagen del Producto (URL o Cargar Archivo WebP)
              </label>
              <div className="flex items-center gap-3">
                <div
                  className="relative group/editthumb cursor-zoom-in flex-shrink-0"
                  onClick={() =>
                    setLightboxData({
                      isOpen: true,
                      image: editingProduct.image,
                      title: editingProduct.name,
                      price: editingProduct.price,
                      brand: editingProduct.brand,
                    })
                  }
                  title="Ampliar fotografía original con lupa"
                >
                  <img
                    src={editingProduct.image}
                    alt="Preview"
                    className="w-16 h-16 rounded-xl object-contain bg-slate-50 border border-slate-200 p-1 group-hover/editthumb:border-[#0A6CFF] transition-all"
                  />
                  <div className="absolute inset-0 bg-black/25 rounded-xl opacity-0 group-hover/editthumb:opacity-100 flex items-center justify-center text-white transition-opacity">
                    <ZoomIn className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex-1 space-y-1.5">
                  <input
                    type="text"
                    value={editingProduct.image}
                    onChange={(e) => setEditingProduct({ ...editingProduct, image: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:border-[#0A6CFF]"
                    placeholder="URL de la imagen"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold text-[#0A6CFF] bg-blue-50 hover:bg-blue-100 cursor-pointer transition-colors">
                      <Camera className="w-3.5 h-3.5" />
                      <span>{isUploadingImage ? 'Comprimiendo WebP...' : 'Subir de PC (WebP)'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProductImageUpload}
                        className="hidden"
                        disabled={isUploadingImage}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() =>
                        setVisualGalleryModal({
                          isOpen: true,
                          query: editingProduct.name,
                          category: editingProduct.category || 'computadores',
                          productTitle: editingProduct.name,
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold text-pink-700 bg-pink-50 hover:bg-pink-100 border border-pink-200 cursor-pointer transition-colors shadow-2xs"
                      title="Abrir Buscador Web Pro Magnific (/v1/resources) y Pinterest para este producto"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-pink-600" />
                      <span>Buscador Magnific AI</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const newUrl = prompt('Ingresa la URL de una imagen adicional para la galería:');
                        if (newUrl && newUrl.trim()) {
                          const currentList = Array.isArray(editingProduct.images) && editingProduct.images.length > 0
                            ? [...editingProduct.images]
                            : [editingProduct.image || '/zafra/logo-menu.webp'];
                          currentList.push(newUrl.trim());
                          setEditingProduct({
                            ...editingProduct,
                            images: currentList,
                            additional_images: currentList.slice(1),
                          });
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 cursor-pointer transition-colors shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-600" />
                      <span>+ Agregar a Galería</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Galería de Múltiples Imágenes (Principal + Secundarias) */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                  <Images className="w-3.5 h-3.5 text-[#0A6CFF]" />
                  <span>Galería de Múltiples Fotos ({Array.isArray(editingProduct.images) ? editingProduct.images.length : 1})</span>
                </label>
                <span className="text-[10px] text-slate-500">
                  Arrastra, usa ← / → o pulsa ★ Portada para ordenar
                </span>
              </div>

              {/* Gestor de Galería: Drag & Drop, flechas, ★ Portada y Eliminar */}
              <GalleryManagerStrip
                images={
                  Array.isArray(editingProduct.images) && editingProduct.images.length > 0
                    ? editingProduct.images
                    : [editingProduct.image || '/zafra/logo-menu.webp']
                }
                selectedIndex={0}
                canEdit={true}
                onChangeOrder={(reordered) => {
                  if (!Array.isArray(reordered) || reordered.length === 0) return;
                  const newCover = reordered[0];
                  const newAdditional = reordered.slice(1);
                  setEditingProduct((prev) => ({
                    ...prev,
                    image: newCover,
                    images: reordered,
                    additional_images: newAdditional,
                  }));
                  if (newCover !== editingProduct.image) {
                    showNotification('★ Orden y Portada Principal actualizados');
                  }
                }}
              />
            </div>

            {/* Botón Autocompletar compacto inline */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSmartAiAutofill}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] shadow-sm transition-all cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>⚡ Autocompletar</span>
              </button>
            </div>

            {/* Referencia / SKU, Código de Barras y Nombre */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    CÓDIGO / SKU
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const s = erpFinanceService.generateSku(
                        editingProduct.name,
                        editingProduct.category,
                        products
                      );
                      setEditingProduct({ ...editingProduct, reference: s, sku: s });
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                    <span>Sugerir Siguiente</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={editingProduct.reference || editingProduct.sku || ''}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      reference: e.target.value.toUpperCase(),
                      sku: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="Ej. BEB-001"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono-code font-bold outline-none focus:bg-white focus:border-[#0A6CFF]"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    Código de Barras (EAN)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const ean = erpFinanceService.generateEan13();
                      setEditingProduct({ ...editingProduct, barcode: ean, ean });
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-2.5 h-2.5 text-purple-600" />
                    <span>Generar EAN</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={editingProduct.barcode || editingProduct.ean || ''}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      barcode: e.target.value,
                      ean: e.target.value,
                    })
                  }
                  placeholder="7701234567890"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono-code font-semibold outline-none focus:bg-white focus:border-[#0A6CFF]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Nombre del Producto *
                </label>
                <input
                  type="text"
                  value={editingProduct.name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    const updatedProd = { ...editingProduct, name: newName };
                    // Auto-generar SKU al escribir si está vacío
                    if (!editingProduct.reference && !editingProduct.sku && newName.length > 2) {
                      const autoSku = erpFinanceService.generateSku(newName, editingProduct.category, products);
                      updatedProd.reference = autoSku;
                      updatedProd.sku = autoSku;
                    }
                    setEditingProduct(updatedProd);
                  }}
                  placeholder="Nombre del producto (ej. Cerveza ...)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-semibold outline-none focus:bg-white focus:border-[#0A6CFF]"
                  required
                />
              </div>
            </div>

            {/* Descripción del Producto */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Detalles / Descripción del Producto
              </label>
              <textarea
                value={editingProduct.description || ''}
                onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                placeholder="Detalles opcionales (especificaciones, garantía, etc.)..."
                rows={2}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:border-[#0A6CFF] resize-none"
              />
            </div>

            {/* Costo, Precio, Precio Antes, Margen y Stock */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Costo de Compra (COP)
                </label>
                <input
                  type="number"
                  value={editingProduct.cost ?? ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, cost: e.target.value })}
                  placeholder="Ej. 20000"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-[#0A6CFF]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Precio Regular / Lista ($)
                </label>
                <input
                  type="number"
                  value={editingProduct.originalPrice ?? ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, originalPrice: e.target.value })}
                  placeholder="Ej. 1499000 (opcional)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-500 outline-none focus:bg-white focus:border-[#0A6CFF]"
                />
                <p className="mt-1 text-[10px] leading-snug text-slate-400">
                  Precio habitual; se muestra tachado si es mayor que la oferta.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Precio de Oferta (COP) *
                </label>
                <input
                  type="number"
                  value={editingProduct.price}
                  onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-[#0A6CFF]"
                  required
                />
                <p className="mt-1 text-[10px] leading-snug text-slate-400">
                  Valor promocional que paga el cliente.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Stock Disponible *
                </label>
                <input
                  type="number"
                  min={0}
                  value={editingProduct.stock}
                  onChange={(e) => setEditingProduct({ ...editingProduct, stock: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-[#0A6CFF]"
                  required
                />
              </div>
            </div>

            {/* Indicador de Margen y Base Imponible */}
            {Number(editingProduct.price) > 0 && (
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-600">
                  Base antes de IVA (19%):{' '}
                  <strong className="text-slate-900">
                    {formatCurrency(Math.round(Number(editingProduct.price) / 1.19))}
                  </strong>
                </span>
                {editingProduct.cost !== undefined && editingProduct.cost !== '' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                    Margen:{' '}
                    {Math.round(
                      ((Number(editingProduct.price) - Number(editingProduct.cost)) /
                        Number(editingProduct.price)) *
                        1000
                    ) / 10}
                    %
                  </span>
                )}
              </div>
            )}

            {/* Categoría y Marca dinámicas con creación inmediata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-700">Categoría</label>
                  <button
                    type="button"
                    onClick={() => setShowNewCategoryInput((v) => !v)}
                    className="text-[10px] font-bold text-[#0A6CFF] hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Nueva</span>
                  </button>
                </div>
                {showNewCategoryInput ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={newCategoryDraft}
                      onChange={(e) => setNewCategoryDraft(e.target.value)}
                      placeholder="Ej. Audio & Sonido"
                      className="flex-1 min-w-0 px-3 py-2 border border-[#0A6CFF]/50 rounded-xl text-xs text-slate-900 outline-none focus:border-[#0A6CFF]"
                    />
                    <button
                      type="button"
                      onClick={handleCreateCategoryInline}
                      disabled={isSavingMeta || !newCategoryDraft.trim()}
                      className="px-3 py-2 rounded-xl text-[11px] font-bold text-white bg-[#0A6CFF] disabled:opacity-50 flex-shrink-0"
                    >
                      {isSavingMeta ? '...' : 'Crear'}
                    </button>
                  </div>
                ) : (
                  <select
                    value={editingProduct.category || ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, category: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:border-[#0A6CFF] bg-white"
                  >
                    {editingProduct.category &&
                      !categories.some(
                        (c) => String(c.id) === String(editingProduct.category)
                      ) && (
                        <option value={editingProduct.category}>
                          {editingProduct.categoryName || editingProduct.category}
                        </option>
                      )}
                    {categories
                      .filter((c) => c.id !== 'all')
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-700">Marca</label>
                  <button
                    type="button"
                    onClick={() => setShowNewBrandInput((v) => !v)}
                    className="text-[10px] font-bold text-[#0A6CFF] hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Nueva</span>
                  </button>
                </div>
                {showNewBrandInput ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={newBrandDraft}
                      onChange={(e) => setNewBrandDraft(e.target.value)}
                      placeholder="Ej. Anker, JBL..."
                      className="flex-1 min-w-0 px-3 py-2 border border-[#0A6CFF]/50 rounded-xl text-xs text-slate-900 outline-none focus:border-[#0A6CFF]"
                    />
                    <button
                      type="button"
                      onClick={handleCreateBrandInline}
                      disabled={isSavingMeta || !newBrandDraft.trim()}
                      className="px-3 py-2 rounded-xl text-[11px] font-bold text-white bg-[#0A6CFF] disabled:opacity-50 flex-shrink-0"
                    >
                      {isSavingMeta ? '...' : 'Crear'}
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      list="admin-brands-datalist"
                      value={editingProduct.brand || ''}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, brand: e.target.value })
                      }
                      placeholder="Ej. Apple, Razer, Sony..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:border-[#0A6CFF]"
                    />
                    <datalist id="admin-brands-datalist">
                      {brandsList.map((b) => (
                        <option key={b} value={b} />
                      ))}
                    </datalist>
                  </>
                )}
              </div>
            </div>

            {/* Selector de Estado Físico / Condición */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <label className="block text-[11px] font-bold text-slate-700">
                Estado Físico / Condición del Artículo
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'Nuevo', label: 'Nuevo', color: 'bg-emerald-50 text-emerald-800 border-emerald-300' },
                  { id: 'Seminuevo', label: 'Seminuevo', color: 'bg-amber-50 text-amber-800 border-amber-300' },
                  { id: 'Usado', label: 'Usado', color: 'bg-slate-100 text-slate-800 border-slate-300' },
                ].map((cond) => {
                  const isSelected = (editingProduct.condition || 'Nuevo') === cond.id;
                  return (
                    <button
                      key={cond.id}
                      type="button"
                      onClick={() => setEditingProduct({ ...editingProduct, condition: cond.id })}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        isSelected
                          ? `${cond.color} ring-2 ring-[#0A6CFF] shadow-xs`
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      ● {cond.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Etiqueta Comercial / Promoción */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold text-slate-700">
                  Etiqueta Comercial / Promoción
                </label>
                <span className="text-[10px] text-slate-400">
                  Se muestra en la tarjeta y en el Centro de Difusión
                </span>
              </div>

              {/* Botones de presets rápidos */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'Black Friday', bg: 'bg-black text-amber-300 border-amber-400' },
                  { label: 'Oferta', bg: 'bg-rose-50 text-rose-700 border-rose-300' },
                  { label: 'Destacado', bg: 'bg-blue-50 text-blue-700 border-blue-300' },
                  { label: 'Liquidación', bg: 'bg-purple-50 text-purple-700 border-purple-300' },
                  { label: 'Importado VIP', bg: 'bg-amber-50 text-amber-800 border-amber-300' },
                ].map((preset) => {
                  const isActive = (editingProduct.commercialTag || editingProduct.badge || '') === preset.label;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() =>
                        setEditingProduct({
                          ...editingProduct,
                          commercialTag: isActive ? '' : preset.label,
                          badge: isActive ? '' : preset.label,
                        })
                      }
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                        isActive
                          ? `${preset.bg} ring-2 ring-[#0A6CFF] shadow-xs`
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
                {(editingProduct.commercialTag || editingProduct.badge) && (
                  <button
                    type="button"
                    onClick={() =>
                      setEditingProduct({
                        ...editingProduct,
                        commercialTag: '',
                        badge: '',
                      })
                    }
                    className="px-2 py-1 rounded-lg text-[10px] font-bold text-slate-400 hover:text-rose-600 bg-white border border-slate-200 hover:border-rose-200"
                  >
                    ✕ Quitar insignia
                  </button>
                )}
              </div>

              <input
                type="text"
                value={editingProduct.commercialTag || editingProduct.badge || ''}
                onChange={(e) =>
                  setEditingProduct({
                    ...editingProduct,
                    commercialTag: e.target.value,
                    badge: e.target.value,
                  })
                }
                placeholder="O escribe una etiqueta libre (ej. Black Friday, Oferta Flash, etc.)"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:border-[#0A6CFF]"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#0A6CFF] hover:bg-blue-600 shadow-md shadow-blue-500/20"
              >
                Guardar Cambios
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CONTENEDOR PRINCIPAL DEL PANEL (EXPANDIDO PARA ALTA DENSIDAD HORIZONTAL) */}
      <div className="relative w-full max-w-[96vw] xl:max-w-[1540px] 2xl:max-w-[1720px] bg-white rounded-none sm:rounded-3xl shadow-2xl border-0 sm:border border-slate-200 overflow-hidden flex flex-col h-[100dvh] max-h-[100dvh] sm:h-[94vh] sm:max-h-[94vh]">
        {/* ENCABEZADO FIJO (flex-shrink-0) */}
        <div className="flex-shrink-0 px-3.5 sm:px-6 py-3 sm:py-4 border-b border-slate-200 bg-slate-50/95 flex items-center justify-between gap-2 sm:gap-3 z-20">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-[#0A6CFF] to-[#38BDF8] p-0.5 flex items-center justify-center shadow-md shadow-blue-500/20 flex-shrink-0">
              <div className="w-full h-full bg-slate-900 rounded-[10px] sm:rounded-[14px] flex items-center justify-center text-white">
                <Boxes className="w-4 h-4 sm:w-5 sm:h-5 text-[#38BDF8]" />
              </div>
            </div>
            <div className="min-w-0">
              <h2 className="font-display font-extrabold text-sm sm:text-lg text-slate-900 flex items-center gap-1.5 sm:gap-2 truncate">
                <span className="truncate">Panel de Control • JavrelStore</span>
                <span className="hidden sm:inline text-[10px] font-mono-code font-bold uppercase px-2 py-0.5 rounded bg-blue-50 text-[#0A6CFF] border border-blue-200 flex-shrink-0">
                  {currentUser?.isPrimary ? 'PRINCIPAL' : getRoleLabel(currentUser?.role)}
                </span>
              </h2>
              <p className="hidden sm:block text-[11px] text-slate-500 truncate">
                POS mostrador, inventario, facturación y pasarela QR.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <button
              onClick={async () => {
                if (onForceRefresh) {
                  await onForceRefresh();
                }
                await loadOrders();
                showNotification('⚡ Catálogo y pedidos sincronizados en vivo con Supabase.');
              }}
              className="p-2.5 rounded-xl text-slate-600 hover:bg-slate-200 transition-colors flex items-center gap-1.5"
              title="Forzar sincronización directa con Supabase y purgar caché local"
            >
              <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#0A6CFF]' : ''}`} />
              <span className="hidden md:inline text-[11px] font-bold">Limpiar Caché</span>
            </button>
            <button
              onClick={loadOrders}
              className="p-2.5 rounded-xl text-slate-600 hover:bg-slate-200 transition-colors"
              title="Recargar datos"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#0A6CFF]' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
              title="Cerrar panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* BARRA MÓVIL: MÓDULO ACTIVO + SCROLL HORIZONTAL DE PESTAÑAS + DRAWER */}
        <div className="lg:hidden flex-shrink-0 border-b border-slate-200 bg-white z-10">
          <div className="px-3 py-2 flex items-center justify-between gap-2 border-b border-slate-100">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-7 h-7 rounded-lg bg-blue-50 text-[#0A6CFF] border border-blue-100 flex items-center justify-center flex-shrink-0">
                <ActiveTabIcon className="w-3.5 h-3.5" />
              </span>
              <div className="min-w-0">
                <span className="block text-[8px] font-mono-code uppercase font-bold text-slate-400 leading-none">
                  Módulo activo
                </span>
                <span className="block text-xs font-bold text-slate-900 truncate mt-0.5">
                  {activeTabMeta.label}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsMobileTabsOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
            >
              <Menu className="w-3.5 h-3.5" />
              <span>Ver Todos</span>
            </button>
          </div>

          {/* Carrusel de navegación táctil rápida */}
          <div className="px-2.5 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar bg-slate-50/70">
            {availableTabs
              .filter((tab) => tab !== 'no_access')
              .map((tab) => {
                const meta = tabMeta[tab];
                if (!meta) return null;
                const Icon = meta.icon;
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex-shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-[#0A6CFF] text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{meta.label}</span>
                    {meta.badge > 0 && (
                      <span
                        className={`w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center ${
                          isActive ? 'bg-white text-[#0A6CFF]' : 'bg-rose-500 text-white'
                        }`}
                      >
                        {meta.badge > 9 ? '9+' : meta.badge}
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
        </div>

        {/* BARRA DE PESTAÑAS DESKTOP */}
        <div className="hidden lg:flex flex-shrink-0 min-h-[52px] px-6 border-b border-slate-200 items-center gap-2 overflow-x-auto no-scrollbar bg-white z-10">
          {/* Pestaña Caja POS */}
          {hasAccess(PERMISSIONS.POS_SALES) && (
            <button
              onClick={() => setActiveTab('pos')}
              className={`py-3.5 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'pos'
                  ? 'border-[#0A6CFF] text-[#0A6CFF]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShoppingCart className="w-4 h-4 text-[#0A6CFF]" />
              <span>Caja POS (Mostrador)</span>
              {posCart.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-[#0A6CFF] text-white text-[10px] font-bold flex items-center justify-center">
                  {posCart.length}
                </span>
              )}
            </button>
          )}

          {/* Pestaña Control de Inventario */}
          {hasAccess(PERMISSIONS.MANAGE_PRODUCTS) && (
            <button
              onClick={() => setActiveTab('inventory')}
              className={`py-3.5 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'inventory'
                  ? 'border-[#0A6CFF] text-[#0A6CFF]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>Control de Inventario ({products.length})</span>
              {criticalStockCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {criticalStockCount}
                </span>
              )}
            </button>
          )}

          {/* Pestaña Compras ERP (Proveedores, Facturas y Stock) */}
          {hasAccess(PERMISSIONS.MANAGE_ORDERS) && (
            <button
              onClick={() => setActiveTab('purchases')}
              className={`py-3.5 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'purchases'
                  ? 'border-[#0A6CFF] text-[#0A6CFF]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-4 h-4 text-indigo-500" />
              <span>Compras ERP</span>
            </button>
          )}

          {/* Pestaña Créditos & Cartera */}
          {hasAccess(PERMISSIONS.MANAGE_ORDERS) && (
            <button
              onClick={() => setActiveTab('credits')}
              className={`py-3.5 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'credits'
                  ? 'border-[#0A6CFF] text-[#0A6CFF]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Receipt className="w-4 h-4 text-emerald-600" />
              <span>Créditos & Cartera</span>
            </button>
          )}

          {/* Pestaña Pedidos Activos */}
          {hasAccess(PERMISSIONS.MANAGE_ORDERS) && (
            <button
              onClick={() => setActiveTab('orders')}
              className={`py-3.5 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'orders'
                  ? 'border-[#0A6CFF] text-[#0A6CFF]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Pedidos Activos ({orders.length})</span>
              {pendingOrdersCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {pendingOrdersCount}
                </span>
              )}
            </button>
          )}

          {/* Pestaña Historial Archivado */}
          {hasAccess(PERMISSIONS.MANAGE_ORDERS) && (
            <button
              onClick={() => setActiveTab('archived_orders')}
              className={`py-3.5 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'archived_orders'
                  ? 'border-[#0A6CFF] text-[#0A6CFF]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Archive className="w-4 h-4" />
              <span>Historial Archivado ({archivedOrders.length})</span>
            </button>
          )}

          {/* Pestaña Promociones */}
          {(hasAccess(PERMISSIONS.EDIT_PAGE) || hasAccess(PERMISSIONS.MANAGE_PRODUCTS)) && (
            <button
              onClick={() => setActiveTab('promotions')}
              className={`py-3.5 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'promotions'
                  ? 'border-[#0A6CFF] text-[#0A6CFF]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Flame className="w-4 h-4 text-amber-500" />
              <span>Promociones & Campañas</span>
            </button>
          )}

          {/* Pestaña Pasarela QR */}
          {hasAccess(PERMISSIONS.MANAGE_ORDERS) && (
            <button
              onClick={() => setActiveTab('qr_settings')}
              className={`py-3.5 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'qr_settings'
                  ? 'border-[#0A6CFF] text-[#0A6CFF]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>Pasarela de Pago QR</span>
            </button>
          )}

          {/* Pestaña Control de Colaboradores (solo administrador principal) */}
          {currentUser?.isPrimary && (
            <button
              onClick={() => setActiveTab('users')}
              className={`py-3.5 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'users'
                  ? 'border-[#0A6CFF] text-[#0A6CFF]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Control de Colaboradores</span>
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[8px] font-black uppercase">
                RBAC
              </span>
            </button>
          )}
        </div>

        {/* CONTENIDO INTERNO DINÁMICO CON SCROLL FLUIDO */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 pb-8 sm:pb-6 bg-slate-50/50">
          {/* ======================================================== */}
          {/* 1. PESTAÑA: CAJA POS (PUNTO DE VENTA EN MOSTRADOR) */}
          {/* ======================================================== */}
          {activeTab === 'pos' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* COLUMNA IZQUIERDA: BUSCADOR CON PISTOLA Y CATÁLOGO DE PRODUCTOS (7 Cols) */}
              <div className="lg:col-span-7 space-y-4">
                {/* Barra de Escaneo de Pistola de Código de Barras */}
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0A6CFF] flex items-center justify-center flex-shrink-0">
                    <Barcode className="w-5 h-5" />
                  </div>
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          processScannedBarcode(barcodeInput);
                          setBarcodeInput('');
                        }
                      }}
                      placeholder="Escanear con pistola o presiona Enter (Ref / SKU / EAN)..."
                      className="w-full text-xs font-mono-code font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#0A6CFF]"
                    />
                  </div>
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex-shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    Pistola Lista
                  </span>
                </div>

                {/* Buscador Rápido de Productos */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={posSearchTerm}
                    onChange={(e) => setPosSearchTerm(e.target.value)}
                    placeholder="Filtrar productos por nombre o categoría..."
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-[#0A6CFF]"
                  />
                </div>

                {/* Grid Rápido de Productos POS */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[460px] overflow-y-auto no-scrollbar">
                  {products
                    .filter((p) => !posSearchTerm || normalizeSearchText(p?.name).includes(normalizeSearchText(posSearchTerm)) || normalizeSearchText(p?.reference).includes(normalizeSearchText(posSearchTerm)) || normalizeSearchText(p?.sku).includes(normalizeSearchText(posSearchTerm)))
                    .map((prod) => (
                      <div
                        key={prod.id}
                        onClick={() => handleAddToCartPos(prod)}
                        className="p-3 rounded-2xl bg-white border border-slate-200 hover:border-[#0A6CFF] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                      >
                        <div className="aspect-square w-full rounded-xl bg-slate-50 p-2 mb-2 flex items-center justify-center">
                          <img
                            src={prod.image}
                            alt={prod.name}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] font-mono-code text-slate-400 block truncate">
                            Ref: {prod.reference || prod.id}
                          </span>
                          <h4 className="font-semibold text-xs text-slate-900 line-clamp-1">
                            {prod.name}
                          </h4>
                          <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100">
                            <span className="font-display font-bold text-xs text-[#0A6CFF]">
                              {formatCurrency(prod.price)}
                            </span>
                            <span className="text-[10px] font-mono-code text-slate-500">
                              Stock: {prod.stock ?? 10}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* COLUMNA DERECHA: TICKET / CARRITO DE VENTA Y COBRO (5 Cols - Estilo Comercial) */}
              <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-3.5">
                {/* Cabecera del Documento y Cajero */}
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-mono-code font-bold text-xs text-slate-800">
                      (112) Remisión | {posRemisionCode}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                    <User className="w-3.5 h-3.5 text-blue-500" />
                    <span>Administrador</span>
                  </div>
                </div>

                {/* Entrada rápida por CÓDIGO (F4) */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="CÓDIGO (F4)..."
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          processScannedBarcode(barcodeInput);
                          setBarcodeInput('');
                        }
                      }}
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono-code font-semibold outline-none focus:border-[#0A6CFF]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (barcodeInput.trim()) {
                        processScannedBarcode(barcodeInput);
                        setBarcodeInput('');
                      }
                    }}
                    className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer transition-colors"
                    title="Agregar ítem por código"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Selección y Datos del Cliente */}
                <div className="flex items-center gap-2">
                  <select
                    value={posCustomerDocType}
                    onChange={(e) => setPosCustomerDocType(e.target.value)}
                    className="w-36 py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-700 outline-none"
                  >
                    <option value="Cédula ciudadanía">Cédula ciudadanía</option>
                    <option value="NIT">NIT</option>
                    <option value="Cédula extranjería">Cédula extranjería</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Buscar o ingresar cliente (Ctrl + X)..."
                    value={posCustomerName}
                    onChange={(e) => setPosCustomerName(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0A6CFF]"
                  />
                </div>

                {/* Ítems del Ticket */}
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto no-scrollbar border-y border-slate-100 py-2">
                  {posCart.length > 0 ? (
                    posCart.map((it) => (
                      <div
                        key={it.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs"
                      >
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => handleUpdatePosQuantity(it.id, -1)}
                            className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-100"
                          >
                            <Minus className="w-3 h-3 text-slate-600" />
                          </button>
                          <span className="font-mono-code font-bold text-xs w-4 text-center">
                            {it.quantity}
                          </span>
                          <button
                            onClick={() => handleUpdatePosQuantity(it.id, 1)}
                            className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-100"
                          >
                            <Plus className="w-3 h-3 text-slate-600" />
                          </button>
                        </div>

                        <div className="flex-1 min-w-0 px-2.5">
                          <p className="font-semibold text-slate-900 truncate leading-tight">{it.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono-code">
                            {it.reference || it.id} • {formatCurrency(it.price)} c/u
                          </p>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="font-mono-code font-bold text-xs text-slate-900">
                            {formatCurrency(it.price * it.quantity)}
                          </span>
                          <button
                            onClick={() => handleRemoveFromPosCart(it.id)}
                            className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      <Barcode className="w-7 h-7 mx-auto mb-1 opacity-40" />
                      Escanea con la pistola o haz clic en los productos para agregarlos.
                    </div>
                  )}
                </div>

                {/* Descuentos y Promociones Dinámicas */}
                <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-blue-500" />
                      Descuentos y Promociones
                    </span>
                    <span className="text-[10px] font-mono-code text-slate-500">
                      {posDiscountAmount > 0 ? `Descuento: -${formatCurrency(posDiscountAmount)}` : 'Sin descuento'}
                    </span>
                  </div>

                  {/* Selector % vs $ */}
                  <div className="flex items-center gap-2">
                    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setPosDiscountType('percent')}
                        className={`px-2 py-0.5 rounded-md transition-all ${
                          posDiscountType === 'percent'
                            ? 'bg-[#0A6CFF] text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        % Porcentaje
                      </button>
                      <button
                        type="button"
                        onClick={() => setPosDiscountType('fixed')}
                        className={`px-2 py-0.5 rounded-md transition-all ${
                          posDiscountType === 'fixed'
                            ? 'bg-[#0A6CFF] text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        $ Valor ($)
                      </button>
                    </div>

                    <input
                      type="number"
                      value={posDiscountValue}
                      onChange={(e) => setPosDiscountValue(e.target.value)}
                      placeholder={posDiscountType === 'percent' ? '% Ej. 10 (para 10%)' : '$ Ej. 5000'}
                      className="flex-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono-code outline-none focus:border-[#0A6CFF]"
                    />
                  </div>

                  {/* Botones de Porcentaje Rápido */}
                  <div className="flex items-center gap-1.5">
                    {[5, 10, 15, 20, 50].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setPosDiscountType('percent');
                          setPosDiscountValue(p.toString());
                        }}
                        className={`flex-1 py-1 rounded-md text-[10px] font-mono-code font-bold transition-all border ${
                          posDiscountType === 'percent' && Number(posDiscountValue) === p
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        {p}%
                      </button>
                    ))}
                    {posDiscountValue && (
                      <button
                        type="button"
                        onClick={() => setPosDiscountValue('')}
                        className="px-2 py-1 text-[10px] text-rose-500 font-bold hover:underline"
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                </div>

                {/* Desglose Contable: Total Bruto, Descuento, Subtotal, IVA 19%, TOTAL A COBRAR */}
                <div className="space-y-1 text-xs border-t border-slate-100 pt-2 font-medium">
                  <div className="flex justify-between text-slate-500">
                    <span>Total Bruto:</span>
                    <span className="font-mono-code">{formatCurrency(posTotalBruto)}</span>
                  </div>
                  {posDiscountAmount > 0 && (
                    <div className="flex justify-between text-rose-600 font-bold">
                      <span>Descuento aplicado:</span>
                      <span className="font-mono-code">-{formatCurrency(posDiscountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal (Base Imponible):</span>
                    <span className="font-mono-code">{formatCurrency(posBaseImponible)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>IVA (19%):</span>
                    <span className="font-mono-code">{formatCurrency(posIva19)}</span>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-sm sm:text-base font-extrabold text-slate-900">
                    <span>TOTAL A COBRAR:</span>
                    <span className="font-display font-black text-xl text-emerald-600">
                      {formatCurrency(posTotalFinal)}
                    </span>
                  </div>
                </div>

                {/* Observaciones del Documento */}
                <textarea
                  rows={2}
                  value={posNotes}
                  onChange={(e) => setPosNotes(e.target.value)}
                  placeholder="Observaciones o notas de la factura / venta..."
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#0A6CFF] resize-none"
                />

                {/* Botones de Acción: Remover Lista y Facturar (F9) */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setPosCart([])}
                    disabled={posCart.length === 0}
                    className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    Remover Lista
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (posCart.length === 0) {
                        alert('Agrega al menos un producto a la lista antes de cobrar.');
                        return;
                      }
                      setPosCashReceived(posTotalFinal.toString());
                      setIsPosCheckoutOpen(true);
                    }}
                    disabled={posCart.length === 0}
                    className="flex-1 py-2.5 px-4 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 uppercase tracking-wider"
                  >
                    <Receipt className="w-4 h-4" />
                    <span>Facturar (F9) • Cobrar {formatCurrency(posTotalFinal)}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 2. PESTAÑA: CONTROL DE INVENTARIO ERP (ESTILO MODERNO) */}
          {/* ======================================================== */}
          {activeTab === 'inventory' && (
            <div className="space-y-4">
              {/* Banner Degradado Morado ERP - Catálogo de Productos */}
              <div className="bg-gradient-to-r from-[#1c0c38] via-[#281350] to-[#12082b] rounded-3xl p-5 sm:p-7 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-[10px] font-bold text-slate-200 tracking-wider uppercase mb-2 border border-white/10">
                    Inventario y Existencias
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    Catálogo de Productos
                  </h2>
                  <p className="text-xs text-slate-300 mt-1 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>
                      {products.filter((p) => (Number(p.stock) || 0) > 0).length} productos activos
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={async () => {
                      if (onForceRefresh) {
                        await onForceRefresh();
                      }
                      await loadOrders();
                      showNotification('⚡ Catálogo sincronizado en vivo con Supabase y caché purgada.');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white transition-all cursor-pointer"
                    title="Forzar sincronización directa con Supabase y purgar cachés locales en este dispositivo"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
                    <span>Sincronizar Nube</span>
                  </button>
                  <div className="px-3.5 py-2 rounded-xl bg-white/10 border border-white/15 text-xs font-semibold text-slate-200 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span>Comercia Pro: {products.length} / 1000 prod.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const initialSku = erpFinanceService.generateSku('Nuevo', 'tecnologia', products);
                      const initialEan = erpFinanceService.generateEan13();
                      setEditingProduct({
                        isNew: true,
                        id: 'PROD-' + Date.now().toString().slice(-6),
                        name: '',
                        reference: initialSku,
                        sku: initialSku,
                        barcode: initialEan,
                        ean: initialEan,
                        price: '',
                        cost: '',
                        stock: 10,
                        category: categories[1]?.id || 'computadores',
                        brand: 'JavrelStore',
                        image:
                          'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=600&auto=format&fit=crop&q=80',
                      });
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#059669] hover:bg-[#047857] text-white font-bold text-xs shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Nuevo producto</span>
                  </button>
                </div>
              </div>

              {/* Filtros de Estado Pills */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setInventoryFilter('active')}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      inventoryFilter === 'active'
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Activos</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInventoryFilter('trash')}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      inventoryFilter === 'trash'
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    <span>Inactivos / Papelera</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInventoryFilter('all')}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      inventoryFilter === 'all'
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>Todos</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Botón de Eliminación Masiva */}
                  {selectedProductIds.length > 0 && (
                    <button
                      onClick={triggerDeleteSelected}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-500/25 transition-all cursor-pointer animate-pulse"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar Seleccionados ({selectedProductIds.length})</span>
                    </button>
                  )}

                  {/* Reversar Última Carga PDF */}
                  <button
                    onClick={triggerRevertLastImport}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-all cursor-pointer"
                    title="Elimina en bloque los artículos del último catálogo importado"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reversar Última Carga</span>
                  </button>

                  {/* Importar Catálogo IA */}
                  <button
                    onClick={onOpenBulkImport}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-[#0A6CFF] hover:bg-blue-600 transition-all cursor-pointer shadow-xs"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Importar Catálogo (IA)</span>
                  </button>
                </div>
              </div>

              {/* Fila de Buscador y Escáner de Códigos de Barras */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
                <div className="md:col-span-6 relative">
                  <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={inventoryBarcodeInput}
                    onChange={(e) => setInventoryBarcodeInput(e.target.value)}
                    placeholder="Escanea un código de barras para reabastecer stock o crear..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-[#0A6CFF]"
                  />
                </div>

                <div className="md:col-span-3 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por nombre, SKU..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-[#0A6CFF]"
                  />
                </div>

                <div className="md:col-span-3">
                  <select
                    value={selectedInventoryCategory}
                    onChange={(e) => setSelectedInventoryCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-[#0A6CFF]"
                  >
                    <option value="all">Todas las categorías</option>
                    {categories
                      .filter((c) => c.id !== 'all')
                      .map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Vista Desktop: Tabla ERP Profesional */}
              <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 text-slate-500 uppercase font-mono-code text-[10px] border-b border-slate-200 tracking-wider">
                      <tr>
                        <th className="py-3 px-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={
                              filteredProductsList.length > 0 &&
                              selectedProductIds.length === filteredProductsList.length
                            }
                            onChange={handleSelectAll}
                            className="w-4 h-4 rounded text-[#0A6CFF] cursor-pointer"
                          />
                        </th>
                        <th className="py-3 px-4">PRODUCTO</th>
                        <th className="py-3 px-3">SKU</th>
                        <th className="py-3 px-3">CÓD. BARRAS</th>
                        <th className="py-3 px-3">CATEGORÍA</th>
                        <th className="py-3 px-3">COSTO</th>
                        <th className="py-3 px-3">VENTA</th>
                        <th className="py-3 px-3">MARGEN</th>
                        <th className="py-3 px-3 text-center">STOCK TOTAL</th>
                        <th className="py-3 px-3 text-center">ESTADO</th>
                        <th className="py-3 px-4 text-right">ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredProductsList.map((prod) => {
                        const isSelected = selectedProductIds.includes(prod.id);
                        const stockVal = Number(prod.stock ?? 10);
                        const priceVal = Number(prod.price) || 0;
                        const costVal =
                          Number(prod.cost) > 0 ? Number(prod.cost) : Math.round(priceVal * 0.7);
                        const marginPercent =
                          priceVal > 0
                            ? Math.round(((priceVal - costVal) / priceVal) * 1000) / 10
                            : 0;
                        const baseBeforeIva = Math.round(priceVal / 1.19);
                        const barcodeVal =
                          prod.barcode ||
                          prod.ean ||
                          '770' + String(prod.id).replace(/\D/g, '').padEnd(9, '0').slice(0, 9);
                        const skuVal =
                          prod.sku || prod.reference || erpFinanceService.generateSku(prod.name, prod.category);

                        return (
                          <tr
                            key={prod.id}
                            className={`transition-colors ${
                              isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50/70'
                            }`}
                          >
                            <td className="py-3 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectProduct(prod.id)}
                                className="w-4 h-4 rounded text-[#0A6CFF] cursor-pointer"
                              />
                            </td>

                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-10 h-10 rounded-xl bg-amber-50/60 border border-amber-200/50 p-1 flex items-center justify-center flex-shrink-0 cursor-zoom-in"
                                  onClick={() =>
                                    setLightboxData({
                                      isOpen: true,
                                      image: prod.image,
                                      title: prod.name,
                                      price: prod.price,
                                      brand: prod.brand,
                                    })
                                  }
                                >
                                  <img
                                    src={prod.image}
                                    alt={prod.name}
                                    className="w-full h-full object-contain rounded-lg"
                                    onError={(e) => {
                                      e.target.src = '/zafra/logo-menu.webp';
                                    }}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <span className="font-bold text-slate-900 block truncate max-w-[200px]">
                                    {prod.name}
                                  </span>
                                  <span className="text-[10px] text-slate-400 block truncate">
                                    {prod.brand || 'Oleosoya'}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              <span className="font-mono-code text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                                {skuVal}
                              </span>
                            </td>

                            <td className="py-3 px-3">
                              <span className="inline-flex items-center gap-1 font-mono-code text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                <span className="opacity-50">||||||</span>
                                <span>{barcodeVal}</span>
                              </span>
                            </td>

                            <td className="py-3 px-3 text-slate-600 capitalize">
                              {prod.category}
                            </td>

                            <td className="py-3 px-3 font-semibold text-slate-800">
                              {formatCurrency(costVal)}
                            </td>

                            <td className="py-3 px-3">
                              <div className="font-bold text-slate-900">
                                {formatCurrency(priceVal)}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Base: {formatCurrency(baseBeforeIva)}
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              <span className="font-bold text-emerald-600 text-xs">
                                {marginPercent}%
                              </span>
                            </td>

                            <td className="py-3 px-3 text-center font-mono-code font-bold text-sm text-slate-900">
                              {stockVal}
                            </td>

                            <td className="py-3 px-3 text-center">
                              {stockVal > 0 ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Activo
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  Agotado
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  onClick={() => setEditingProduct({ ...prod })}
                                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                                  title="Editar producto"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (onDuplicateProduct) {
                                      onDuplicateProduct(prod);
                                      showNotification(
                                        `Artículo similar creado con datos de "${prod.name}".`
                                      );
                                    }
                                  }}
                                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                                  title="Crear Artículo Similar"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setShareProduct(prod)}
                                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-[#0A6CFF] transition-colors cursor-pointer"
                                  title="Compartir producto"
                                  aria-label="Compartir producto"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setDeleteModalConfig({
                                      isOpen: true,
                                      title: `¿Eliminar "${prod.name}"?`,
                                      message:
                                        'El producto será removido de forma irreversible de la base de datos.',
                                      action: () => {
                                        if (onDeleteProduct) onDeleteProduct(prod.id);
                                        setDeleteModalConfig({
                                          isOpen: false,
                                          title: '',
                                          message: '',
                                          action: null,
                                        });
                                      },
                                    });
                                  }}
                                  className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                  title="Eliminar producto"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Vista Móvil: Tarjetas ERP Compactas */}
              <div className="lg:hidden space-y-2.5">
                {filteredProductsList.length > 0 && (
                  <div className="flex items-center justify-between gap-2 px-1 py-1">
                    <label className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                      <input
                        type="checkbox"
                        checked={
                          filteredProductsList.length > 0 &&
                          selectedProductIds.length === filteredProductsList.length
                        }
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded text-[#0A6CFF]"
                      />
                      Seleccionar todos
                    </label>
                    <span className="text-[10px] font-mono-code font-bold text-slate-400">
                      {selectedProductIds.length} seleccionados
                    </span>
                  </div>
                )}

                {filteredProductsList.map((prod) => {
                  const isSelected = selectedProductIds.includes(prod.id);
                  const stockVal = Number(prod.stock ?? 10);
                  const priceVal = Number(prod.price) || 0;
                  const costVal =
                    Number(prod.cost) > 0 ? Number(prod.cost) : Math.round(priceVal * 0.7);
                  const marginPercent =
                    priceVal > 0
                      ? Math.round(((priceVal - costVal) / priceVal) * 1000) / 10
                      : 0;

                  return (
                    <div
                      key={prod.id}
                      className={`p-3.5 rounded-2xl border shadow-xs transition-colors ${
                        isSelected
                          ? 'bg-blue-50/70 border-blue-400'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectProduct(prod.id)}
                          className="w-4 h-4 rounded text-[#0A6CFF] mt-1 flex-shrink-0"
                          aria-label={`Seleccionar ${prod.name}`}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setLightboxData({
                              isOpen: true,
                              image: prod.image,
                              title: prod.name,
                              price: prod.price,
                              brand: prod.brand,
                            })
                          }
                          className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-200 p-1 flex-shrink-0"
                          title="Ver foto ampliada"
                        >
                          <img
                            src={prod.image}
                            alt={prod.name}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.target.src = '/zafra/logo-menu.webp';
                            }}
                          />
                        </button>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                            {prod.name}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="font-mono-code text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                              {prod.sku || prod.reference || 'SKU'}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {prod.brand || 'JavrelStore'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-2">
                            <div>
                              <span className="font-display font-black text-sm text-slate-900">
                                {formatCurrency(priceVal)}
                              </span>
                              <span className="text-[10px] text-emerald-600 font-bold block">
                                Margen: {marginPercent}%
                              </span>
                            </div>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                                stockVal > 0
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}
                            >
                              Stock: {stockVal}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-100">
                        <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-0.5">
                          <button
                            type="button"
                            onClick={() => onUpdateProductStock(prod.id, 1)}
                            className="min-w-8 min-h-8 rounded-lg text-slate-600 hover:bg-white flex items-center justify-center cursor-pointer"
                            aria-label="Restar una unidad"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="min-w-8 text-center font-display font-black text-xs text-slate-900">
                            {stockVal}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateProductStock(prod.id, -1)}
                            className="min-w-8 min-h-8 rounded-lg text-slate-600 hover:bg-white flex items-center justify-center cursor-pointer"
                            aria-label="Sumar una unidad"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingProduct({ ...prod })}
                            className="p-2 rounded-xl bg-blue-50 text-[#0A6CFF] hover:bg-blue-100 transition-colors cursor-pointer"
                            aria-label="Editar producto"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (onDuplicateProduct) {
                                onDuplicateProduct(prod);
                                showNotification(
                                  `Artículo similar creado con datos de "${prod.name}".`
                                );
                              }
                            }}
                            className="p-2 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors cursor-pointer"
                            aria-label="Duplicar producto"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setShareProduct(prod)}
                            className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors cursor-pointer"
                            aria-label="Compartir producto"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteModalConfig({
                                isOpen: true,
                                title: `¿Eliminar "${prod.name}"?`,
                                message:
                                  'El producto será removido de forma irreversible de la base de datos.',
                                action: () => {
                                  if (onDeleteProduct) onDeleteProduct(prod.id);
                                  setDeleteModalConfig({
                                    isOpen: false,
                                    title: '',
                                    message: '',
                                    action: null,
                                  });
                                },
                              });
                            }}
                            className="p-2 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors cursor-pointer"
                            aria-label="Eliminar producto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredProductsList.length === 0 && (
                  <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                    <Boxes className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-600">
                      No hay productos que coincidan con el filtro.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 3. PESTAÑA: PEDIDOS ACTIVOS Y DASHBOARD FINANCIERO ERP    */}
          {/* ======================================================== */}
          {activeTab === 'orders' && (
            <div className="space-y-5">
              {/* Fila de 3 Tarjetas de Métricas Pastel Enterprise */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Total pedidos (Menta Pastel) */}
                <div className="bg-[#ebfbee] border border-[#d3f9d8] rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center gap-2.5 text-[#2b8a3e]">
                      <div className="w-8 h-8 rounded-xl bg-white border border-[#b2f2bb] flex items-center justify-center shadow-2xs">
                        <ShoppingBag className="w-4 h-4 text-[#2b8a3e]" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Total pedidos
                      </span>
                    </div>
                    <div className="mt-4">
                      <h3 className="text-3xl sm:text-4xl font-display font-black text-slate-900 tracking-tight">
                        {formatCurrency(erpTotalVentas)}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        {orders.length} pedidos registrados
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 font-medium pt-3 border-t border-[#d3f9d8]/80">
                      <div>
                        <span className="block text-slate-400 text-[10px] uppercase font-bold">Por cobrar</span>
                        <strong className="text-slate-800 font-mono-code">{formatCurrency(erpTotalPorCobrar)}</strong>
                      </div>
                      <div>
                        <span className="block text-slate-400 text-[10px] uppercase font-bold">Ventas brutas</span>
                        <strong className="text-slate-800 font-mono-code">{formatCurrency(erpTotalVentasBrutas)}</strong>
                      </div>
                    </div>
                    <div className="mt-3">
                      <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold bg-[#d3f9d8] text-[#2b8a3e]">
                        0% vs período anterior
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Egresos (Rosa Pálido Pastel) */}
                <div className="bg-[#fff5f5] border border-[#ffe3e3] rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center gap-2.5 text-[#e03131]">
                      <div className="w-8 h-8 rounded-xl bg-white border border-[#ffc9c9] flex items-center justify-center shadow-2xs">
                        <TrendingDown className="w-4 h-4 text-[#e03131]" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Egresos
                      </span>
                    </div>
                    <div className="mt-4">
                      <h3 className="text-3xl sm:text-4xl font-display font-black text-slate-900 tracking-tight">
                        {formatCurrency(erpTotalEgresos)}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        {erpPurchasesList.length} gastos / compras
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 font-medium pt-3 border-t border-[#ffe3e3]/80">
                      <div>
                        <span className="block text-slate-400 text-[10px] uppercase font-bold">Por pagar</span>
                        <strong className="text-slate-800 font-mono-code">{formatCurrency(erpTotalPorPagar)}</strong>
                      </div>
                      <div>
                        <span className="block text-slate-400 text-[10px] uppercase font-bold">Pagado</span>
                        <strong className="text-slate-800 font-mono-code">{formatCurrency(erpTotalPagado)}</strong>
                      </div>
                    </div>
                    <div className="mt-3">
                      <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold bg-[#ffe3e3] text-[#c92a2a]">
                        0% vs período anterior
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Balance (Azul Cielo Pastel) */}
                <div className="bg-[#edf2ff] border border-[#dbe4ff] rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center gap-2.5 text-[#3b5bdb]">
                      <div className="w-8 h-8 rounded-xl bg-white border border-[#bac8ff] flex items-center justify-center shadow-2xs">
                        <Scale className="w-4 h-4 text-[#3b5bdb]" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Balance
                      </span>
                    </div>
                    <div className="mt-4">
                      <h3 className="text-3xl sm:text-4xl font-display font-black text-slate-900 tracking-tight">
                        {formatCurrency(erpBalanceNeto)}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        Ganancia / pérdida neta
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 font-medium pt-3 border-t border-[#dbe4ff]/80">
                      <div>
                        <span className="block text-slate-400 text-[10px] uppercase font-bold">Margen neto</span>
                        <strong className="text-slate-800 font-mono-code">{erpMargenNeto}%</strong>
                      </div>
                      <div>
                        <span className="block text-slate-400 text-[10px] uppercase font-bold">Transacciones</span>
                        <strong className="text-slate-800 font-mono-code">{orders.length + erpPurchasesList.length}</strong>
                      </div>
                    </div>
                    <div className="mt-3">
                      <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold bg-[#dbe4ff] text-[#364fc7]">
                        Estable
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Barra de Filtros y Búsqueda de Pedidos */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pt-2">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por referencia, cliente o tel..."
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-[#0A6CFF]"
                  />
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar">
                  {['all', 'Pendiente', 'Aprobado', 'Rechazado'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setFilterStatus(st)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                        filterStatus === st
                          ? 'bg-[#0A6CFF] text-white shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {st === 'all' ? 'Todos' : st}
                    </button>
                  ))}
                </div>
              </div>

              {filteredOrders.length > 0 ? (
                <div className="space-y-3">
                  {filteredOrders.map((order) => {
                    const isPending = isPendingStatus(order.payment_status);
                    const isApproved = isApprovedStatus(order.payment_status);

                    return (
                      <div
                        key={order.reference_code}
                        className="bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono-code font-bold text-sm text-[#0A6CFF] bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                                {order.reference_code}
                              </span>
                              <span
                                className={`text-[10px] font-mono-code uppercase font-bold px-2.5 py-0.5 rounded-full ${
                                  isPending
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                                    : isApproved
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                                }`}
                              >
                                {order.payment_status}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {new Date(order.created_at).toLocaleString('es-CO')}
                              </span>
                            </div>

                            <div className="text-xs text-slate-800">
                              <strong>Cliente:</strong> {order.customer_name || 'Anónimo'} •{' '}
                              <span className="text-slate-500">Tel:</span> {order.customer_phone || 'N/A'} •{' '}
                              <span className="text-slate-500">Email:</span> {order.customer_email || 'N/A'}
                            </div>

                            <div className="text-[11px] text-slate-500">
                              <strong>Método:</strong> {order.payment_method}
                              {order.payment_provider && (
                                <span className="ml-2 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[9px] font-mono-code uppercase">
                                  {order.payment_provider}
                                </span>
                              )}
                              {order.payment_operation_number && (
                                <span className="ml-2">
                                  · <strong>N° Op:</strong> {order.payment_operation_number}
                                </span>
                              )}
                              {order.notes && <span className="ml-2">({order.notes})</span>}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                            <div className="text-left lg:text-right w-full sm:w-auto lg:pr-3">
                              <span className="text-[10px] font-mono-code uppercase text-slate-400 block">
                                Total
                              </span>
                              <span className="font-display font-bold text-base text-slate-900">
                                {formatCurrency(order.total_amount)}
                              </span>
                            </div>

                            {order.payment_proof_url && (
                              <button
                                onClick={() =>
                                  setLightboxData({
                                    isOpen: true,
                                    image: order.payment_proof_url,
                                    title: `Comprobante ${order.reference_code}`,
                                    price: order.total_amount,
                                    brand: order.payment_method,
                                  })
                                }
                                className="inline-flex items-center justify-center gap-1 px-3 py-2 sm:py-1.5 rounded-xl text-xs font-semibold bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200 flex-1 sm:flex-none"
                                title="Ver comprobante de pago"
                              >
                                <FileCheck className="w-3.5 h-3.5" />
                                <span>Comprobante</span>
                              </button>
                            )}

                            {isPending && (
                              <>
                                <button
                                  onClick={async () => {
                                    await orderService.updateOrderStatus(order.reference_code, 'Aprobado');
                                    setOrders((prev) =>
                                      prev.map((o) =>
                                        o.reference_code === order.reference_code
                                          ? { ...o, payment_status: 'Aprobado', updated_at: new Date().toISOString() }
                                          : o
                                      )
                                    );
                                    showNotification(`✅ Pago aprobado para ${order.reference_code}.`);
                                  }}
                                  className="inline-flex items-center justify-center gap-1 px-3 py-2 sm:py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 flex-1 sm:flex-none"
                                  title="Aprobar pago y habilitar despacho"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Aprobar pago</span>
                                </button>
                                <button
                                  onClick={async () => {
                                    await orderService.updateOrderStatus(order.reference_code, 'Rechazado');
                                    setOrders((prev) =>
                                      prev.map((o) =>
                                        o.reference_code === order.reference_code
                                          ? { ...o, payment_status: 'Rechazado', updated_at: new Date().toISOString() }
                                          : o
                                      )
                                    );
                                    showNotification(`Pago rechazado para ${order.reference_code}.`);
                                  }}
                                  className="inline-flex items-center justify-center gap-1 px-3 py-2 sm:py-1.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 flex-1 sm:flex-none"
                                  title="Rechazar comprobante de pago"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Rechazar</span>
                                </button>
                              </>
                            )}

                            <button
                              onClick={() => {
                                showNotification('Generando factura electrónica...');
                                invoiceService.sendInvoiceEmail({ order, config });
                                invoiceService.printInvoice(order, config);
                              }}
                              className="inline-flex items-center justify-center gap-1 px-3 py-2 sm:py-1.5 rounded-xl text-xs font-semibold bg-blue-50 text-[#0A6CFF] hover:bg-blue-100 flex-1 sm:flex-none"
                              title="Factura Electrónica"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Factura PDF</span>
                            </button>

                            <button
                              onClick={async () => {
                                await orderService.archiveOrder(order);
                                setOrders((prev) => prev.filter((o) => o.reference_code !== order.reference_code));
                                setArchivedOrders((prev) => [{ ...order, is_archived: true }, ...prev]);
                                showNotification(`Orden ${order.reference_code} archivada.`);
                              }}
                              className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                              title="Archivar"
                            >
                              <Archive className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => {
                                setDeleteModalConfig({
                                  isOpen: true,
                                  title: `¿Eliminar Orden ${order.reference_code} de Raíz?`,
                                  message: 'Esta acción borrará de forma permanente e irreversible la orden y sus detalles de Supabase y del almacenamiento local.',
                                  action: async () => {
                                    const res = await orderService.deleteOrderPermanently(order.reference_code, order.id);
                                    setOrders((prev) => prev.filter((o) => o.reference_code !== order.reference_code && o.id !== order.id));
                                    setArchivedOrders((prev) => prev.filter((o) => o.reference_code !== order.reference_code && o.id !== order.id));
                                    setDeleteModalConfig({ isOpen: false, title: '', message: '', action: null });
                                    showNotification(`✅ Orden ${order.reference_code} eliminada de raíz en Supabase.`);
                                  },
                                });
                              }}
                              className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50"
                              title="Eliminar de raíz en Supabase"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
                  <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-600">No hay pedidos registrados.</p>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* 4. PESTAÑA: HISTORIAL ARCHIVADO */}
          {/* ======================================================== */}
          {activeTab === 'archived_orders' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs text-blue-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                <span>
                  📦 <strong>Historial Archivado:</strong> Registros resguardados para trazabilidad contable.
                </span>
                <span className="font-bold whitespace-nowrap">{archivedOrders.length} orden(es) archivadas</span>
              </div>

              {archivedOrders.map((order) => (
                <div
                  key={order.reference_code}
                  className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 opacity-90"
                >
                  <div className="text-xs">
                    <span className="font-mono-code font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-300 mr-2">
                      {order.reference_code}
                    </span>
                    <span className="font-bold text-slate-900">{order.customer_name}</span>
                    <span className="text-slate-400 mx-2">•</span>
                    <span className="text-slate-600 font-semibold">{formatCurrency(order.total_amount)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        await orderService.unarchiveOrder(order);
                        setArchivedOrders((prev) => prev.filter((o) => o.reference_code !== order.reference_code && o.id !== order.id));
                        setOrders((prev) => [{ ...order, is_archived: false }, ...prev]);
                        showNotification(`Orden ${order.reference_code} restaurada a Pedidos Activos.`);
                      }}
                      className="px-3 py-1 text-xs font-bold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restaurar
                    </button>

                    <button
                      onClick={() => {
                        setDeleteModalConfig({
                          isOpen: true,
                          title: `¿Eliminar Orden Archivada ${order.reference_code}?`,
                          message: 'Esta acción borrará de forma permanente e irreversible la orden de Supabase y del historial.',
                          action: async () => {
                            await orderService.deleteOrderPermanently(order.reference_code, order.id);
                            setArchivedOrders((prev) => prev.filter((o) => o.reference_code !== order.reference_code && o.id !== order.id));
                            setOrders((prev) => prev.filter((o) => o.reference_code !== order.reference_code && o.id !== order.id));
                            setDeleteModalConfig({ isOpen: false, title: '', message: '', action: null });
                            showNotification(`✅ Orden archivada ${order.reference_code} eliminada de raíz.`);
                          },
                        });
                      }}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"
                      title="Eliminar de raíz en Supabase"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ======================================================== */}
          {/* 5. PESTAÑA: PROMOCIONES Y FECHAS ESPECIALES */}
          {/* ======================================================== */}
          {activeTab === 'promotions' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onUpdateConfig({
                  ...config,
                  activeCampaign: {
                    enabled: promoEnabled,
                    name: promoName.trim(),
                    badge: promoBadge.trim(),
                    discountPercent: Number(promoDiscount) || 0,
                    bannerText: promoBanner.trim(),
                    targetCategory: promoCategory,
                    theme: promoTheme,
                    customColor: promoColor,
                  },
                });
                showNotification(`¡Campaña "${promoName}" y estilos visuales actualizados!`);
              }}
              className="max-w-2xl mx-auto space-y-4"
            >
              <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
                    <Flame className="w-5 h-5 text-amber-500" />
                    Gestor de Campañas & Fechas Especiales
                  </h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={promoEnabled}
                      onChange={(e) => setPromoEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0A6CFF]"></div>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Nombre Campaña</label>
                    <input
                      type="text"
                      value={promoName}
                      onChange={(e) => setPromoName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 outline-none focus:border-[#0A6CFF]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Badge Flotante</label>
                    <input
                      type="text"
                      value={promoBadge}
                      onChange={(e) => setPromoBadge(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 outline-none focus:border-[#0A6CFF]"
                    />
                  </div>
                </div>

                {/* Selector de Color y Estilo Visual Corporativo (Grid Optimizado) */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <label className="text-[12px] font-bold text-slate-800 flex items-center gap-1.5">
                      <Palette className="w-4 h-4 text-[#0A6CFF]" />
                      <span>Color y Estilo Visual del Banner (HEX / Paleta)</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 rounded-full border border-slate-300 shadow-xs" style={{ backgroundColor: promoColor || '#0A6CFF' }} />
                      <span className="font-mono-code text-[11px] font-extrabold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                        {promoColor || '#0A6CFF'}
                      </span>
                    </div>
                  </div>

                  {/* Retícula (Grid) Responsiva de Colores Preestablecidos con Touch Targets de 44px */}
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
                    {[
                      { color: '#0A6CFF', name: 'Azul Javrel' },
                      { color: '#0052CC', name: 'Azul Cobalto' },
                      { color: '#0B1430', name: 'Azul Noche' },
                      { color: '#DC2626', name: 'Rojo Promo' },
                      { color: '#E11D48', name: 'Rosa Rubí' },
                      { color: '#EA580C', name: 'Naranja Fuego' },
                      { color: '#D97706', name: 'Dorado VIP' },
                      { color: '#059669', name: 'Esmeralda Neo' },
                      { color: '#10B981', name: 'Verde Menta' },
                      { color: '#0891B2', name: 'Cian Tech' },
                      { color: '#7C3AED', name: 'Púrpura Cyber' },
                      { color: '#9333EA', name: 'Violeta Neón' },
                      { color: '#4F46E5', name: 'Índigo Pro' },
                      { color: '#1E293B', name: 'Grafito Oscuro' },
                      { color: '#0F172A', name: 'Negro Carbón' },
                    ].map((preset) => {
                      const isSelected = String(promoColor || '#0A6CFF').toLowerCase() === preset.color.toLowerCase();
                      return (
                        <button
                          key={preset.color}
                          type="button"
                          onClick={() => setPromoColor(preset.color)}
                          aria-label={`Seleccionar color ${preset.name} (${preset.color})`}
                          title={`${preset.name} (${preset.color})`}
                          className={`group relative h-11 w-full min-h-[44px] rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
                            isSelected
                              ? 'scale-105 ring-2 ring-offset-2 ring-slate-900 border-white shadow-md'
                              : 'border-black/10 hover:scale-105 hover:shadow-xs opacity-90 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: preset.color }}
                        >
                          {isSelected ? (
                            <Check className="w-4 h-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]" />
                          ) : (
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-bold text-white drop-shadow-sm select-none">
                              ●
                            </span>
                          )}
                        </button>
                      );
                    })}

                    {/* Selector nativo Color Picker integrado como celda táctil */}
                    <label
                      title="Seleccionar color personalizado"
                      className="relative h-11 w-full min-h-[44px] rounded-xl bg-white border border-dashed border-slate-300 hover:border-[#0A6CFF] hover:bg-blue-50/40 flex flex-col items-center justify-center cursor-pointer transition-all shadow-2xs group"
                    >
                      <input
                        type="color"
                        value={promoColor || '#0A6CFF'}
                        onChange={(e) => setPromoColor(e.target.value)}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                      />
                      <Palette className="w-4 h-4 text-slate-500 group-hover:text-[#0A6CFF] transition-colors" />
                      <span className="text-[8px] font-bold text-slate-500 group-hover:text-[#0A6CFF] transition-colors mt-0.5">
                        Personal
                      </span>
                    </label>
                  </div>

                  {/* Vista Previa en Vivo del Banner */}
                  <div className="pt-2 border-t border-slate-200/80">
                    <span className="block text-[10px] font-mono-code uppercase text-slate-400 font-bold mb-1.5">
                      Vista Previa en Vivo del Banner:
                    </span>
                    <div
                      style={{
                        background: `linear-gradient(90deg, ${promoColor} 0%, ${promoColor}d9 55%, #0B1430 100%)`,
                      }}
                      className="p-2.5 rounded-xl text-white text-xs flex items-center justify-between gap-2 shadow-sm"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="px-2 py-0.5 rounded bg-white text-slate-900 font-extrabold text-[10px] uppercase">
                          {promoBadge || 'PROMO'}
                        </span>
                        <span className="font-semibold text-xs truncate">
                          {promoBanner || '¡Ofertas exclusivas por tiempo limitado en JavrelStore!'}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full flex-shrink-0">
                        {promoDiscount}% OFF
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">% Descuento</label>
                    <input
                      type="number"
                      min="0"
                      max="90"
                      value={promoDiscount}
                      onChange={(e) => setPromoDiscount(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 outline-none focus:border-[#0A6CFF]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Categoría Objetivo</label>
                    <select
                      value={promoCategory}
                      onChange={(e) => setPromoCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 outline-none focus:border-[#0A6CFF]"
                    >
                      <option value="all">Todo el Catálogo</option>
                      <option value="computadores">Computadores</option>
                      <option value="celulares">Celulares</option>
                      <option value="gamer">Zona Gamer</option>
                      <option value="consolas">Consolas</option>
                      <option value="accesorios">Accesorios</option>
                    </select>
                  </div>
                </div>

                <div className="text-xs">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Banner Superior</label>
                  <input
                    type="text"
                    value={promoBanner}
                    onChange={(e) => setPromoBanner(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 outline-none focus:border-[#0A6CFF]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl text-xs font-bold text-white bg-[#0A6CFF] hover:bg-blue-600 shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  Guardar y Activar Campaña
                </button>
              </div>
            </form>
          )}

          {/* ======================================================== */}
          {/* PESTAÑA: COMPRAS ERP A PROVEEDORES                      */}
          {/* ======================================================== */}
          {activeTab === 'purchases' && (
            <AdminPurchasesPanel
              products={products}
              onUpdateInventoryAfterPurchase={(items) => {
                items.forEach((it) => {
                  if (it.productId && onUpdateProductStock) {
                    onUpdateProductStock(it.productId, -Number(it.quantity || 1));
                  }
                });
              }}
              onNotify={showNotification}
            />
          )}

          {/* ======================================================== */}
          {/* PESTAÑA: CRÉDITOS Y CARTERA                              */}
          {/* ======================================================== */}
          {activeTab === 'credits' && (
            <AdminCreditsPanel onNotify={showNotification} />
          )}

          {/* ======================================================== */}
          {/* 6. PESTAÑA: MEDIOS DE PAGO, QRS Y DATÁFONOS ERP          */}
          {/* ======================================================== */}
          {activeTab === 'qr_settings' && (
            <div className="space-y-5">
              {/* Encabezado Principal */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      Medios de Pago, QRs y Datáfonos
                    </h2>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">
                      Integrado POS
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Administra tus cuentas bancarias, códigos QR de tienda y datáfonos físicos Wompi/ePayco.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => showNotification('Cuentas y datáfonos sincronizados en vivo')}
                    className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                    title="Actualizar estado"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setQrSubTab('gateways')}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#059669] hover:bg-[#047857] text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>AGREGAR CUENTA / QR</span>
                  </button>
                </div>
              </div>

              {/* Sub-Pestañas Superiores */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setQrSubTab('qrs')}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    qrSubTab === 'qrs'
                      ? 'bg-[#059669] text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>Cuentas y Códigos QR (Nequi, DaviPlata, Bre-B)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setQrSubTab('terminals')}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    qrSubTab === 'terminals'
                      ? 'bg-[#059669] text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Datáfonos Físicos Integrados (3)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setQrSubTab('gateways')}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    qrSubTab === 'gateways'
                      ? 'bg-[#059669] text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Pasarelas y APIs (Wompi / ePayco)</span>
                </button>
              </div>

              {/* SUB-PESTAÑA 1: LISTADO DE CUENTAS Y QRS */}
              {qrSubTab === 'qrs' && (
                <div className="space-y-4">
                  {/* Pills de Filtrado */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700"
                    >
                      Todos 8
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1 rounded-full text-xs font-bold bg-[#059669] text-white"
                    >
                      Punto de Venta (POS) 8
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700"
                    >
                      Medios por defecto 8
                    </button>
                  </div>

                  {/* Lista de Medios de Pago Interactivos */}
                  <div className="bg-white rounded-3xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
                    {/* 1. Bre-B */}
                    <div
                      onClick={() =>
                        setActiveQrModalData({
                          title: 'Bre-B · Red Interoperable',
                          subtitle: 'Banco de la República / Llave Bre-B',
                          entity: 'Bre-B',
                          holder: titular || 'Jhon Vasquez',
                          phone: nequiPhone || '3122174851',
                          keyBreB: wompiLlaveBreve || 'jhonkavasquez@gmail.com',
                          qrImage: qrUrl || '/zafra/p/k1763147593434.webp',
                        })
                      }
                      className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-700 text-white font-black text-xs flex items-center justify-center flex-shrink-0 shadow-xs">
                          Bre-B
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">Bre-B</span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <QrCode className="w-3 h-3" /> QR Activo
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            🌐 Bre-B / Red Interoperable • {titular || 'Jhon Vasquez'} (
                            {nequiPhone || '3122174851'})
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono-code font-bold">
                          POS
                        </span>
                        <Edit3 className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700" />
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Activo
                        </span>
                      </div>
                    </div>

                    {/* 2. Nequi */}
                    <div
                      onClick={() =>
                        setActiveQrModalData({
                          title: 'Nequi · QR Oficial',
                          subtitle: 'Nequi Colombia',
                          entity: 'Nequi',
                          holder: titular || 'Jhon Vasquez',
                          phone: nequiPhone || '3122174851',
                          keyBreB: wompiLlaveBreve || 'jhonkavasquez@gmail.com',
                          qrImage: qrUrl || '/zafra/p/k1763147593434.webp',
                        })
                      }
                      className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 text-pink-500 font-black text-xs flex items-center justify-center flex-shrink-0 shadow-xs">
                          'N
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">Nequi</span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <QrCode className="w-3 h-3" /> QR Activo
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            🌐 Nequi Colombia • {titular || 'Jhon Vasquez'} ({nequiPhone || '3122174851'})
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono-code font-bold">
                          POS
                        </span>
                        <Edit3 className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700" />
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Activo
                        </span>
                      </div>
                    </div>

                    {/* 3. DaviPlata */}
                    <div
                      onClick={() =>
                        setActiveQrModalData({
                          title: 'DaviPlata · QR Oficial',
                          subtitle: 'DaviPlata / Banco Davivienda',
                          entity: 'DaviPlata',
                          holder: titular || 'Jhon Vasquez',
                          phone: nequiPhone || '3122174851',
                          keyBreB: wompiLlaveBreve || 'jhonkavasquez@gmail.com',
                          qrImage: qrUrl || '/zafra/p/k1763147593434.webp',
                        })
                      }
                      className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-600 text-white font-black text-[9px] flex items-center justify-center flex-shrink-0 shadow-xs">
                          DAVIPLATA
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">DaviPlata</span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <QrCode className="w-3 h-3" /> QR Activo
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            🌐 DaviPlata / Davivienda • {titular || 'Jhon Vasquez'} (
                            {nequiPhone || '3122174851'})
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono-code font-bold">
                          POS
                        </span>
                        <Edit3 className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700" />
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Activo
                        </span>
                      </div>
                    </div>

                    {/* 4. Bancolombia */}
                    <div
                      onClick={() =>
                        setActiveQrModalData({
                          title: 'Bancolombia · QR & Cuenta Ahorros',
                          subtitle: 'Bancolombia Ahorros',
                          entity: 'Bancolombia',
                          holder: titular || 'Jhon Vasquez',
                          accountNumber: bankAccount || '102-849201-44',
                          phone: nequiPhone || '3122174851',
                          keyBreB: wompiLlaveBreve || 'jhonkavasquez@gmail.com',
                          qrImage: qrUrl || '/zafra/p/k1763147593434.webp',
                        })
                      }
                      className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center flex-shrink-0 shadow-xs">
                          Ban
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">Bancolombia</span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <QrCode className="w-3 h-3" /> QR Activo
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            🌐 Bancolombia Ahorros • {titular || 'Jhon Vasquez'} (
                            {bankAccount || '102-849201-44'})
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono-code font-bold">
                          POS
                        </span>
                        <Edit3 className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700" />
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Activo
                        </span>
                      </div>
                    </div>

                    {/* 5. Efectivo */}
                    <div className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center flex-shrink-0">
                          <DollarSign className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 text-sm">Efectivo</span>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            🌐 Caja Principal • Caja Mostrador (N/A)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono-code font-bold">
                          POS
                        </span>
                        <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Activo
                        </span>
                      </div>
                    </div>

                    {/* 6. Tarjeta crédito */}
                    <div className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center flex-shrink-0">
                          <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 text-sm">Tarjeta crédito</span>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            🌐 Datáfono Wompi / Redeban
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono-code font-bold">
                          POS
                        </span>
                        <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Activo
                        </span>
                      </div>
                    </div>

                    {/* 7. Tarjeta débito */}
                    <div className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center flex-shrink-0">
                          <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 text-sm">Tarjeta débito</span>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            🌐 Datáfono Wompi / Redeban
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono-code font-bold">
                          POS
                        </span>
                        <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Activo
                        </span>
                      </div>
                    </div>

                    {/* 8. Otros */}
                    <div className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 font-black text-xs flex items-center justify-center flex-shrink-0">
                          Otr
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 text-sm">Otros</span>
                          <p className="text-[11px] text-slate-500 mt-0.5">🌐 Otros Medios</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono-code font-bold">
                          POS
                        </span>
                        <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Activo
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-PESTAÑA 2: DATÁFONOS FÍSICOS EN RED LOCAL */}
              {qrSubTab === 'terminals' && (
                <div className="space-y-4">
                  {/* Banner de protocolo SmartPOS */}
                  <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                        <Zap className="w-4 h-4" />
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">
                          Datáfonos Físicos en Red Local e Integración Directa
                        </h4>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          Permite enviar el monto de la compra automáticamente al datáfono desde el POS sin teclear valores manualmente.
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-white text-emerald-800 text-[10px] font-mono-code font-bold border border-emerald-200 whitespace-nowrap">
                      Protocolo: SmartPOS API v2
                    </span>
                  </div>

                  {/* Grid de Terminales */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Terminal Wompi Pax A920 Pro */}
                    <div className="bg-white rounded-2xl border-2 border-emerald-500/80 p-5 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                            <CreditCard className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-bold text-xs text-slate-900">
                              Datáfono Wompi SmartPOS
                            </h4>
                            <p className="text-[10px] text-slate-400">
                              Pax A920 Pro (Wompi Bancolombia)
                            </p>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> EN LÍNEA
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono-code bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-slate-400 block uppercase">Terminal ID</span>
                          <strong className="text-slate-800">WMP-98421</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block uppercase">Pasarela / Red</span>
                          <strong className="text-slate-800">WOMPI</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block uppercase">Dirección IP / Host</span>
                          <strong className="text-slate-800">192.168.1.150</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block uppercase">Ambiente</span>
                          <strong className="text-emerald-700">Production</strong>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() =>
                            showNotification(
                              '((•)) Ping exitoso a Datáfono Wompi (192.168.1.150). Terminal listo para cobrar.'
                            )
                          }
                          className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200 transition-colors cursor-pointer"
                        >
                          ((•)) Test de Cobro
                        </button>
                        <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">
                          PREDETERMINADO
                        </span>
                      </div>
                    </div>

                    {/* Terminal ePayco Sunmi V2s */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                            <CreditCard className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-bold text-xs text-slate-900">
                              Datáfono ePayco Smart
                            </h4>
                            <p className="text-[10px] text-slate-400">Sunmi V2s (ePayco Móvil)</p>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> EN LÍNEA
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono-code bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-slate-400 block uppercase">Terminal ID</span>
                          <strong className="text-slate-800">EPC-55012</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block uppercase">Pasarela / Red</span>
                          <strong className="text-slate-800">EPAYCO</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block uppercase">Dirección IP / Host</span>
                          <strong className="text-slate-800">192.168.1.151</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block uppercase">Ambiente</span>
                          <strong className="text-emerald-700">Production</strong>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() =>
                            showNotification(
                              '((•)) Ping exitoso a Datáfono ePayco (192.168.1.151). Terminal listo para cobrar.'
                            )
                          }
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold border border-slate-200 transition-colors cursor-pointer"
                        >
                          ((•)) Test de Cobro
                        </button>
                        <button
                          type="button"
                          onClick={() => showNotification('Datáfono ePayco configurado como predeterminado.')}
                          className="text-[11px] font-semibold text-slate-500 hover:text-slate-800"
                        >
                          Establecer por defecto
                        </button>
                      </div>
                    </div>

                    {/* Terminal Bold Smart */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                            <CreditCard className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-bold text-xs text-slate-900">
                              Datáfono Bold Smart
                            </h4>
                            <p className="text-[10px] text-slate-400">Bold Smart Datáfono</p>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> EN LÍNEA
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono-code bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-slate-400 block uppercase">Terminal ID</span>
                          <strong className="text-slate-800">BLD-78119</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block uppercase">Pasarela / Red</span>
                          <strong className="text-slate-800">BOLD</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block uppercase">Dirección IP / Host</span>
                          <strong className="text-slate-800">Automático</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block uppercase">Ambiente</span>
                          <strong className="text-emerald-700">Production</strong>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() =>
                            showNotification(
                              '((•)) Terminal Bold Smart sincronizado correctamente con el POS.'
                            )
                          }
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold border border-slate-200 transition-colors cursor-pointer"
                        >
                          ((•)) Test de Cobro
                        </button>
                        <button
                          type="button"
                          onClick={() => showNotification('Datáfono Bold configurado como predeterminado.')}
                          className="text-[11px] font-semibold text-slate-500 hover:text-slate-800"
                        >
                          Establecer por defecto
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-PESTAÑA 3: CONFIGURACIÓN PASARELAS Y APIS (FORMULARIO) */}
              {qrSubTab === 'gateways' && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    onUpdateConfig({
                      ...config,
                      qrPaymentImageUrl: qrUrl.trim(),
                      paymentBankAccount: bankAccount.trim(),
                      paymentNequiPhone: nequiPhone.trim(),
                      paymentTitular: titular.trim(),
                      wompiLlaveBreve: wompiLlaveBreve.trim(),
                      wompiPublicKey: wompiPublicKey.trim(),
                      wompiCheckoutUrl: wompiCheckoutUrl.trim(),
                      paypalPaymentLink: paypalPaymentLink.trim(),
                      paypalBusinessEmail: paypalBusinessEmail.trim(),
                    });
                    showNotification('¡Configuración de pasarelas Wompi, PayPal y QR guardada!');
                  }}
                  className="max-w-3xl mx-auto space-y-4"
                >
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 text-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
                          <QrCode className="w-5 h-5 text-[#0A6CFF]" />
                          Pasarela de Pago QR Institucional
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Configura el código QR y cuentas bancarias oficiales para cobros por carrito y pasarela web.
                        </p>
                      </div>
                    </div>

                    {/* Subida y Previsualizador de QR */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                      <label className="block text-[11px] font-bold text-slate-800">
                        Imagen del Código QR (Archivo Local o URL)
                      </label>

                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="w-32 h-32 rounded-2xl bg-white border border-slate-300 p-2 flex items-center justify-center flex-shrink-0 shadow-sm relative group overflow-hidden">
                          {qrUrl ? (
                            <>
                              <img
                                src={qrUrl}
                                alt="Código QR Institucional"
                                className="w-full h-full object-contain rounded-lg"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-xl">
                                <button
                                  type="button"
                                  onClick={() => setQrUrl('')}
                                  className="p-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 shadow-md cursor-pointer"
                                  title="Eliminar imagen actual"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="flex flex-col items-center justify-center text-slate-400 gap-1 text-center p-2">
                              <QrCode className="w-8 h-8 text-slate-300" />
                              <span className="text-[10px] leading-tight font-medium">Sin QR cargado</span>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 space-y-2 w-full">
                          <input
                            ref={qrFileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleQrFileUpload}
                          />

                          <button
                            type="button"
                            onClick={() => qrFileInputRef.current?.click()}
                            disabled={isOptimizingQr}
                            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#0A6CFF] to-blue-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 hover:from-blue-600 hover:to-blue-700 transition-all cursor-pointer disabled:opacity-50"
                          >
                            {isOptimizingQr ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>Comprimiendo a WebP...</span>
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4" />
                                <span>Subir Imagen de QR desde el PC</span>
                              </>
                            )}
                          </button>

                          <div className="pt-1">
                            <input
                              type="text"
                              value={qrUrl}
                              onChange={(e) => setQrUrl(e.target.value)}
                              placeholder="O pegar URL web de la imagen QR..."
                              className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-slate-900 text-xs outline-none focus:border-[#0A6CFF] bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Bancolombia Ahorros
                        </label>
                        <input
                          type="text"
                          value={bankAccount}
                          onChange={(e) => setBankAccount(e.target.value)}
                          placeholder="102-849201-44"
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 outline-none focus:border-[#0A6CFF]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Nequi / DaviPlata
                        </label>
                        <input
                          type="text"
                          value={nequiPhone}
                          onChange={(e) => setNequiPhone(e.target.value)}
                          placeholder="3122174851"
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 outline-none focus:border-[#0A6CFF]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Titular de la Cuenta
                      </label>
                      <input
                        type="text"
                        value={titular}
                        onChange={(e) => setTitular(e.target.value)}
                        placeholder="Jhon Vasquez / JavrelStore S.A.S"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 outline-none focus:border-[#0A6CFF]"
                      />
                    </div>

                    {/* Wompi */}
                    <div className="pt-3 border-t border-slate-200 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-xs">
                          W
                        </span>
                        <span className="text-[11px] font-bold text-slate-800">
                          Integración Oficial Wompi / Bancolombia
                        </span>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Llave Bre-B Wompi (Interoperable)
                        </label>
                        <input
                          type="text"
                          value={wompiLlaveBreve}
                          onChange={(e) => setWompiLlaveBreve(e.target.value)}
                          placeholder="jhonkavasquez@gmail.com"
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 outline-none focus:border-violet-500 font-mono-code"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Llave pública Wompi
                          </label>
                          <input
                            type="text"
                            value={wompiPublicKey}
                            onChange={(e) => setWompiPublicKey(e.target.value)}
                            placeholder="pub_prod_..."
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 outline-none focus:border-violet-500 font-mono-code text-[11px]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            URL checkout Wompi
                          </label>
                          <input
                            type="url"
                            value={wompiCheckoutUrl}
                            onChange={(e) => setWompiCheckoutUrl(e.target.value)}
                            placeholder="https://checkout.wompi.co/l/..."
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 outline-none focus:border-violet-500 text-[11px]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* PayPal */}
                    <div className="pt-3 border-t border-slate-200 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-black italic text-[10px]">
                          PP
                        </span>
                        <span className="text-[11px] font-bold text-slate-800">
                          Integración PayPal
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Correo PayPal Business
                          </label>
                          <input
                            type="email"
                            value={paypalBusinessEmail}
                            onChange={(e) => setPaypalBusinessEmail(e.target.value)}
                            placeholder="pagos@javrelstore.com"
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 outline-none focus:border-[#0A6CFF]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Enlace de pago PayPal
                          </label>
                          <input
                            type="url"
                            value={paypalPaymentLink}
                            onChange={(e) => setPaypalPaymentLink(e.target.value)}
                            placeholder="https://www.paypal.com/paypalme/..."
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 outline-none focus:border-[#0A6CFF]"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 rounded-xl text-xs font-bold text-white bg-[#059669] hover:bg-[#047857] shadow-md shadow-emerald-600/20 cursor-pointer transition-all"
                    >
                      Guardar Configuración de Pasarelas y QRs
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* 7. PESTAÑA: CONTROL DE COLABORADORES (RBAC)              */}
          {/* ======================================================== */}
          {activeTab === 'users' && currentUser?.isPrimary && (
            <AdminUsersPanel
              session={session}
              currentUser={currentUser}
              onNotify={showNotification}
            />
          )}

          {/* Sin pestañas permitidas */}
          {activeTab === 'no_access' && (
            <div className="p-10 rounded-3xl bg-white border border-slate-200 text-center max-w-lg mx-auto">
              <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-display font-bold text-lg text-slate-900">
                Tu usuario no tiene módulos habilitados
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Pide al administrador principal que asigne permisos a tu cuenta.
              </p>
            </div>
          )}
        </div>

        {/* DRAWER MÓVIL DE MÓDULOS */}
        {isMobileTabsOpen && (
          <div className="fixed inset-0 z-[80] lg:hidden">
            <div
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              onClick={() => setIsMobileTabsOpen(false)}
            />
            <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-3xl shadow-2xl max-h-[82dvh] overflow-y-auto animate-scaleUp">
              <div className="sticky top-0 bg-white/95 backdrop-blur px-4 pt-3 pb-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-blue-50 text-[#0A6CFF] border border-blue-100 flex items-center justify-center">
                    <Menu className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="font-display font-bold text-sm text-slate-900">Módulos del panel</h3>
                    <p className="text-[10px] text-slate-500">Selecciona el área que necesitas gestionar</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileTabsOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"
                  aria-label="Cerrar módulos"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3.5 pb-7 grid grid-cols-2 gap-2">
                {availableTabs
                  .filter((tab) => tab !== 'no_access')
                  .map((tab) => {
                    const meta = tabMeta[tab];
                    if (!meta) return null;
                    const Icon = meta.icon;
                    const isActive = activeTab === tab;
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => {
                          setActiveTab(tab);
                          setIsMobileTabsOpen(false);
                        }}
                        className={`relative text-left p-3 rounded-2xl border transition-all active:scale-[0.98] ${
                          isActive
                            ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/15'
                            : 'bg-white border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                              isActive
                                ? 'bg-[#0A6CFF] text-white'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </span>
                          {meta.badge > 0 && (
                            <span className="min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                              {meta.badge > 99 ? '99+' : meta.badge}
                            </span>
                          )}
                        </div>
                        <span className="block text-[11px] font-bold text-slate-900 mt-2">
                          {meta.label}
                        </span>
                        <span className="block text-[9px] text-slate-500 mt-0.5">
                          {meta.description}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE COBRO DE VENTA (ESTILO COMERCIAL DE ALTA GAMA - REFERENCIA) */}
      {isPosCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 animate-scaleUp space-y-4">
            {/* Cabecera del Modal de Cobro */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl bg-emerald-600 text-white font-bold text-xs tracking-wider">
                  CONTINUAR {formatCurrency(posTotalFinal)}
                </span>
                <span className="text-sm font-bold text-slate-800">Cobrar Venta</span>
              </div>
              <button
                type="button"
                onClick={() => setIsPosCheckoutOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* TIPO DE EMISIÓN */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold uppercase text-slate-700">
                  TIPO DE EMISIÓN
                </label>
                <span className="text-[10px] text-slate-400">Venta rápida de punto de venta</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPosEmissionType('ticket')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                    posEmissionType === 'ticket'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Receipt className="w-4 h-4" />
                  <span>Tiquete POS Interno</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPosEmissionType('electronic')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                    posEmissionType === 'electronic'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Factura Electrónica</span>
                </button>
              </div>
            </div>

            {/* VALOR TOTAL & FORMA DE PAGO */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  VALOR TOTAL
                </label>
                <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-display font-black text-base text-slate-900">
                  {formatCurrency(posTotalFinal)}
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  FORMA DE PAGO
                </label>
                <select
                  value={posPaymentTerm}
                  onChange={(e) => setPosPaymentTerm(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none"
                >
                  <option value="Contado">Contado</option>
                  <option value="Crédito">Crédito (30 días)</option>
                  <option value="Contra Entrega">Contra Entrega</option>
                </select>
              </div>
            </div>

            {/* MÉTODO DE PAGO / ENTIDAD */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                MÉTODO DE PAGO / ENTIDAD
              </label>
              <select
                value={posPaymentEntity}
                onChange={(e) => {
                  setPosPaymentEntity(e.target.value);
                  if (e.target.value.includes('CAJA') || e.target.value.includes('Efectivo')) {
                    setPosPaymentMethod('Efectivo');
                  } else if (e.target.value.includes('Nequi')) {
                    setPosPaymentMethod('Nequi');
                  } else if (e.target.value.includes('Bancolombia')) {
                    setPosPaymentMethod('Bancolombia QR');
                  } else {
                    setPosPaymentMethod('Tarjeta Débito/Crédito');
                  }
                }}
                className="w-full px-3 py-2 bg-white border border-emerald-600/70 rounded-xl text-xs font-bold text-slate-900 outline-none"
              >
                <option value="CAJA : CAJA PRINCIPAL">CAJA : CAJA PRINCIPAL (Efectivo)</option>
                <option value="Bancolombia QR">Bancolombia QR Transferencia</option>
                <option value="Nequi">Nequi Pagos</option>
                <option value="DaviPlata">DaviPlata Móvil</option>
                <option value="Tarjeta Débito/Crédito">Datafono / Tarjeta Débito-Crédito</option>
              </select>
            </div>

            {/* CAJA DE MONTO ENTREGADO Y VUELTAS */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    MONTO ENTREGADO ($)
                  </label>
                  <input
                    type="number"
                    value={posCashReceived}
                    onChange={(e) => setPosCashReceived(e.target.value)}
                    placeholder="35000"
                    className="w-full px-3 py-2 bg-white border border-emerald-600 rounded-xl text-base font-bold text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    CAMBIO A ENTREGAR
                  </label>
                  <div className="px-3 py-2 bg-white border border-slate-200 rounded-xl font-display font-black text-lg text-emerald-600">
                    {formatCurrency(posChange)}
                  </div>
                </div>
              </div>

              {/* OPCIONES RÁPIDAS DE PAGO */}
              <div>
                <span className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">
                  OPCIONES RÁPIDAS DE PAGO
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPosCashReceived(posTotalFinal.toString())}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white border border-slate-200 hover:border-emerald-500 text-slate-800 transition-colors shadow-xs"
                  >
                    Exacto
                  </button>
                  {[1000, 2000, 10000, 20000, 50000, 100000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setPosCashReceived(val.toString())}
                      className="px-2 py-1 rounded-lg text-[11px] font-mono-code font-bold bg-white border border-slate-200 hover:border-emerald-500 text-slate-800 transition-colors shadow-xs"
                    >
                      {val.toLocaleString('es-CO')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* BOTONES INFERIORES */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsPosCheckoutOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                ✕ Cerrar (Ctrl + Z)
              </button>
              <button
                type="button"
                onClick={handleCompletePosSale}
                disabled={isLoading}
                className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40"
              >
                <Check className="w-4 h-4" />
                <span>Facturar (F9)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Buscador Visual Estilo Pinterest / Galería Web */}
      {visualGalleryModal.isOpen && (
        <VisualImageSearchModal
          isOpen={visualGalleryModal.isOpen}
          initialQuery={visualGalleryModal.query}
          category={visualGalleryModal.category}
          productTitle={visualGalleryModal.productTitle}
          onClose={() =>
            setVisualGalleryModal({
              isOpen: false,
              query: '',
              category: 'computadores',
              productTitle: '',
            })
          }
          onSelectImage={(newWebp) => {
            if (editingProduct) {
              setEditingProduct((prev) => ({ ...prev, image: newWebp }));
            }
          }}
        />
      )}

      {/* Modal Interactivo de Visualización de QR (Zoom 1x / Zoom HD / Pantalla Completa) */}
      {activeQrModalData && (
        <AdminPaymentQrModal
          isOpen={Boolean(activeQrModalData)}
          onClose={() => setActiveQrModalData(null)}
          accountData={activeQrModalData}
        />
      )}

      {/* Centro de Difusión Multicanal del Inventario */}
      {shareProduct && (
        <SocialShareModal
          isOpen
          product={shareProduct}
          config={config}
          isAdmin
          onClose={() => setShareProduct(null)}
          onProductUpdated={(updated) => {
            setShareProduct(updated);
            if (onRefetchProducts) onRefetchProducts();
          }}
        />
      )}

      {/* Lightbox para Visualización en Alta Resolución con Zoom */}
      <ImageLightbox
        isOpen={lightboxData.isOpen}
        image={lightboxData.image}
        title={lightboxData.title}
        price={lightboxData.price}
        brand={lightboxData.brand}
        onClose={() =>
          setLightboxData({ isOpen: false, image: '', title: '', price: null, brand: '' })
        }
      />
    </div>
  );
};
