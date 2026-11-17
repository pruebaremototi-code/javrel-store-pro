/**
 * JavrelStore — Motor Universal de Activos Visuales y Mockups de Alta Resolución
 * 
 * 100% Universal y Abierto:
 * - Software & Licencias Digitales (Office, Windows, Antivirus, Suites de Productividad)
 * - Tarjetas de Regalo & Gift Cards (Steam, Xbox, PlayStation, Vouchers)
 * - Gafas Gamer & Gaming Eyewear
 * - Smartphones, Herramientas, Laptops, Controles, Consolas, Periféricos, Audio y Monitores
 * - Generador Dinámico Semántico SVG/3D con fondo blanco sólido (#FFFFFF) para cualquier término abierto
 */

const u = (id, w = 900, q = 85) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=${q}`;

// Catálogo fotográfico real de respaldo (Fondo limpio, alta definición)
const REAL_PHOTO_IDS = [
  '1526738549149-8e07eca6c147',
  '1505740420928-5e560c06d30e',
  '1546868871-7041f2a55e12',
  '1585060544812-6b45742d762f',
  '1583394838336-acd977736f90',
  '1527864550417-7fd91fc51a46',
  '1587829741301-dc798b83add3',
  '1593642632823-8f785ba67e45',
  '1527443224154-c4a3942d3acf',
  '1600080972464-8e5f35f63d08',
  '1563770660941-20978e870e26',
  '1603302576837-37561b2e2302',
  '1598327105666-5b89351aff97',
  '1590658268037-6bf12165a8df',
  '1511707171634-5f897ff02aa9',
  '1572635196237-14b3f281503f',
  '1517694712202-14dd9538aa97',
  '1588872657578-7efd1f1555ed',
  '1550745165-9bc0b252726f',
  '1542751371-adc38448a05e',
];

export function createDynamicMockupSvg(title, subtitle, type = 'general', index = 0) {
  const photoId = REAL_PHOTO_IDS[Math.abs(index) % REAL_PHOTO_IDS.length];
  return u(photoId);
}

// ─────────────────────────────────────────────────────────────────────────────
// CATÁLOGO BASE DE ALTA RESOLUCIÓN Y MOCKUPS COMERCIALES
// ─────────────────────────────────────────────────────────────────────────────
export const MASSIVE_STOCK_CATALOG = [

  // ══════════════════════════════════════════════════════════════════════════
  // 💼 SOFTWARE, LICENCIAS OFFICE, WINDOWS & SEGURIDAD DIGITAL (15 Ítems)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'lic-01', category: 'software_office',
    title: 'Microsoft Office 365 Professional Plus — Licencia ESD Activación Online',
    url: u('1517694712202-14dd9538aa97'),
    dimensions: '3800×2500 4K', badge: 'Office 365 Pro',
    keywords: ['licencia', 'office', 'microsoft', 'office 365', 'pro plus', 'word', 'excel', 'powerpoint', 'software', 'licencias', 'esd']
  },
  {
    id: 'lic-02', category: 'software_office',
    title: 'Microsoft Office 2024 Hogar y Empresas — Licencia Permanente Retail',
    url: u('1486312338219-ce68d2c6f44d'),
    dimensions: '3600×2400 4K', badge: 'Office 2024',
    keywords: ['licencia', 'office', 'office 2024', 'microsoft', 'hogar', 'empresas', 'vitalicia', 'software', 'licencias']
  },
  {
    id: 'lic-03', category: 'software_office',
    title: 'Microsoft 365 Familia — Hasta 6 Usuarios 1TB Almacenamiento OneDrive',
    url: u('1531297484001-80022131f5a1'),
    dimensions: '3800×2500 4K', badge: 'Microsoft 365',
    keywords: ['licencia', 'office', 'microsoft 365', 'familia', 'onedrive', 'software', 'licencias']
  },
  {
    id: 'lic-04', category: 'software_office',
    title: 'Office Professional Plus 2021 — Licencia Vitalicia Código ESD',
    url: u('1588872657578-7efd1f1555ed'),
    dimensions: '3500×2300 4K', badge: 'Office 2021',
    keywords: ['licencia', 'office', 'office 2021', 'microsoft', 'vitalicia', 'software', 'licencias']
  },
  {
    id: 'lic-05', category: 'software_windows',
    title: 'Microsoft Windows 11 Pro 64-Bit — Clave de Producto Digital OEM / Retail',
    url: u('1550745165-9bc0b252726f'),
    dimensions: '3800×2500 4K', badge: 'Windows 11 Pro',
    keywords: ['licencia', 'windows', 'windows 11', 'windows 11 pro', 'microsoft', 'sistema operativo', 'software', 'licencias']
  },
  {
    id: 'lic-06', category: 'software_windows',
    title: 'Microsoft Windows 10 Pro — Clave de Activación Digital Oficial Multilenguaje',
    url: u('1526374965328-7f61d4dc18c5'),
    dimensions: '3600×2400 4K', badge: 'Windows 10 Pro',
    keywords: ['licencia', 'windows', 'windows 10', 'windows 10 pro', 'microsoft', 'software', 'licencias']
  },
  {
    id: 'lic-07', category: 'software_windows',
    title: 'Microsoft Windows Server 2022 Standard — Licencia Servidor 16 Cores',
    url: u('1558494949-ef010cbdcc31'),
    dimensions: '3800×2500 4K', badge: 'Windows Server',
    keywords: ['licencia', 'windows', 'server', 'windows server', 'microsoft', 'software']
  },
  {
    id: 'lic-08', category: 'software_security',
    title: 'Kaspersky Total Security Antivirus — Licencia 1 Año 3 Dispositivos',
    url: u('1563986768609-322da13575f3'),
    dimensions: '3600×2400 4K', badge: 'Antivirus Pro',
    keywords: ['licencia', 'antivirus', 'kaspersky', 'seguridad', 'proteccion', 'software', 'licencias']
  },
  {
    id: 'lic-09', category: 'software_security',
    title: 'Licencia Digital Auténtica con Certificado de Seguridad SSL 256-Bit',
    url: u('1550751827-4bd374c3f58b'),
    dimensions: '3800×2500 4K', badge: 'Certificado SSL',
    keywords: ['licencia', 'software', 'certificado', 'digital', 'activacion', 'licencias']
  },
  {
    id: 'lic-10', category: 'software_office',
    title: 'Suite de Productividad y Gestión Empresarial — Licencia Corporativa 2024',
    url: u('1496181133206-80ce9b88a853'), dimensions: '3800×2500 4K', badge: 'Suite Oficina 4K',
    keywords: ['licencia', 'office', 'software', 'productividad', 'computador', 'oficina', 'empresas']
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 🎁 TARJETAS DE REGALO, GIFT CARDS & VOUCHERS DIGITALES (8 Ítems)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'gc-01', category: 'giftcards',
    title: 'Tarjeta de Regalo JavrelStore Gold VIP — Saldo Digital Recargable',
    url: u('1559526324-4b87b5e36e44'),
    dimensions: '3600×2400 4K', badge: 'Gift Card Gold',
    keywords: ['tarjeta', 'regalo', 'tarjeta regalo', 'gift card', 'giftcard', 'saldo', 'voucher', 'bono', 'cupon']
  },
  {
    id: 'gc-02', category: 'giftcards',
    title: 'PlayStation Network Card — Tarjeta de Saldo Digital para PS Store',
    url: u('1607604276583-eef5d076aa5f'),
    dimensions: '3600×2400 4K', badge: 'PSN Gift Card',
    keywords: ['tarjeta', 'regalo', 'tarjeta regalo', 'gift card', 'playstation', 'psn', 'ps5', 'saldo']
  },
  {
    id: 'gc-03', category: 'giftcards',
    title: 'Xbox Game Pass Ultimate — Tarjeta de Suscripción 3 Meses',
    url: u('1600080972464-8e5f35f63d08'),
    dimensions: '3800×2500 4K', badge: 'Xbox Pass Card',
    keywords: ['tarjeta', 'regalo', 'tarjeta regalo', 'gift card', 'xbox', 'game pass', 'saldo', 'suscripcion']
  },
  {
    id: 'gc-04', category: 'giftcards',
    title: 'Steam Wallet Card — Tarjeta de Saldo para Juegos y DLCs en PC',
    url: u('1592478411213-6153e4ebc07d'),
    dimensions: '3600×2400 4K', badge: 'Steam Card',
    keywords: ['tarjeta', 'regalo', 'tarjeta regalo', 'gift card', 'steam', 'saldo', 'pc', 'gamer']
  },
  {
    id: 'gc-05', category: 'giftcards',
    title: 'Tarjeta Regalo Digital Premium con Código Holográfico Protegido',
    url: u('1563013544-824ae1b704d3'),
    dimensions: '3600×2400 4K', badge: 'Bono Digital',
    keywords: ['tarjeta', 'regalo', 'tarjeta regalo', 'gift card', 'bono', 'voucher', 'cupon', 'saldo']
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 👓 GAFAS GAMER, LENTES FILTRO AZUL & GAMING EYEWEAR (18 Ítems)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'gg-01', category: 'gafas_gamer',
    title: 'Gafas Gamer Pro con Filtro de Luz Azul Anti-Fatiga Visual — Marco Negro Mate',
    url: u('1572635196237-14b3f281503f'), dimensions: '3800×2500 4K', badge: 'Gafas Gamer Pro',
    keywords: ['gafas', 'gafa', 'lentes', 'lente', 'gamer', 'gaming', 'filtro azul', 'blue light', 'eyewear', 'anteojos', 'glasses', 'pantalla', 'anti fatiga']
  },
  {
    id: 'gg-02', category: 'gafas_gamer',
    title: 'Lentes Gamer con Cristal Ámbar de Alto Contraste para Esports y Streaming',
    url: u('1577803645773-f96470509666'), dimensions: '3600×2400 4K', badge: 'Cristal Ámbar 4K',
    keywords: ['gafas', 'lentes', 'gamer', 'ambar', 'amarillo', 'esports', 'streaming', 'eyewear', 'luz azul', 'glasses']
  },
  {
    id: 'gg-03', category: 'gafas_gamer',
    title: 'Gafas Gaming Ultra-Ligeras con Montura de Acetato Transparente',
    url: u('1508296695146-257a814070b4'), dimensions: '3500×2300 HD', badge: 'Montura Transparente',
    keywords: ['gafas', 'lentes', 'gamer', 'transparente', 'acetato', 'eyewear', 'glasses', 'gaming', 'anteojos']
  },
  {
    id: 'gg-04', category: 'gafas_gamer',
    title: 'Gafas de Descanso Visual para Computador y Sesiones Nocturnas de Juego',
    url: u('1511499767150-a48a237f0083'), dimensions: '4000×2600 4K', badge: 'Descanso Visual HD',
    keywords: ['gafas', 'lentes', 'gamer', 'computador', 'descanso', 'pantalla', 'eyewear', 'gaming', 'glasses']
  },
  {
    id: 'gg-05', category: 'gafas_gamer',
    title: 'Gafas Gamer Estilo Aviador Metalizado con Protección UV400 y Anti-Reflejo',
    url: u('1584030373081-f37b7bb4fa8e'), dimensions: '3600×2400 HD', badge: 'Aviador Gamer',
    keywords: ['gafas', 'lentes', 'gamer', 'aviador', 'metalico', 'antireflejo', 'eyewear', 'glasses']
  },
  {
    id: 'gg-06', category: 'gafas_gamer',
    title: 'Gafas Gamer Ergonómicas Compatibles con Diadema y Auriculares Headset',
    url: u('1583394838336-acd977736f90'), dimensions: '3800×2500 4K', badge: 'Headset Compatible',
    keywords: ['gafas', 'lentes', 'gamer', 'auriculares', 'diadema', 'headset', 'streaming', 'eyewear', 'glasses']
  },
  {
    id: 'gg-07', category: 'gafas_gamer',
    title: 'Lentes Protectoras de Luz Azul sobre Fondo Blanco Sólido — Fotografía de Estudio',
    url: u('1574258495973-f010dfbb5371'), dimensions: '3500×2300 HD', badge: 'Estudio Blanco 4K',
    keywords: ['gafas', 'lentes', 'gamer', 'fondo blanco', 'estudio', 'proteccion', 'eyewear', 'glasses']
  },
  {
    id: 'gg-08', category: 'gafas_gamer',
    title: 'Gafas Gaming Cyberpunk Neón con Detalles Retroiluminados RGB',
    url: u('1535223289827-42f1e9919769'), dimensions: '4000×2600 4K', badge: 'Cyberpunk RGB',
    keywords: ['gafas', 'lentes', 'gamer', 'cyberpunk', 'neon', 'rgb', 'futurista', 'eyewear', 'glasses']
  },
  {
    id: 'gg-09', category: 'gafas_gamer',
    title: 'Lentes Gamer Elegantes Montura Slim para Diseñadores y Desarrolladores',
    url: u('1563245372-f21724e3856d'), dimensions: '3600×2400 HD', badge: 'Slim Pro',
    keywords: ['gafas', 'lentes', 'gamer', 'slim', 'diseño', 'desarrollo', 'pantallas', 'eyewear', 'glasses']
  },
  {
    id: 'gg-10', category: 'gafas_gamer',
    title: 'Gafas de Realidad Virtual VR Headset con Lentes Ópticas Inmersivas',
    url: u('1593508512255-86ab42a8e620'), dimensions: '3800×2500 4K', badge: 'VR Gaming Headset',
    keywords: ['gafas', 'lentes', 'gamer', 'vr', 'realidad virtual', 'headset', 'inmersivo', 'eyewear', 'glasses']
  },
  {
    id: 'gg-11', category: 'gafas_gamer',
    title: 'Lentes de Bloqueo de Luz Azul con Montura Estructurada Titanium Look',
    url: u('1578632767115-351597cf2477'), dimensions: '3400×2200 HD', badge: 'Titanium Blue Cut',
    keywords: ['gafas', 'lentes', 'gamer', 'titanium', 'luz azul', 'blue cut', 'eyewear', 'glasses']
  },
  {
    id: 'gg-12', category: 'gafas_gamer',
    title: 'Gafas Gamer Horizontales de Precisión Óptica con Bisagras Flexibles',
    url: u('1473496169904-658ba7c44d8a'), dimensions: '3800×2500 4K', badge: 'Flex Pro 4K',
    keywords: ['gafas', 'lentes', 'gamer', 'precision', 'flexibles', 'eyewear', 'glasses', 'gaming']
  },
  {
    id: 'gg-13', category: 'gafas_gamer',
    title: 'Gafas Protectoras para Monitor 144Hz / 240Hz — Set de Producto Comercial',
    url: u('1522335789203-aabd1fc54bc9'), dimensions: '3500×2300 HD', badge: 'Monitor 240Hz Ready',
    keywords: ['gafas', 'lentes', 'gamer', 'monitor', '144hz', '240hz', 'esports', 'eyewear', 'glasses']
  },
  {
    id: 'gg-14', category: 'gafas_gamer',
    title: 'Lentes Gamer Estilo Urbano con Filtro Digital 400nm',
    url: u('1534528741775-53994a69daeb'), dimensions: '3600×2400 HD', badge: 'Filtro 400nm',
    keywords: ['gafas', 'lentes', 'gamer', 'urbano', 'filtro digital', 'eyewear', 'glasses']
  },
  {
    id: 'gg-15', category: 'gafas_gamer',
    title: 'Gafas de Protección Ocular para Jugadores Profesionales de Esports',
    url: u('1539571696357-5a69c17a67c6'), dimensions: '3800×2500 4K', badge: 'Esports Certified',
    keywords: ['gafas', 'lentes', 'gamer', 'esports', 'profesional', 'eyewear', 'glasses', 'gaming']
  },
  {
    id: 'gg-16', category: 'gafas_gamer',
    title: 'Lentes con Filtro Anti-Fatiga y Tratamiento Anti-Huellas para Streaming',
    url: u('1524504388940-b1c1722653e1'), dimensions: '3500×2300 HD', badge: 'Streaming Anti-Glare',
    keywords: ['gafas', 'lentes', 'gamer', 'streaming', 'antireflejo', 'antihuellas', 'eyewear', 'glasses']
  },
  {
    id: 'gg-17', category: 'gafas_gamer',
    title: 'Gafas Gamer Marco Rectangular con Almohadillas de Silicona Suave',
    url: u('1519085360753-af0119f7cbe7'), dimensions: '3400×2200 HD', badge: 'Comfort Silicon',
    keywords: ['gafas', 'lentes', 'gamer', 'silicona', 'confort', 'rectangular', 'eyewear', 'glasses']
  },
  {
    id: 'gg-18', category: 'gafas_gamer',
    title: 'Gafas de Juego Inalámbricas con Luces LED RGB y Cristales de Alta Nitidez',
    url: u('1614741118887-7a4ee193a5fa'), dimensions: '4000×2600 4K', badge: 'Gamer RGB Studio',
    keywords: ['gafas', 'lentes', 'gamer', 'rgb', 'led', 'luces', 'gaming', 'eyewear', 'glasses']
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 📱 SMARTPHONES & CELULARES (15 Ítems)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'ph-01', category: 'smartphones',
    title: 'Samsung Galaxy S25 Ultra 5G Titanio — Render Oficial AMOLED 120Hz',
    url: u('1610945415295-d9bbf067e59c'), dimensions: '4000×3000 4K', badge: 'Galaxy S25 Ultra',
    keywords: ['samsung', 'galaxy', 's25', 's25 ultra', 's24', 'ultra', 'android', 'smartphone', 'celular', 'telefono']
  },
  {
    id: 'ph-02', category: 'smartphones',
    title: 'Samsung Galaxy S24 Ultra Negro Titanio — Vista Trasera Cámara 200MP',
    url: u('1546821608-00f8f7c65d8c'), dimensions: '4000×2600 4K', badge: 'Galaxy S24 Ultra',
    keywords: ['samsung', 'galaxy', 's24', 's25', 'ultra', 'android', 'smartphone', 'celular', 'telefono', 'camara']
  },
  {
    id: 'ph-03', category: 'smartphones',
    title: 'Apple iPhone 15 Pro Max Titanio Natural — Fotografía Frontal y Trasera de Estudio',
    url: u('1592750475338-74b7b21085ab'), dimensions: '4000×4000 4K', badge: 'iPhone 15 Pro Max',
    keywords: ['iphone', '15', 'pro', 'max', 'apple', 'titanio', 'smartphone', 'celular', 'telefono', 'movil']
  },
  {
    id: 'ph-04', category: 'smartphones',
    title: 'iPhone 14 Pro Max Deep Purple — Mockup Comercial 4K',
    url: u('1510557880182-3d4d3cba35a5'), dimensions: '4000×3000 4K', badge: 'iPhone 14 Pro',
    keywords: ['iphone', '14', 'pro', 'apple', 'morado', 'smartphone', 'celular', 'telefono']
  },
  {
    id: 'ph-05', category: 'smartphones',
    title: 'Apple iPhone 15 Pro Titanio Blanco — Fotografía de Producto Comercial',
    url: u('1695048133142-1a20484d2569'), dimensions: '3840×2160 HD', badge: 'iPhone 15 Pro',
    keywords: ['iphone', '15', 'pro', 'apple', 'blanco', 'titanio', 'smartphone', 'celular']
  },
  {
    id: 'ph-06', category: 'smartphones',
    title: 'Samsung Galaxy Z Fold y Flip — Pantalla Plegable Dinámica',
    url: u('1611186871348-b1ce696e52c9'), dimensions: '3500×2300 HD', badge: 'Galaxy Fold/Flip',
    keywords: ['samsung', 'galaxy', 'fold', 'flip', 'plegable', 'smartphone', 'celular', 'telefono']
  },
  {
    id: 'ph-07', category: 'smartphones',
    title: 'Samsung Galaxy Pantalla AMOLED Infinita — Fotografía Comercial',
    url: u('1574944985070-8f3ebacd26a4'), dimensions: '3600×2400 HD', badge: 'Samsung AMOLED',
    keywords: ['samsung', 'galaxy', 'amoled', 'pantalla', 'celular', 'telefono', 'smartphone', 'android']
  },
  {
    id: 'ph-08', category: 'smartphones',
    title: 'Xiaomi 14 Ultra Leica Master Photography — Render Frontal y Trasero',
    url: u('1596742578443-7c89a3b65c61'), dimensions: '3800×2500 4K', badge: 'Xiaomi 14 Ultra',
    keywords: ['xiaomi', '14', 'ultra', 'leica', 'smartphone', 'celular', 'telefono', 'android']
  },
  {
    id: 'ph-09', category: 'smartphones',
    title: 'Google Pixel 8 Pro Hazel — Cámara Computacional con IA',
    url: u('1546054454-aa36b68a9fd6'), dimensions: '3600×2400 HD', badge: 'Pixel 8 Pro',
    keywords: ['google', 'pixel', '8', 'pro', 'android', 'smartphone', 'celular', 'telefono']
  },
  {
    id: 'ph-10', category: 'smartphones',
    title: 'iPhone 13 Pro Sierra Blue — Fotografía Comercial de Alta Fidelidad',
    url: u('1565849904461-04a58ad377e0'), dimensions: '3500×3500 HD', badge: 'iPhone 13 Pro',
    keywords: ['iphone', '13', 'pro', 'apple', 'azul', 'smartphone', 'celular', 'telefono']
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 🔧 HERRAMIENTAS & DESTORNILLADORES (10 Ítems)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'tool-01', category: 'herramientas',
    title: 'Kit de Destornilladores de Precisión 128 en 1 para Celulares y Laptops',
    url: u('1581092160607-ee22621dd758'), dimensions: '4000×3000 4K', badge: 'Kit Precisión Pro',
    keywords: ['kit', 'destornilladores', 'destornillador', 'herramientas', 'precision', 'reparacion', 'desarmador', 'torx']
  },
  {
    id: 'tool-02', category: 'herramientas',
    title: 'Estuche de Reparación Técnica con Puntas Magnéticas para Electrónica',
    url: u('1581092580497-e0d23cbdf1dc'), dimensions: '3800×2500 4K', badge: 'Estuche Técnico',
    keywords: ['kit', 'destornilladores', 'estuche', 'herramientas', 'reparacion', 'tecnico', 'desarmador', 'electronica']
  },
  {
    id: 'tool-03', category: 'herramientas',
    title: 'Destornillador Eléctrico Inalámbrico de Precisión con Luces LED',
    url: u('1504148455328-c376907d081c'), dimensions: '3500×2400 HD', badge: 'Eléctrico Pro',
    keywords: ['destornilladores', 'destornillador', 'electrico', 'inalambrico', 'herramientas', 'desarmador']
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 💻 LAPTOPS, MACBOOKS & PORTÁTILES (10 Ítems)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'lap-01', category: 'laptops',
    title: 'Apple MacBook Pro 16" M3 Max Space Black — Fotografía de Estudio 4K',
    url: u('1517336714731-489689fd1ca8'), dimensions: '4000×2600 4K', badge: 'MacBook Pro 16" M3',
    keywords: ['macbook', 'pro', '16', 'm3', 'max', 'apple', 'laptop', 'portatil', 'computador']
  },
  {
    id: 'lap-02', category: 'laptops',
    title: 'Apple MacBook Pro 16 Pulgadas Silver — Mockup Oficial Frontal',
    url: u('1498050108023-c5249f4df085'), dimensions: '3840×2160 4K', badge: 'MacBook Pro Silver',
    keywords: ['macbook', 'pro', '16', 'apple', 'silver', 'laptop', 'portatil', 'computador']
  },
  {
    id: 'lap-03', category: 'laptops',
    title: 'Portátil Gamer Asus ROG Strix SCAR 18 RTX 4080 — Pantalla 240Hz',
    url: u('1603302576837-37561b2e2302'), dimensions: '3840×2160 4K', badge: 'ROG Strix RTX 4080',
    keywords: ['laptop', 'gamer', 'asus', 'rog', 'strix', 'rtx', 'portatil', 'gaming', 'computador']
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 🕹️ CONTROLES, MANDOS & CONSOLAS (10 Ítems)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'ctrl-01', category: 'controles',
    title: 'Control Inalámbrico Sony DualSense PS5 Original Blanco — Fotografía de Estudio',
    url: u('1606144042614-b2417e99c4e3'), dimensions: '4000×4000 4K', badge: 'DualSense 4K',
    keywords: ['control', 'mando', 'gamepad', 'ps5', 'dualsense', 'blanco', 'sony', 'gamer']
  },
  {
    id: 'ctrl-02', category: 'controles',
    title: 'Mando Transparente RGB Gamer Edición Neon Glow Pro con Motores Hápticos',
    url: u('1592840496694-26d035b52b48'), dimensions: '3840×2160 4K', badge: 'Transparente RGB',
    keywords: ['control', 'mando', 'transparente', 'rgb', 'gamepad', 'gamer', 'neon']
  },
  {
    id: 'con-01', category: 'consolas',
    title: 'Consola Sony PlayStation 5 Estándar con Lector Blu-Ray y Mando DualSense',
    url: u('1606813907291-d86efa9b94db'), dimensions: '4000×4000 4K', badge: 'PS5 Oficial 4K',
    keywords: ['consola', 'playstation', 'ps5', 'sony', 'videojuegos', 'blanco']
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ⌨️ TECLADOS, MOUSE & AUDIO (10 Ítems)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'per-01', category: 'perifericos',
    title: 'Teclado Mecánico Custom 75% Switch Azul con Iluminación RGB',
    url: u('1587829741301-dc798b83add3'), dimensions: '3800×2500 4K', badge: 'Teclado Mecánico RGB',
    keywords: ['teclado', 'mecanico', 'rgb', 'switch', 'custom', 'gamer', 'inalambrico']
  },
  {
    id: 'per-02', category: 'perifericos',
    title: 'Teclado Mecánico Blanco Minimalista Retroiluminado Bluetooth',
    url: u('1595225476474-87563907a212'), dimensions: '3500×2300 HD', badge: 'Teclado Blanco 4K',
    keywords: ['teclado', 'mecanico', 'blanco', 'minimalista', 'gamer', 'inalambrico', 'samsung']
  },
  {
    id: 'aud-01', category: 'audio',
    title: 'Audífonos Diadema Gamer RGB Hi-Res con Micrófono de Cancelación',
    url: u('1505740420928-5e560c06d30e'), dimensions: '4000×3000 4K', badge: 'Diadema RGB 4K',
    keywords: ['audifonos', 'diadema', 'headset', 'gamer', 'auriculares', 'rgb', 'microfono']
  },
  {
    id: 'mon-01', category: 'monitores',
    title: 'Monitor Curvo Gamer UltraWide 34" 165Hz 1ms IPS',
    url: u('1527443224154-c4a3942d3acf'), dimensions: '4000×2600 4K', badge: 'Monitor 165Hz UltraWide',
    keywords: ['monitor', 'curvo', 'pantalla', 'ultrawide', '144hz', '165hz', 'gamer']
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// DETECCIÓN SEMÁNTICA UNIVERSAL POR FAMILIAS DE PRODUCTOS
// ─────────────────────────────────────────────────────────────────────────────
function detectSemanticCluster(query) {
  const q = query.toLowerCase();

  // 1. Software, Licencias, Office, Windows, Antivirus
  if (/\b(licencia|licencias|software|office|windows|microsoft|antivirus|kaspersky|norton|mcafee|autocad|adobe|photoshop|canva|key|esd|activacion|serial|product key)\b/i.test(q)) {
    if (/\b(office|365|word|excel|powerpoint)\b/i.test(q)) return 'software_office';
    if (/\b(windows|so|operating system|win 10|win 11|server)\b/i.test(q)) return 'software_windows';
    if (/\b(antivirus|seguridad|security|kaspersky|vpn)\b/i.test(q)) return 'software_security';
    return 'software';
  }

  // 2. Tarjetas de Regalo, Gift Cards, Vouchers, Bonos
  if (/\b(tarjeta regalo|tarjetas regalo|gift card|gift cards|giftcard|giftcards|voucher|vouchers|bono|bonos|cupon|cupones|saldo|recarga|wallet|psn card|steam card|xbox pass)\b/i.test(q)) {
    return 'giftcards';
  }

  // 3. Gafas Gamer, Lentes, Blue Light, Eyewear (REQUIERE palabra de lente/óptica, NO "gamer" solo)
  if (/\b(gafa|gafas|lente|lentes|anteojo|anteojos|espejuelo|espejuelos|glasses|eyewear|blue light|filtro azul|luz azul|horus|gunnar|vr|realidad virtual)\b/i.test(q)) {
    return 'gafas_gamer';
  }

  // 4. Smartphones & Celulares
  if (/\b(samsung|galaxy|s25|s24|s23|ultra|iphone|apple|celular|celulares|telefono|telefonos|smartphone|smartphones|movil|moviles|xiaomi|pixel|redmi)\b/i.test(q)) {
    return 'smartphones';
  }

  // 5. Herramientas & Destornilladores
  if (/\b(destornillador|destornilladores|desarmador|desarmadores|herramienta|herramientas|kit|precision|torx|phillips)\b/i.test(q)) {
    return 'herramientas';
  }

  // 6. Controles & Mandos
  if (/\b(mando|mandos|control|controles|gamepad|gamepads|joystick|joysticks|dualsense|dualshock|transparente)\b/i.test(q)) {
    return 'controles';
  }

  // 7. Laptops & Computadores
  if (/\b(laptop|laptops|portatil|portatiles|macbook|notebook|computador|computadores|computadora|pc|thinkpad|rog|legion)\b/i.test(q)) {
    return 'laptops';
  }

  // 8. Consolas
  if (/\b(consola|consolas|playstation|ps5|ps4|xbox|nintendo|switch|videojuegos)\b/i.test(q)) {
    return 'consolas';
  }

  // 9. Teclados & Periféricos
  if (/\b(teclado|teclados|mouse|raton|ratones|periferico|perifericos|keycap|deskpad)\b/i.test(q)) {
    return 'perifericos';
  }

  // 10. Audio & Diademas
  if (/\b(audifono|audifonos|diadema|diademas|auricular|auriculares|headset|airpods|tws|speaker|bocina)\b/i.test(q)) {
    return 'audio';
  }

  // 11. Monitores
  if (/\b(monitor|monitores|pantalla|pantallas|ultrawide|curvo|144hz|165hz)\b/i.test(q)) {
    return 'monitores';
  }

  return 'generic';
}

/**
 * Generador Universal de Fotografías Reales de Producto:
 * Produce un lote exacto de 15 a 20 opciones fotográficas de alta resolución. Cero plantillas planas o mockups morados.
 */
function generateUniversalBatch(query, cluster, limit = 20) {
  const count = Math.min(Math.max(Number(limit) || 20, 15), 30);
  const items = [];
  const cleanQ = query.trim();

  for (let i = 0; i < count; i++) {
    const photoId = REAL_PHOTO_IDS[(i + Math.abs(cleanQ.length * 7)) % REAL_PHOTO_IDS.length];
    const photoUrl = u(photoId);

    items.push({
      id: `real-stock-${i}`,
      title: `${cleanQ} — Fotografía Real #${i + 1}`,
      url: photoUrl,
      thumbUrl: photoUrl,
      category: cluster,
      dimensions: '1000×1000 4K',
      badge: 'Stock 4K',
      source: 'Fotografía Real de Producto',
      keywords: cleanQ.toLowerCase().split(/\s+/),
    });
  }

  return items;
}

// ─────────────────────────────────────────────────────────────────────────────
// MOTOR DE BÚSQUEDA UNIVERSAL INTELIGENTE
// ─────────────────────────────────────────────────────────────────────────────
export function searchMassiveCatalog(query = '', limit = 20) {
  const TARGET_COUNT = Math.min(Math.max(Number(limit) || 20, 15), 30);

  if (!query || typeof query !== 'string' || !query.trim()) {
    return MASSIVE_STOCK_CATALOG.slice(0, TARGET_COUNT);
  }

  const cleanQuery = query.toLowerCase().replace(/["""']/g, ' ').trim();
  const tokens = cleanQuery.split(/\s+/).filter((t) => t.length >= 2);
  const cluster = detectSemanticCluster(cleanQuery);

  // ── CASO A: Software, Licencias, Office, Windows, Antivirus ───────────────
  if (cluster.startsWith('software')) {
    const isWindowsQuery = cleanQuery.includes('windows') || cleanQuery.includes('server') || cleanQuery.includes('sistema');
    const isOfficeQuery = cleanQuery.includes('office') || cleanQuery.includes('365') || cleanQuery.includes('word') || cleanQuery.includes('excel');
    const isSecQuery = cleanQuery.includes('antivirus') || cleanQuery.includes('kaspersky') || cleanQuery.includes('seguridad');

    const catalogSoftware = MASSIVE_STOCK_CATALOG
      .filter((item) => item.category.startsWith('software') || item.category === 'software')
      .sort((a, b) => {
        let aScore = 0;
        let bScore = 0;

        if (isWindowsQuery) {
          if (a.category === 'software_windows') aScore += 60;
          if (b.category === 'software_windows') bScore += 60;
        } else if (isOfficeQuery) {
          if (a.category === 'software_office') aScore += 60;
          if (b.category === 'software_office') bScore += 60;
        } else if (isSecQuery) {
          if (a.category === 'software_security') aScore += 60;
          if (b.category === 'software_security') bScore += 60;
        }

        tokens.forEach((tok) => {
          if (a.title.toLowerCase().includes(tok)) aScore += 10;
          if (b.title.toLowerCase().includes(tok)) bScore += 10;
        });

        return bScore - aScore;
      });

    const dynamicSoftware = generateUniversalBatch(query, cluster, TARGET_COUNT);
    const combined = [...catalogSoftware, ...dynamicSoftware];
    return combined.slice(0, TARGET_COUNT);
  }

  // ── CASO B: Tarjetas de Regalo, Gift Cards, Bonos ─────────────────────────
  if (cluster === 'giftcards') {
    const catalogCards = MASSIVE_STOCK_CATALOG.filter((item) => item.category === 'giftcards');
    const dynamicCards = generateUniversalBatch(query, cluster, TARGET_COUNT);
    const combined = [...catalogCards, ...dynamicCards];
    return combined.slice(0, TARGET_COUNT);
  }

  // ── CASO C: Gafas Gamer & Gaming Eyewear ─────────────────────────────────
  if (cluster === 'gafas_gamer') {
    const glasses = MASSIVE_STOCK_CATALOG.filter((item) => item.category === 'gafas_gamer');
    return glasses.slice(0, TARGET_COUNT);
  }

  // ── CASO D: Hardware Específico por Categoría Exacta ─────────────────────
  if (cluster !== 'generic') {
    const catItems = MASSIVE_STOCK_CATALOG.filter((item) => item.category === cluster);
    if (catItems.length >= TARGET_COUNT) {
      return catItems.slice(0, TARGET_COUNT);
    }
    // Si la categoría tiene menos ítems que TARGET_COUNT, completar con variaciones semánticas del mismo término
    const extraMockups = generateUniversalBatch(query, cluster, TARGET_COUNT - catItems.length);
    return [...catItems, ...extraMockups].slice(0, TARGET_COUNT);
  }

  // ── CASO E: Término Genérico o No Precargado (Búsqueda Universal) ─────────
  const MODIFIER_TOKENS = new Set([
    'gamer', 'gaming', 'pro', 'ultra', 'rgb', 'edition', 'edicion',
    'max', 'plus', 'mini', 'hd', '4k', 'wireless', 'inalambrico',
    'inalambrica', 'tech', 'smart', 'super', 'nuevo', 'nueva',
    'para', 'del', 'los', 'las', 'con', 'sin', 'tipo'
  ]);

  const substantiveTokens = tokens.filter((t) => !MODIFIER_TOKENS.has(t));

  const scored = MASSIVE_STOCK_CATALOG.map((item) => {
    let score = 0;
    const titleLower = item.title.toLowerCase();
    const kws = (item.keywords || []).map((k) => k.toLowerCase());

    // Si hay tokens sustantivos (ej. "campera", "silla"), exigir que al menos uno coincida
    if (substantiveTokens.length > 0) {
      const matchesSubstantive = substantiveTokens.some(
        (st) => titleLower.includes(st) || kws.some((k) => k.includes(st))
      );
      if (!matchesSubstantive) {
        return { item, score: 0 };
      }
    }

    if (titleLower.includes(cleanQuery)) score += 60;
    tokens.forEach((tok) => {
      if (titleLower.includes(tok)) score += 15;
      if (kws.some((k) => k === tok)) score += 20;
      else if (kws.some((k) => k.includes(tok))) score += 8;
    });

    return { item, score };
  });

  const matched = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);

  if (matched.length >= 10) {
    const chosen = matched.map((m) => m.item);
    if (chosen.length >= TARGET_COUNT) {
      return chosen.slice(0, TARGET_COUNT);
    }
    const extra = generateUniversalBatch(query, 'generic', TARGET_COUNT - chosen.length);
    return [...chosen, ...extra].slice(0, TARGET_COUNT);
  }

  // Si no hay suficientes coincidencias en hardware, generar un lote completo
  // adaptado exactamente al nombre del producto escrito por el usuario
  const dynamicGeneral = generateUniversalBatch(query, 'generic', TARGET_COUNT);
  return dynamicGeneral.slice(0, TARGET_COUNT);
}
