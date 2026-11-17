/**
 * Catálogo central de roles y permisos granulares de JavrelStore.
 *
 * Se usa tanto en el cliente (visibilidad de módulos) como en el servidor
 * (validación de payloads del endpoint de administración de usuarios).
 */

export const ROLES = {
  ADMIN: 'admin',
  EDITOR: 'editor',
  POS_OPERATOR: 'pos_operator',
};

export const PERMISSIONS = {
  EDIT_PAGE: 'edit_page',
  MANAGE_PRODUCTS: 'manage_products',
  POS_SALES: 'pos_sales',
  MANAGE_ORDERS: 'manage_orders',
  ERP_PURCHASES: 'erp_purchases',
  ERP_CREDITS: 'erp_credits',
  MANAGE_USERS: 'manage_users',
};

export const PERMISSION_CATALOG = [
  {
    key: PERMISSIONS.EDIT_PAGE,
    label: 'Editar página (Wix/Elementor)',
    description: 'Textos, precios, títulos, imágenes y contenido in-situ de la tienda.',
    icon: 'Palette',
  },
  {
    key: PERMISSIONS.MANAGE_PRODUCTS,
    label: 'Gestionar productos e inventario',
    description: 'Crear, editar, importar por PDF, generar SKU/EAN y eliminar ítems.',
    icon: 'Package',
  },
  {
    key: PERMISSIONS.POS_SALES,
    label: 'Realizar ventas POS',
    description: 'Abrir la caja de mostrador, cobrar, facturar y emitir recibos.',
    icon: 'ShoppingCart',
  },
  {
    key: PERMISSIONS.MANAGE_ORDERS,
    label: 'Gestionar pedidos y pasarelas',
    description: 'Pedidos en línea, pagos QR, archivo, estados y despachos.',
    icon: 'ClipboardList',
  },
  {
    key: PERMISSIONS.ERP_PURCHASES,
    label: 'Compras ERP a proveedores',
    description: 'Registro de facturas de compra, costos e ingreso automático de stock.',
    icon: 'FileText',
  },
  {
    key: PERMISSIONS.ERP_CREDITS,
    label: 'Créditos y cartera de clientes',
    description: 'Control de saldos de clientes, registro de abonos y mora.',
    icon: 'Receipt',
  },
];

// Incluye manage_users, que no se muestra como casilla en el formulario
// pero sí forma parte del perfil del administrador principal.
export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Administrador',
  [ROLES.EDITOR]: 'Editor',
  [ROLES.POS_OPERATOR]: 'Operador POS',
};

export const ROLE_DESCRIPTIONS = {
  [ROLES.ADMIN]: 'Acceso total a la tienda y a la gestión de colaboradores.',
  [ROLES.EDITOR]: 'Edición visual de la página y gestión del catálogo.',
  [ROLES.POS_OPERATOR]: 'Caja POS, ventas de mostrador y gestión de pedidos.',
};

export const ROLE_DEFAULT_PERMISSIONS = {
  [ROLES.ADMIN]: {
    [PERMISSIONS.EDIT_PAGE]: true,
    [PERMISSIONS.MANAGE_PRODUCTS]: true,
    [PERMISSIONS.POS_SALES]: true,
    [PERMISSIONS.MANAGE_ORDERS]: true,
    [PERMISSIONS.ERP_PURCHASES]: true,
    [PERMISSIONS.ERP_CREDITS]: true,
    [PERMISSIONS.MANAGE_USERS]: true,
  },
  [ROLES.EDITOR]: {
    [PERMISSIONS.EDIT_PAGE]: true,
    [PERMISSIONS.MANAGE_PRODUCTS]: true,
    [PERMISSIONS.POS_SALES]: false,
    [PERMISSIONS.MANAGE_ORDERS]: false,
    [PERMISSIONS.ERP_PURCHASES]: false,
    [PERMISSIONS.ERP_CREDITS]: false,
    [PERMISSIONS.MANAGE_USERS]: false,
  },
  [ROLES.POS_OPERATOR]: {
    [PERMISSIONS.EDIT_PAGE]: false,
    [PERMISSIONS.MANAGE_PRODUCTS]: false,
    [PERMISSIONS.POS_SALES]: true,
    [PERMISSIONS.MANAGE_ORDERS]: true,
    [PERMISSIONS.ERP_PURCHASES]: false,
    [PERMISSIONS.ERP_CREDITS]: false,
    [PERMISSIONS.MANAGE_USERS]: false,
  },
};

export const EMPTY_PERMISSIONS = {
  [PERMISSIONS.EDIT_PAGE]: false,
  [PERMISSIONS.MANAGE_PRODUCTS]: false,
  [PERMISSIONS.POS_SALES]: false,
  [PERMISSIONS.MANAGE_ORDERS]: false,
  [PERMISSIONS.ERP_PURCHASES]: false,
  [PERMISSIONS.ERP_CREDITS]: false,
  [PERMISSIONS.MANAGE_USERS]: false,
};

export const sanitizeRole = (role) =>
  Object.values(ROLES).includes(role) ? role : ROLES.EDITOR;

export const normalizePermissions = (permissions = {}, role = ROLES.EDITOR) => {
  const base = ROLE_DEFAULT_PERMISSIONS[sanitizeRole(role)] || EMPTY_PERMISSIONS;
  const normalized = { ...EMPTY_PERMISSIONS };

  ALL_PERMISSIONS.forEach((key) => {
    normalized[key] = Boolean(
      permissions && typeof permissions === 'object' && key in permissions
        ? permissions[key]
        : base[key]
    );
  });

  return normalized;
};

export const hasPermission = (user, permission) => {
  if (!user) return false;
  if (user.isPrimary) return true;
  if (!permission) return Boolean(user);
  return Boolean(user.permissions?.[permission]);
};

export const getRoleLabel = (role) => ROLE_LABELS[role] || 'Colaborador';

export const getPrimaryAdminEmail = () =>
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PRIMARY_ADMIN_EMAIL) ||
  'jhonkavasquez@gmail.com';
