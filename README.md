# Mercado Tecnológico Super Wow 🚀
### Plataforma de Comercio Electrónico Multi-Categoría de Alta Gama

Plataforma de alta calidad corporativa construida con **React 19**, **Tailwind CSS v4**, **Vite**, **Vercel Serverless Functions** y **Supabase**, inspirada en los activos visuales y micro-interacciones de la referencia **Zafara**, adaptada a una **estética clara, luminosa y prémium** (fondos blancos, grises perla, acentos metalizados, cero modo oscuro).

---

## 💎 Novedades de la Versión Corporativa

### 1. Seguridad Estricta y Pasarela de Correo Real (Resend API)
- **Cero Indicadores Públicos**: Se eliminó todo botón visible de "Modo Editor" de la vista pública. Los clientes disfrutan de una experiencia 100% limpia de tienda de lujo.
- **Vías de Acceso Privadas y Secretas**:
  1. **Atajo de Teclado**: Presiona `Ctrl + Alt + Shift + A` (o `Cmd + Alt + Shift + A` en Mac).
  2. **Ruta Secreta**: Agrega `#admin` o `/admin` en la barra de direcciones.
  3. **Disparador Discreto**: Candado de seguridad miniatura al pie de página (footer) o triple clic sobre el logo principal.
- **Credenciales Maestras**:
  - **Correo**: `jhonkavasquez@gmail.com`
  - **Contraseña**: `Soporte2026*`
- **Pasarela de Envío de Token OTP Real con Expiración (5 Minutos)**:
  - Implementada mediante la Vercel Serverless Function `api/send-otp.js` y `src/services/emailService.js`.
  - Envía directamente a `jhonkavasquez@gmail.com` un código OTP de 6 dígitos con diseño HTML corporativo prémium.
  - Temporizador activo de 5 minutos (300 segundos). Al vencer, el token se invalida automáticamente.

#### ⚙️ Configuración de Correo en Vercel
En el panel de tu proyecto en **Vercel** (`Settings > Environment Variables`), añade:
- `RESEND_API_KEY`: Tu clave de API de Resend (obtenida gratis en [resend.com](https://resend.com), ej. `re_123456...`).
- `RESEND_FROM_EMAIL`: `Mercado Tecnológico Super Wow <onboarding@resend.dev>` (o tu dominio verificado).

---

### 2. Constructor Visual "In-Situ" (Estilo Wix / Elementor Pro)
- **Cero Paneles Laterales Invasivos**: La edición se realiza directamente sobre los elementos de la tienda.
- **Edición Inline al Vuelo**: Haz clic sobre cualquier título, precio actual, precio de oferta, descripción o etiqueta para modificar su valor al instante.
- **Eventos Desacoplados**: En modo editor, el clic sobre un texto **nunca** abre el modal de detalle. El modal solo se abre con el botón explícito **"Ver Detalle"** o con el icono de zoom/lupa de la tarjeta.
- **Selector de Imagen Rápido**: Al hacer clic sobre cualquier foto en modo admin, se despliega un popover interactivo para pegar una URL directa o seleccionar un activo de la biblioteca de Zafara.
- **Barra Flotante Inferior In-Situ**:
  - Muestra el estado del administrador (`jhonkavasquez@gmail.com`).
  - Contador de modificaciones pendientes.
  - Botón **"+ Nuevo Producto"** para agregar ítems de inmediato al catálogo.
  - Botón **"Guardar en Supabase"** que sincroniza las alteraciones en Supabase y `localStorage`.
  - Botón para descartar cambios y botón de cierre de sesión seguro.

#### 🗄️ Migraciones necesarias para persistencia total
La tabla `products` de producción debe alinearse con el modelo de la app (IDs de texto, categorías por slug y columnas visuales). Ejecuta en orden en el SQL Editor de Supabase:
1. `database/04_product_visual_fields.sql` — marca, etiqueta, especificaciones, rating y reseñas.
2. `database/05_fix_products_schema_and_rls.sql` — convierte `id`/`category_id` a TEXT y habilita las políticas RLS de lectura/escritura.
3. `database/06_store_users_rbac.sql` — tabla `store_users`, roles y políticas RLS de colaboradores.
4. `database/07_orders_payment_gateway.sql` — campos de Wompi/PayPal/billetera y políticas de comprobantes en `orders`.

Sin estas migraciones, la app conserva los cambios visuales en `localStorage` y muestra un aviso al guardar, pero Supabase rechaza la escritura.

---

### 3. Carrito de Compras Funcional y Experiencia E-commerce
- **Carrito Deslizante Lateral (Drawer)**:
  - Botón con contador en tiempo real en la barra de navegación.
  - Control de cantidades (`+` / `-`) y eliminación de productos.
  - Barra de progreso de envío gratis ("Te faltan $XX.XXX para envío gratis nacional").
  - Botón **"Finalizar Pedido por WhatsApp"**: genera automáticamente un pedido estructurado y consolidado con subtotales, costo de envío y lista detallada hacia el chat de WhatsApp.
- **Lightbox / Zoom Modal Centralizado (Estilo MercadoLibre)**:
  - Cuadro flotante central mediano con lupa interactiva (zoom 2.2x), nombre, precio y cierre rápido al hacer clic afuera o con la tecla Escape.

---

### 4. Efectos Inmersivos y Contraste Visual Mejorado
- **Fondo Inmersivo con Ondas de Zafiro y Platino**: En [BackgroundCanvas.jsx](file:///d:/ARMADO%20DE%20SUPER/TIENDA%20VIRTUAL/src/components/BackgroundCanvas.jsx), los trazos y partículas han sido optimizados con tonos zafiro profundo (`#0A4ABF`), azul eléctrico (`#0A6CFF`) y platino metálico (`#64748B`, `#94A3B8`), logrando una visibilidad elegante, nítida y fluida sobre los fondos claros y grises perla.

---

### 5. Medios de Pago Seguros y Confianza
- **Sección de Pasarelas y Métodos de Pago**:
  - Tarjetas de Crédito / Débito (Visa, Mastercard, American Express).
  - PSE y transferencias bancarias directas.
  - Billeteras Móviles (Nequi, Daviplata, Bancolombia).
  - Pago Contra Entrega Nacional (Pagas en efectivo al recibir en tu domicilio).
  - Certificación SSL de 256 bits y sellos de garantía oficial de 12 meses.

---

### 6. Control de Colaboradores y RBAC
- **Administrador Principal**: conserva el acceso total y es el único que ve la pestaña **Control de Colaboradores**.
- **Roles**: Administrador colaborador, Editor y Operador POS.
- **Permisos granulares**:
  - Editar página (editor Wix/Elementor).
  - Gestionar productos y catálogo.
  - Realizar ventas POS.
  - Gestionar pedidos y pagos QR.
- **Crear / Editar / Eliminar**:
  - El alta crea una cuenta en Supabase Auth (`email_confirm: true`) + perfil en `store_users`.
  - La edición permite cambiar correo, contraseña temporal, rol, permisos y estado activo.
  - La eliminación es un **borrado duro** del perfil y de la cuenta de Auth: revoca el acceso de inmediato.
- **Carga de interfaz por permisos**: el editor visual, la caja POS y los módulos de pedidos/inventario se muestran únicamente según el perfil autenticado.
- **Modo local seguro**: si no existe `SUPABASE_SERVICE_ROLE_KEY`, el panel guarda colaboradores con hash PBKDF2 en `localStorage` para desarrollo y muestra un aviso visible.

#### ⚙️ Variables de entorno RBAC en Vercel
- `SUPABASE_SERVICE_ROLE_KEY` (obligatoria para crear/editar credenciales en Supabase Auth).
- `PRIMARY_ADMIN_EMAIL` y `PRIMARY_ADMIN_PASSWORD` (administrador principal).
- `VITE_PRIMARY_ADMIN_EMAIL` (correo mostrado por el cliente).

---

### 7. Pasarela de Pagos Multopción y Checkout Premium
- **Resumen de compra**: tarjeta con tipografía grande, total en verde esmeralda y desglose de subtotal/envío.
- **Wompi / Llave Breve**:
  - Tarjeta de método con identidad violeta.
  - Modal interactivo con llave breve, datos bancarios, comprobante (WebP optimizado), N° de operación opcional.
  - Botones **“Enviar comprobante”** (ámbar/dorado) y **“Cancelar”**.
  - El pedido queda en `Pendiente` para validación administrativa.
- **PayPal**:
  - Tarjeta con identidad visual azul y botón degradado corporativo.
  - Si existe `paypalPaymentLink`, el cliente puede abrir el checkout; si no, el pedido queda registrado para que tesorería envíe el enlace.
- **Mi Billetera**:
  - Saldo por correo del comprador, recarga inmediata y bloqueo de pago si el saldo es insuficiente.
  - Los pedidos pagados con saldo quedan en estado `Aprobado`.
- **Administración**:
  - El panel de pedidos muestra comprobante, N° de operación y botones **Aprobar pago** / **Rechazar**.
  - Los campos se sincronizan con Supabase (`orders`) y se conserva una copia local mientras la migración 07 no esté aplicada.
- **Migración requerida**: `database/07_orders_payment_gateway.sql` (columnas `payment_provider`, `payment_operation_number`, `payment_reference`, `payment_payload`, `validated_at` y RLS).

---

## 🛠️ Estructura de Componentes

```
TIENDA VIRTUAL/
├── api/
│   ├── admin-users.js                  # CRUD de colaboradores + Supabase Auth
│   └── send-otp.js                     # Vercel Serverless Function (Resend API)
├── src/
│   ├── components/
│   │   ├── AdminAuthModal.jsx          # Login 2FA primario / colaboradores RBAC
│   │   ├── AdminUsersPanel.jsx         # Control de Colaboradores (crear/editar/eliminar)
│   │   ├── BackgroundCanvas.jsx        # Ondas sinusoidales zafiro/platino al scroll
│   │   ├── CartDrawer.jsx              # Carrito deslizante con checkout a WhatsApp
│   │   ├── CategoryPills.jsx           # Selector de categorías con contador
│   │   ├── EditableText.jsx            # Componente de edición directa inline
│   │   ├── Footer.jsx                  # Pie de página y marcas oficiales
│   │   ├── HeroBanner.jsx              # Hero con video luminoso y edición in-situ
│   │   ├── ImageLightbox.jsx           # Visor modal flotante centrado
│   │   ├── ImagePickerModal.jsx        # Selector rápido de fotos locales/URL
│   │   ├── InPlaceEditorToolbar.jsx    # Barra flotante inferior de edición
│   │   ├── Navbar.jsx                  # Barra pública limpia con carrito
│   │   ├── PaymentMethodsSection.jsx   # Sección de medios de pago seguros
│   │   ├── ProductCard.jsx             # Tarjeta con 3D tilt y edición in-situ
│   │   ├── ProductModal.jsx            # Modal de ficha técnica y compra
│   │   ├── ScrollToTop.jsx             # Botón flotante volver arriba
│   │   └── WhatsAppRail.jsx            # Riel magnético deslizante de WhatsApp
│   ├── services/
│   │   ├── adminAuthService.js         # Sesión RBAC, Supabase Auth y fallback PBKDF2
│   │   ├── emailService.js             # Envío y validación estricta de OTP
│   │   ├── walletService.js            # Saldo y recargas de Mi Billetera
│   │   └── storeService.js             # Persistencia Supabase + LocalStorage
│   ├── config/rbac.js                  # Roles, permisos y defaults
│   └── App.jsx                         # Orquestador general
```
