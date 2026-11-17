// erpFinanceService.js — JavrelStore Enterprise
// Servicio ERP para:
//   1. Generación inteligente de SKU y Códigos EAN-13 por Heurística / IA
//   2. Compras a Proveedores e ingreso de inventario con cálculo de impuestos
//   3. Créditos a Clientes, Cuentas por Cobrar e Historial de Abonos
//   4. Proveedores registrados y sincronización de cartera

const LOCAL_STORAGE_PURCHASES_KEY = 'javrelstore_purchases_history';
const LOCAL_STORAGE_CREDITS_KEY = 'javrelstore_client_credits';
const LOCAL_STORAGE_SUPPLIERS_KEY = 'javrelstore_suppliers_list';
const LOCAL_STORAGE_ABONOS_KEY = 'javrelstore_abonos_history';

// Proveedores iniciales por defecto para pruebas y demo
const INITIAL_SUPPLIERS = [
  {
    id: 'prov-001',
    name: 'Distribuciones del Norte S.A.S.',
    nit: '900.542.128-4',
    phone: '314 892 4512',
    email: 'contacto@distrinorte.com.co',
    city: 'Medellín',
    address: 'Cra 48 # 26-85',
  },
  {
    id: 'prov-002',
    name: 'Mayorista Tecnológico de Colombia',
    nit: '860.103.952-1',
    phone: '301 772 9010',
    email: 'ventas@mayotec.co',
    city: 'Bogotá',
    address: 'Calle 13 # 68D-31',
  },
  {
    id: 'prov-003',
    name: 'Importaciones y Logística Andina',
    nit: '901.334.821-9',
    phone: '318 450 1192',
    email: 'pedidos@logisticaandina.com',
    city: 'Cali',
    address: 'Av 6N # 28-14',
  },
];

// Cuentas de crédito iniciales por defecto
const INITIAL_CREDITS = [
  {
    id: 'cred-101',
    clientName: 'Alfonso Ramírez Gómez',
    docId: '1.020.450.912',
    phone: '312 849 2011',
    email: 'alfonso.ramirez@gmail.com',
    creditLimit: 2500000,
    currentDebt: 850000,
    dueDate: '2026-11-25',
    status: 'al_dia', // 'al_dia' | 'en_mora' | 'saldado'
    totalPurchases: 3,
    lastPaymentDate: '2026-11-01',
    notes: 'Cliente frecuente de mostrador. Pagos quincenales.',
  },
  {
    id: 'cred-102',
    clientName: 'Comercializadora Tecnológica San Pedro',
    docId: '901.442.890-3',
    phone: '300 651 8892',
    email: 'compras@sanpedrotech.com',
    creditLimit: 8000000,
    currentDebt: 3200000,
    dueDate: '2026-11-15',
    status: 'al_dia',
    totalPurchases: 7,
    lastPaymentDate: '2026-10-28',
    notes: 'Facturación a 30 días de plazo.',
  },
  {
    id: 'cred-103',
    clientName: 'Mariana Duarte Restrepo',
    docId: '43.912.831',
    phone: '315 220 9044',
    email: 'mariana.duarte@hotmail.com',
    creditLimit: 1200000,
    currentDebt: 450000,
    dueDate: '2026-10-30',
    status: 'en_mora',
    totalPurchases: 2,
    lastPaymentDate: '2026-10-10',
    notes: 'Presenta retraso de 11 días. Contactar por WhatsApp.',
  },
];

export const erpFinanceService = {
  // =========================================================================
  // 1. GENERACIÓN INTELIGENTE DE SKU Y EAN-13
  // =========================================================================

  /**
   * Genera una referencia / SKU corta, limpia y elegante basada en el nombre
   * Ejemplo: "Mouse Gamer con Cable Genius" -> "MOU-001"
   */
  generateSku(productName = '', category = '', existingProducts = []) {
    const cleanName = productName
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    // Palabras a ignorar (artículos, preposiciones)
    const stopWords = new Set(['DE', 'LA', 'EL', 'CON', 'PARA', 'EN', 'POR', 'Y', 'O', 'UN', 'UNA', 'LOS', 'LAS']);
    const words = cleanName.split(/[\s\-_/]+/).filter((w) => w.length > 1 && !stopWords.has(w));

    let prefix = 'PRD';
    if (words.length > 0) {
      const firstWord = words[0];
      if (firstWord.length >= 3) {
        prefix = firstWord.slice(0, 3);
      } else if (words.length >= 2) {
        prefix = (firstWord + words[1]).slice(0, 3);
      } else {
        prefix = firstWord.padEnd(3, 'X');
      }
    } else if (category) {
      prefix = category.toUpperCase().slice(0, 3);
    }

    // Contar cuántos productos ya tienen este prefijo para numerar correlativamente (001, 002, etc.)
    const existingMatches = existingProducts.filter((p) => {
      const ref = (p.reference || p.sku || '').toUpperCase();
      return ref.startsWith(prefix);
    });

    const nextIndex = existingMatches.length + 1;
    const suffix = String(nextIndex).padStart(3, '0');

    return `${prefix}-${suffix}`;
  },

  /**
   * Genera un código de barras EAN-13 válido con prefijo colombiano (770)
   * y cálculo del dígito verificador estándar GS1.
   */
  generateEan13() {
    // 770 es el código país GS1 para Colombia
    const countryPrefix = '770';
    let digits = countryPrefix;
    // Generar 9 dígitos aleatorios
    for (let i = 0; i < 9; i++) {
      digits += Math.floor(Math.random() * 10);
    }

    // Cálculo del dígito verificador EAN-13
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(digits[i], 10);
      sum += i % 2 === 0 ? digit : digit * 3;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return digits + String(checkDigit);
  },

  // =========================================================================
  // 2. GESTIÓN DE PROVEEDORES
  // =========================================================================

  getSuppliers() {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_SUPPLIERS_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return INITIAL_SUPPLIERS;
  },

  saveSupplier(supplier) {
    const list = this.getSuppliers();
    const newSupplier = {
      ...supplier,
      id: supplier.id || `prov-${Date.now()}`,
      createdAt: supplier.createdAt || new Date().toISOString(),
    };
    const updated = [newSupplier, ...list.filter((s) => s.id !== newSupplier.id)];
    localStorage.setItem(LOCAL_STORAGE_SUPPLIERS_KEY, JSON.stringify(updated));
    return newSupplier;
  },

  // =========================================================================
  // 3. COMPRAS A PROVEEDORES E INGRESO DE INVENTARIO
  // =========================================================================

  getPurchases() {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_PURCHASES_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) {}
    return [];
  },

  /**
   * Guarda una factura de compra a proveedor y actualiza el stock y costo del catálogo
   */
  savePurchase(purchaseData, updateInventoryCallback = null) {
    const purchases = this.getPurchases();
    const invoiceNumber = purchaseData.invoiceNumber || `FC-${Math.floor(10000 + Math.random() * 90000)}`;

    const newPurchase = {
      ...purchaseData,
      id: purchaseData.id || `purch-${Date.now()}`,
      invoiceNumber,
      createdAt: new Date().toISOString(),
      status: purchaseData.status || 'Completada',
    };

    // Si hay callback para impactar inventario directamente:
    if (updateInventoryCallback && Array.isArray(purchaseData.items)) {
      updateInventoryCallback(purchaseData.items);
    }

    purchases.unshift(newPurchase);
    localStorage.setItem(LOCAL_STORAGE_PURCHASES_KEY, JSON.stringify(purchases));
    return newPurchase;
  },

  // =========================================================================
  // 4. CRÉDITOS A CLIENTES Y CUENTAS POR COBRAR
  // =========================================================================

  getCredits() {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_CREDITS_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return INITIAL_CREDITS;
  },

  saveCredit(creditData) {
    const credits = this.getCredits();
    const newCredit = {
      ...creditData,
      id: creditData.id || `cred-${Date.now()}`,
      updatedAt: new Date().toISOString(),
    };
    const updated = [newCredit, ...credits.filter((c) => c.id !== newCredit.id)];
    localStorage.setItem(LOCAL_STORAGE_CREDITS_KEY, JSON.stringify(updated));
    return newCredit;
  },

  /**
   * Registra un abono a una cuenta de crédito y disminuye la deuda pendiente
   */
  registerAbono({ creditId, amount, paymentMethod = 'Efectivo', note = '' }) {
    const credits = this.getCredits();
    const target = credits.find((c) => c.id === creditId);
    if (!target) throw new Error('Cuenta de crédito no encontrada');

    const numAmount = Number(amount) || 0;
    if (numAmount <= 0) throw new Error('El monto del abono debe ser mayor a 0');

    const remainingDebt = Math.max(0, target.currentDebt - numAmount);
    const newStatus = remainingDebt === 0 ? 'saldado' : target.status;

    const updatedCredits = credits.map((c) => {
      if (c.id === creditId) {
        return {
          ...c,
          currentDebt: remainingDebt,
          status: newStatus,
          lastPaymentDate: new Date().toISOString().slice(0, 10),
        };
      }
      return c;
    });

    localStorage.setItem(LOCAL_STORAGE_CREDITS_KEY, JSON.stringify(updatedCredits));

    // Registrar en el historial de abonos
    const abonos = this.getAbonosHistory();
    const newAbonoRecord = {
      id: `abono-${Date.now()}`,
      creditId,
      clientName: target.clientName,
      amount: numAmount,
      previousDebt: target.currentDebt,
      remainingDebt,
      paymentMethod,
      note,
      date: new Date().toISOString(),
    };
    abonos.unshift(newAbonoRecord);
    localStorage.setItem(LOCAL_STORAGE_ABONOS_KEY, JSON.stringify(abonos));

    return { updatedCredit: updatedCredits.find((c) => c.id === creditId), abonoRecord: newAbonoRecord };
  },

  getAbonosHistory() {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_ABONOS_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) {}
    return [];
  },
};
