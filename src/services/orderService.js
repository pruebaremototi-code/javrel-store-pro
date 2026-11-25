import { supabase } from '../supabaseClient.js';

const LOCAL_ORDERS_KEY = 'super_wow_orders_v1';
const ARCHIVED_ORDERS_KEY = 'javrelstore_archived_orders_v1';
const PURGED_ORDERS_KEY = 'javrelstore_purged_orders_v1';

const buildOrderPayload = (order, extended = true) => {
  const payload = {
    reference_code: order.reference_code,
    customer_name: order.customer_name,
    customer_email: order.customer_email,
    customer_phone: order.customer_phone,
    items_json: order.items_json,
    total_amount: order.total_amount,
    payment_method: order.payment_method,
    payment_status: order.payment_status,
    payment_proof_url: order.payment_proof_url,
    notes: order.notes,
    created_at: order.created_at,
    updated_at: order.updated_at,
  };

  if (extended) {
    payload.payment_operation_number = order.payment_operation_number || null;
    payload.payment_provider = order.payment_provider || null;
    payload.payment_reference = order.payment_reference || null;
    payload.payment_payload = order.payment_payload || {};
    payload.customer_document = order.customer_document || null;
    payload.customer_department = order.customer_department || null;
    payload.customer_city = order.customer_city || null;
    payload.customer_address = order.customer_address || null;
    payload.subtotal_amount = Number(order.subtotal_amount) || 0;
    payload.shipping_cost = Number(order.shipping_cost) || 0;
    payload.discount_amount = Number(order.discount_amount) || 0;
    payload.coupon_code = order.coupon_code || null;
  }

  return payload;
};

export const orderService = {
  // Generar código de referencia único para el pedido (unificado JVR-...)
  generateReference() {
    const timePart = Date.now().toString().slice(-6);
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    return `JVR-${timePart}-${randomDigits}`;
  },

  // Obtener registro de órdenes purgadas / eliminadas de raíz (Tombstones)
  getPurgedOrders() {
    try {
      const data = localStorage.getItem(PURGED_ORDERS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  // Guardar registro de órdenes purgadas
  savePurgedOrders(purgedList) {
    try {
      localStorage.setItem(PURGED_ORDERS_KEY, JSON.stringify(purgedList));
    } catch (e) {
      console.warn('Error al guardar registro de purga:', e);
    }
  },

  // Registrar orden en la lista de purga definitiva
  registerPurgedOrder(referenceCode, id = null) {
    const list = this.getPurgedOrders();
    const set = new Set(list);
    if (referenceCode) set.add(String(referenceCode).trim());
    if (id) set.add(String(id).trim());
    const updated = Array.from(set);
    this.savePurgedOrders(updated);
    return updated;
  },

  // Obtener pedidos locales como respaldo
  getLocalOrders() {
    try {
      const data = localStorage.getItem(LOCAL_ORDERS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.warn('Error al leer pedidos locales:', e);
      return [];
    }
  },

  // Guardar pedidos localmente
  saveLocalOrders(orders) {
    try {
      localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(orders));
    } catch (e) {
      console.warn('Error al persistir pedidos locales:', e);
    }
  },

  // Obtener pedidos archivados
  getArchivedOrders() {
    try {
      const data = localStorage.getItem(ARCHIVED_ORDERS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  // Guardar pedidos archivados
  saveArchivedOrders(orders) {
    try {
      localStorage.setItem(ARCHIVED_ORDERS_KEY, JSON.stringify(orders));
    } catch (e) {
      console.warn('Error guardando pedidos archivados:', e);
    }
  },

  // Crear una nueva orden
  async createOrder({
    referenceCode: providedReferenceCode = '',
    customerName,
    customerEmail,
    customerPhone,
    customerDocument = '',
    customerDepartment = '',
    customerCity = '',
    customerAddress = '',
    items,
    subtotalAmount = 0,
    shippingCost = 0,
    discountAmount = 0,
    couponCode = '',
    totalAmount,
    paymentMethod,
    paymentProofUrl = null,
    paymentOperationNumber = '',
    paymentProvider = '',
    paymentReference = '',
    paymentPayload = {},
    notes = '',
    initialStatus = 'pendiente_verificacion',
  }) {
    const referenceCode = String(providedReferenceCode || '').trim() || this.generateReference();
    const newOrder = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ord-${Date.now()}`,
      reference_code: referenceCode,
      customer_name: customerName || 'Cliente Anónimo',
      customer_email: customerEmail || '',
      customer_phone: customerPhone || '',
      customer_document: customerDocument || null,
      customer_department: customerDepartment || null,
      customer_city: customerCity || null,
      customer_address: customerAddress || null,
      items_json: items || [],
      subtotal_amount: Number(subtotalAmount) || 0,
      shipping_cost: Number(shippingCost) || 0,
      discount_amount: Number(discountAmount) || 0,
      coupon_code: couponCode || null,
      total_amount: Number(totalAmount) || 0,
      payment_method: paymentMethod || 'QR_MANUAL',
      payment_status: initialStatus, // 'pendiente_verificacion' | 'pagado' | 'Pendiente' | 'Aprobado' | 'Rechazado'
      payment_proof_url: paymentProofUrl,
      payment_operation_number: paymentOperationNumber || null,
      payment_provider: paymentProvider || null,
      payment_reference: paymentReference || null,
      payment_payload: paymentPayload || {},
      notes: notes,
      is_archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 1. Persistir de forma síncrona en LocalStorage
    const localOrders = this.getLocalOrders();
    localOrders.unshift(newOrder);
    this.saveLocalOrders(localOrders);

    // 2. Guardar en Supabase (con reintento si la migración 07 aún no se aplicó)
    try {
      let { data, error } = await supabase
        .from('orders')
        .insert([buildOrderPayload(newOrder, true)])
        .select();

      if (error) {
        console.warn('Supabase orders insert warning (esquema extendido):', error.message);
        const fallback = await supabase
          .from('orders')
          .insert([buildOrderPayload(newOrder, false)])
          .select();
        data = fallback.data;
        error = fallback.error;
        if (error) {
          console.warn('Supabase orders insert warning (esquema base):', error.message);
        }
      }

      if (!error && data && data[0]) {
        newOrder.id = data[0].id;
      }
    } catch (err) {
      console.warn('Supabase no disponible de momento, orden retenida localmente:', err);
    }

    return { success: true, order: newOrder };
  },

  // Obtener todas las órdenes activas (con filtro estricto anti-fantasmas)
  async getOrders(includeArchived = false) {
    const purgedList = this.getPurgedOrders();
    const purgedSet = new Set(purgedList.map((p) => String(p).trim().toLowerCase()));

    let supabaseOrders = [];

    try {
      const query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (!error && Array.isArray(data)) {
        supabaseOrders = data
          .filter((d) => {
            const refStr = String(d.reference_code || '').trim().toLowerCase();
            const idStr = String(d.id || '').trim().toLowerCase();
            const notesStr = String(d.notes || '');

            // Descartar órdenes purgadas o marcadas como eliminadas de raíz
            if (purgedSet.has(refStr) || purgedSet.has(idStr)) return false;
            if (notesStr.includes('[DELETED_PERMANENTLY]')) return false;
            return true;
          })
          .map((d) => ({
            ...d,
            items_json: typeof d.items_json === 'string' ? JSON.parse(d.items_json) : (d.items_json || []),
          }));
      }
    } catch (err) {
      console.warn('Fallo al consultar órdenes de Supabase, usando local:', err);
    }

    const localOrders = this.getLocalOrders().filter((o) => {
      const refStr = String(o.reference_code || '').trim().toLowerCase();
      const idStr = String(o.id || '').trim().toLowerCase();
      const notesStr = String(o.notes || '');
      if (purgedSet.has(refStr) || purgedSet.has(idStr)) return false;
      if (notesStr.includes('[DELETED_PERMANENTLY]')) return false;
      return true;
    });

    const archivedOrders = this.getArchivedOrders();
    const archivedRefs = new Set(archivedOrders.map((a) => a.reference_code));

    // Mezclar evitando duplicados por reference_code. La nube manda en el
    // estado del pago, pero conservamos los campos extendidos locales
    // (proveedor, comprobante, N° de operación) si la migración 07 aún no está.
    const localByRef = new Map(localOrders.map((o) => [o.reference_code, o]));
    const map = new Map();

    supabaseOrders.forEach((o) => {
      if (!archivedRefs.has(o.reference_code) || includeArchived) {
        const local = localByRef.get(o.reference_code) || {};
        map.set(o.reference_code, {
          ...local,
          ...o,
          payment_proof_url: o.payment_proof_url || local.payment_proof_url || null,
          payment_provider: o.payment_provider || local.payment_provider || null,
          payment_operation_number:
            o.payment_operation_number || local.payment_operation_number || null,
          payment_reference: o.payment_reference || local.payment_reference || null,
          payment_payload: o.payment_payload || local.payment_payload || {},
          items_json: o.items_json || local.items_json || [],
        });
      }
    });

    localOrders.forEach((o) => {
      if (!map.has(o.reference_code) && (!archivedRefs.has(o.reference_code) || includeArchived)) {
        map.set(o.reference_code, o);
      }
    });

    const finalOrders = Array.from(map.values());
    // Mantener sincronizado el almacenamiento local saneado
    this.saveLocalOrders(finalOrders);

    return finalOrders;
  },

  // Actualizar estado de pago de una orden ('Pendiente', 'Aprobado', 'Rechazado')
  async updateOrderStatus(orderReference, newStatus) {
    const localOrders = this.getLocalOrders();
    const updatedLocal = localOrders.map((ord) => {
      if (ord.reference_code === orderReference || ord.id === orderReference) {
        return { ...ord, payment_status: newStatus, updated_at: new Date().toISOString() };
      }
      return ord;
    });
    this.saveLocalOrders(updatedLocal);

    try {
      await supabase
        .from('orders')
        .update({
          payment_status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('reference_code', orderReference);
    } catch (err) {
      console.warn('Error al actualizar orden en Supabase:', err);
    }

    return { success: true, newStatus };
  },

  // Archivar un Pedido
  async archiveOrder(order) {
    if (!order) return { success: false };

    // 1. Quitar de pedidos activos
    const localOrders = this.getLocalOrders().filter((o) => o.reference_code !== order.reference_code);
    this.saveLocalOrders(localOrders);

    // 2. Agregar a archivados
    const archived = this.getArchivedOrders();
    const exists = archived.some((o) => o.reference_code === order.reference_code);
    if (!exists) {
      archived.unshift({ ...order, is_archived: true, archived_at: new Date().toISOString() });
      this.saveArchivedOrders(archived);
    }

    // 3. Actualizar en Supabase
    try {
      await supabase
        .from('orders')
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq('reference_code', order.reference_code);
    } catch {}

    return { success: true };
  },

  // Desarchivar un Pedido
  async unarchiveOrder(order) {
    if (!order) return { success: false };

    // Quitar de archivados
    const archived = this.getArchivedOrders().filter((o) => o.reference_code !== order.reference_code);
    this.saveArchivedOrders(archived);

    // Devolver a activos
    const localOrders = this.getLocalOrders();
    localOrders.unshift({ ...order, is_archived: false });
    this.saveLocalOrders(localOrders);

    try {
      await supabase
        .from('orders')
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq('reference_code', order.reference_code);
    } catch {}

    return { success: true };
  },

  // Eliminar Pedido de Raíz (Permanent Hard-Delete en Supabase y Local)
  async deleteOrderPermanently(orderReference, orderId = null) {
    const refCode = String(orderReference || '').trim();
    const id = String(orderId || '').trim();

    // 1. REGISTRAR INMEDIATAMENTE EN LISTA DE PURGA (Tombstones anti-revival)
    this.registerPurgedOrder(refCode, id);

    // 2. BORRADO DURO ESTRICTO EN SUPABASE
    try {
      // Limpieza en tablas hijas en cascada preventiva
      if (id) {
        try { await supabase.from('order_items').delete().eq('order_id', id); } catch {}
      }
      if (refCode) {
        try { await supabase.from('order_items').delete().eq('reference_code', refCode); } catch {}
      }

      // Borrado duro en la tabla principal 'orders'
      if (id) {
        await supabase.from('orders').delete().eq('id', id);
      }
      if (refCode) {
        await supabase.from('orders').delete().eq('reference_code', refCode);
      }

      // Marca defensiva en Supabase (en caso de que RLS aún no tenga política DELETE)
      if (refCode) {
        await supabase
          .from('orders')
          .update({
            notes: '[DELETED_PERMANENTLY]',
            updated_at: new Date().toISOString(),
          })
          .eq('reference_code', refCode);
      }
      if (id) {
        await supabase
          .from('orders')
          .update({
            notes: '[DELETED_PERMANENTLY]',
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);
      }
    } catch (err) {
      console.warn('Excepción durante borrado en Supabase:', err);
    }

    // 3. LIMPIEZA EXHAUSTIVA DE CACHÉ LOCAL
    const localOrders = this.getLocalOrders().filter((o) => {
      const oRef = String(o.reference_code || '').trim();
      const oId = String(o.id || '').trim();
      return oRef !== refCode && oId !== refCode && (id ? oId !== id && oRef !== id : true);
    });
    this.saveLocalOrders(localOrders);

    const archived = this.getArchivedOrders().filter((o) => {
      const oRef = String(o.reference_code || '').trim();
      const oId = String(o.id || '').trim();
      return oRef !== refCode && oId !== refCode && (id ? oId !== id && oRef !== id : true);
    });
    this.saveArchivedOrders(archived);

    return { success: true };
  },

  // Purgar y limpiar todas las órdenes fantasmas antiguas de golpe
  async purgeGhostOrders(referencesList = []) {
    for (const ref of referencesList) {
      await this.deleteOrderPermanently(ref);
    }
    return { success: true, count: referencesList.length };
  },

  // Barrido de Registros Fantasma en Supabase (Orphan Sweep al inicializar el módulo).
  // Ejecuta DELETE FROM sobre todos los ids/refs registrados en la lista de purga local
  // para garantizar que ningún registro eliminado reaparezca desde la base de datos remota.
  async sweepOrphanOrders() {
    const purgedList = this.getPurgedOrders();
    if (!purgedList || purgedList.length === 0) return { swept: 0 };

    let swept = 0;
    const purgedSet = new Set(purgedList.map((p) => String(p).trim()));

    for (const token of purgedSet) {
      // Intentar borrar por id (UUID) y por reference_code simultáneamente
      try { await supabase.from('order_items').delete().eq('order_id', token); } catch {}
      try { await supabase.from('order_items').delete().eq('reference_code', token); } catch {}
      try { await supabase.from('orders').delete().eq('id', token); swept++; } catch {}
      try { await supabase.from('orders').delete().eq('reference_code', token); swept++; } catch {}
    }

    // Limpiar caché local también
    const localOrders = this.getLocalOrders().filter((o) => {
      const ref = String(o.reference_code || '').trim();
      const id = String(o.id || '').trim();
      return !purgedSet.has(ref) && !purgedSet.has(id);
    });
    this.saveLocalOrders(localOrders);

    const archived = this.getArchivedOrders().filter((o) => {
      const ref = String(o.reference_code || '').trim();
      const id = String(o.id || '').trim();
      return !purgedSet.has(ref) && !purgedSet.has(id);
    });
    this.saveArchivedOrders(archived);

    console.info(`[orderService] Orphan sweep completado: ${swept} referencias purgadas de Supabase.`);
    return { swept };
  },

  // Subir o actualizar comprobante de pago y N° de operación
  async attachPaymentProof(
    orderReference,
    proofDataUrl,
    operationNumber = '',
    provider = 'wompi'
  ) {
    const updatedAt = new Date().toISOString();
    const localOrders = this.getLocalOrders();
    const updatedLocal = localOrders.map((ord) => {
      if (ord.reference_code === orderReference) {
        return {
          ...ord,
          payment_proof_url: proofDataUrl,
          payment_operation_number: operationNumber || ord.payment_operation_number || null,
          payment_provider: provider || ord.payment_provider || null,
          updated_at: updatedAt,
        };
      }
      return ord;
    });
    this.saveLocalOrders(updatedLocal);

    try {
      const { error } = await supabase
        .from('orders')
        .update({
          payment_proof_url: proofDataUrl,
          payment_operation_number: operationNumber || null,
          payment_provider: provider || null,
          updated_at: updatedAt,
        })
        .eq('reference_code', orderReference);

      if (error) {
        // Compatibilidad si la migración 07 aún no se aplicó.
        await supabase
          .from('orders')
          .update({
            payment_proof_url: proofDataUrl,
            updated_at: updatedAt,
          })
          .eq('reference_code', orderReference);
      }
    } catch (err) {
      console.warn('Error al adjuntar comprobante en Supabase:', err);
    }

    return { success: true };
  },
};
