// AdminPurchasesPanel.jsx — JavrelStore Enterprise
// Módulo de Compras a Proveedores e Ingreso de Inventario
// Diseñado exactamente según la interfaz de software ERP moderna (Captura 5).

import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Calendar,
  Building2,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  Search,
  Check,
  Package,
  Layers,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { erpFinanceService } from '../services/erpFinanceService';
import { formatCurrency } from '../services/storeService';
import confetti from 'canvas-confetti';

export const AdminPurchasesPanel = ({ products = [], onUpdateInventoryAfterPurchase, onNotify }) => {
  const [viewMode, setViewMode] = useState('new_purchase'); // 'new_purchase' | 'purchases_history'
  const [suppliers, setSuppliers] = useState(() => erpFinanceService.getSuppliers());
  const [purchasesHistory, setPurchasesHistory] = useState(() => erpFinanceService.getPurchases());

  // Formulario de Nueva Compra
  const [invoiceNumber, setInvoiceNumber] = useState(
    () => `FC-${Math.floor(10000 + Math.random() * 90000)}`
  );
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [destinationWarehouse, setDestinationWarehouse] = useState('Bodega Principal');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [purchaseNotes, setPurchaseNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Modal para agregar proveedor rápido
  const [showNewSupplierModal, setShowNewSupplierModal] = useState(false);
  const [newSupplierData, setNewSupplierData] = useState({ name: '', nit: '', phone: '', email: '' });

  // Líneas de productos de la compra
  const [purchaseLines, setPurchaseLines] = useState([
    {
      id: 'line-1',
      productId: '',
      productName: '',
      unitPrice: 0,
      discountPercent: 0,
      taxPercent: 19, // 19% IVA estándar
      quantity: 1,
      notes: '',
    },
  ]);

  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId) || null;

  // Manejadores de líneas
  const handleAddLine = () => {
    setPurchaseLines((prev) => [
      ...prev,
      {
        id: `line-${Date.now()}`,
        productId: '',
        productName: '',
        unitPrice: 0,
        discountPercent: 0,
        taxPercent: 19,
        quantity: 1,
        notes: '',
      },
    ]);
  };

  const handleRemoveLine = (index) => {
    if (purchaseLines.length === 1) return;
    setPurchaseLines((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateLine = (index, field, value) => {
    setPurchaseLines((prev) =>
      prev.map((line, idx) => {
        if (idx !== index) return line;
        const updated = { ...line, [field]: value };

        // Si cambia el producto, sugerir el precio de costo o venta actual
        if (field === 'productId') {
          const prod = products.find((p) => p.id === value);
          if (prod) {
            updated.productName = prod.name;
            updated.unitPrice = prod.cost || Math.round(prod.price * 0.7);
          }
        }
        return updated;
      })
    );
  };

  // Cálculos financieros automáticos en tiempo real
  const summary = purchaseLines.reduce(
    (acc, line) => {
      const qty = Number(line.quantity) || 0;
      const unit = Number(line.unitPrice) || 0;
      const descPct = Number(line.discountPercent) || 0;
      const taxPct = Number(line.taxPercent) || 0;

      const gross = qty * unit;
      const discount = gross * (descPct / 100);
      const taxable = gross - discount;
      const tax = taxable * (taxPct / 100);
      const lineTotal = taxable + tax;

      return {
        subtotal: acc.subtotal + gross,
        totalDiscount: acc.totalDiscount + discount,
        totalTax: acc.totalTax + tax,
        grandTotal: acc.grandTotal + lineTotal,
      };
    },
    { subtotal: 0, totalDiscount: 0, totalTax: 0, grandTotal: 0 }
  );

  // Guardar factura de compra
  const handleSavePurchase = async () => {
    const validLines = purchaseLines.filter((l) => l.productId && l.quantity > 0 && l.unitPrice >= 0);
    if (validLines.length === 0) {
      alert('Por favor selecciona al menos un producto con cantidad válida.');
      return;
    }

    setIsSaving(true);
    try {
      const purchasePayload = {
        invoiceNumber,
        purchaseDate,
        dueDate,
        warehouse: destinationWarehouse,
        supplierId: selectedSupplier?.id || 'prov-gen',
        supplierName: selectedSupplier?.name || 'Proveedor General',
        supplierNit: selectedSupplier?.nit || '',
        notes: purchaseNotes,
        subtotal: summary.subtotal,
        discount: summary.totalDiscount,
        tax: summary.totalTax,
        total: summary.grandTotal,
        items: validLines.map((l) => ({
          productId: l.productId,
          productName: l.productName,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
          discountPercent: Number(l.discountPercent),
          taxPercent: Number(l.taxPercent),
          total: (l.quantity * l.unitPrice * (1 - l.discountPercent / 100)) * (1 + l.taxPercent / 100),
          notes: l.notes,
        })),
      };

      erpFinanceService.savePurchase(purchasePayload, (items) => {
        if (onUpdateInventoryAfterPurchase) {
          onUpdateInventoryAfterPurchase(items);
        }
      });

      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#0A735E', '#0A6CFF', '#10B981'],
      });

      onNotify?.(`Factura ${invoiceNumber} registrada con éxito. Stock de bodega actualizado.`);

      // Reiniciar formulario
      setInvoiceNumber(`FC-${Math.floor(10000 + Math.random() * 90000)}`);
      setPurchaseLines([
        {
          id: 'line-1',
          productId: '',
          productName: '',
          unitPrice: 0,
          discountPercent: 0,
          taxPercent: 19,
          quantity: 1,
          notes: '',
        },
      ]);
      setPurchaseNotes('');
      setPurchasesHistory(erpFinanceService.getPurchases());
      setViewMode('purchases_history');
    } catch (err) {
      alert('Error guardando factura: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateSupplier = (e) => {
    e.preventDefault();
    if (!newSupplierData.name) return;
    const created = erpFinanceService.saveSupplier(newSupplierData);
    setSuppliers(erpFinanceService.getSuppliers());
    setSelectedSupplierId(created.id);
    setShowNewSupplierModal(false);
    setNewSupplierData({ name: '', nit: '', phone: '', email: '' });
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Selector de Vista: Nueva Compra vs Historial */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-slate-200">
        <div>
          <h2 className="font-display font-extrabold text-lg sm:text-xl text-slate-900 flex items-center gap-2">
            <span>Nueva Compra a Proveedores</span>
            <span className="text-[10px] font-mono-code font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              ERP Inventario
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Registra facturas de compras, ingresa inventario y controla cuentas por pagar.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('new_purchase')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'new_purchase'
                ? 'bg-[#0A735E] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            + Registrar Factura
          </button>
          <button
            type="button"
            onClick={() => setViewMode('purchases_history')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'purchases_history'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            Historial de Compras ({purchasesHistory.length})
          </button>
        </div>
      </div>

      {viewMode === 'new_purchase' ? (
        <div className="space-y-5">
          {/* TARJETA 1: Información General de la Factura */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
            <h4 className="font-display font-extrabold text-sm text-slate-900 border-b border-slate-100 pb-2">
              Información General de la Factura
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Factura de compra N° *
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono-code font-bold text-slate-900 outline-none focus:bg-white focus:border-[#0A735E]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Fecha de compra *
                </label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 outline-none focus:bg-white focus:border-[#0A735E]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Fecha de vencimiento *
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 outline-none focus:bg-white focus:border-[#0A735E]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Bodega de destino *
                </label>
                <select
                  value={destinationWarehouse}
                  onChange={(e) => setDestinationWarehouse(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-[#0A735E] cursor-pointer"
                >
                  <option value="Bodega Principal">Bodega Principal</option>
                  <option value="Punto de Venta Mostrador">Punto de Venta Mostrador</option>
                  <option value="Bodega Secundaria">Bodega Secundaria</option>
                </select>
              </div>
            </div>

            {/* Fila de Proveedor */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-700">Proveedor *</label>
                <button
                  type="button"
                  onClick={() => setShowNewSupplierModal(true)}
                  className="text-[11px] font-bold text-[#0A735E] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Nuevo proveedor</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                <div className="sm:col-span-5">
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-[#0A735E] cursor-pointer"
                  >
                    <option value="">Selecciona o busca un proveedor...</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.nit})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-4">
                  <input
                    type="text"
                    readOnly
                    placeholder="Identificación / NIT"
                    value={selectedSupplier?.nit || ''}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 outline-none"
                  />
                </div>

                <div className="sm:col-span-3">
                  <input
                    type="text"
                    readOnly
                    placeholder="Teléfono de contacto"
                    value={selectedSupplier?.phone || ''}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* TARJETA 2: Productos Comprados (Tabla ERP) */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="font-display font-extrabold text-sm text-slate-900">
                Productos Comprados
              </h4>
              <span className="text-[11px] text-slate-400 font-mono-code">
                {purchaseLines.length} ítem(s) en factura
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-500 uppercase font-mono-code text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 min-w-[200px]">Producto</th>
                    <th className="py-2.5 px-3 w-32">Precio Unit.</th>
                    <th className="py-2.5 px-3 w-20">% Desc.</th>
                    <th className="py-2.5 px-3 w-28">Impuesto</th>
                    <th className="py-2.5 px-3 w-20 text-center">Cant.</th>
                    <th className="py-2.5 px-3 min-w-[140px]">Observaciones</th>
                    <th className="py-2.5 px-3 w-28 text-right">Total</th>
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {purchaseLines.map((line, idx) => {
                    const gross = line.quantity * line.unitPrice;
                    const discount = gross * (line.discountPercent / 100);
                    const taxable = gross - discount;
                    const tax = taxable * (line.taxPercent / 100);
                    const lineTotal = taxable + tax;

                    return (
                      <tr key={line.id} className="hover:bg-slate-50/60">
                        {/* Selector de Producto */}
                        <td className="py-2 px-3">
                          <select
                            value={line.productId}
                            onChange={(e) => handleUpdateLine(idx, 'productId', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-[#0A735E]"
                          >
                            <option value="">Buscar o seleccionar producto...</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.reference || p.id}) — Stock: {p.stock ?? 0}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Precio Unitario */}
                        <td className="py-2 px-3">
                          <div className="relative">
                            <span className="absolute left-2 top-1.5 text-slate-400 font-bold">$</span>
                            <input
                              type="number"
                              min="0"
                              value={line.unitPrice}
                              onChange={(e) => handleUpdateLine(idx, 'unitPrice', Number(e.target.value))}
                              className="w-full pl-5 pr-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-[#0A735E]"
                            />
                          </div>
                        </td>

                        {/* % Descuento */}
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={line.discountPercent}
                            onChange={(e) => handleUpdateLine(idx, 'discountPercent', Number(e.target.value))}
                            className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 outline-none text-center"
                          />
                        </td>

                        {/* Impuesto / IVA */}
                        <td className="py-2 px-3">
                          <select
                            value={line.taxPercent}
                            onChange={(e) => handleUpdateLine(idx, 'taxPercent', Number(e.target.value))}
                            className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 outline-none cursor-pointer"
                          >
                            <option value={19}>IVA (19%)</option>
                            <option value={5}>IVA (5%)</option>
                            <option value={0}>Exento (0%)</option>
                          </select>
                        </td>

                        {/* Cantidad */}
                        <td className="py-2 px-3 text-center">
                          <input
                            type="number"
                            min="1"
                            value={line.quantity}
                            onChange={(e) => handleUpdateLine(idx, 'quantity', Number(e.target.value))}
                            className="w-16 px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 text-center outline-none"
                          />
                        </td>

                        {/* Observaciones */}
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            placeholder="Lote / Nota..."
                            value={line.notes}
                            onChange={(e) => handleUpdateLine(idx, 'notes', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700 outline-none"
                          />
                        </td>

                        {/* Total por Línea */}
                        <td className="py-2 px-3 text-right font-display font-bold text-slate-900">
                          {formatCurrency(lineTotal)}
                        </td>

                        {/* Eliminar línea */}
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Eliminar fila"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={handleAddLine}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-slate-300 hover:border-[#0A735E] text-[#0A735E] font-bold text-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar línea</span>
            </button>

            {/* Sección Inferior: Notas + Totales */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-4 border-t border-slate-200">
              <div className="md:col-span-7">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Notas de la compra
                </label>
                <textarea
                  rows={3}
                  value={purchaseNotes}
                  onChange={(e) => setPurchaseNotes(e.target.value)}
                  placeholder="Condiciones de pago, número de guía o comentarios del proveedor..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs text-slate-800 outline-none focus:bg-white focus:border-[#0A735E]"
                />
              </div>

              {/* Caja de Totales */}
              <div className="md:col-span-5 rounded-2xl bg-slate-50 p-4 border border-slate-200/80 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono-code font-bold">{formatCurrency(summary.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Descuento:</span>
                  <span className="font-mono-code font-bold text-rose-600">
                    -{formatCurrency(summary.totalDiscount)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Impuestos (IVA):</span>
                  <span className="font-mono-code font-bold">{formatCurrency(summary.totalTax)}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-sm">
                  <span className="font-bold text-slate-900">Total General:</span>
                  <span className="font-display font-black text-base text-[#0A735E]">
                    {formatCurrency(summary.grandTotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setViewMode('purchases_history')}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSavePurchase}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0A735E] hover:bg-[#075949] text-white font-extrabold text-xs shadow-md shadow-emerald-700/20 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Guardar compra e ingresar stock</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* HISTORIAL DE COMPRAS REGISTRADAS */
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs space-y-4 p-5">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-200">
            <h4 className="font-display font-extrabold text-sm text-slate-900">
              Historial de Facturas de Compra ({purchasesHistory.length})
            </h4>
            <span className="text-[11px] text-slate-400">
              Afectan directamente el kardex de inventario en bodega
            </span>
          </div>

          {purchasesHistory.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-600">No hay facturas de compra registradas aún</p>
              <button
                type="button"
                onClick={() => setViewMode('new_purchase')}
                className="mt-3 px-4 py-2 rounded-xl bg-[#0A735E] text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                + Registrar primera compra
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-500 uppercase font-mono-code text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">N° Factura</th>
                    <th className="py-3 px-4">Proveedor</th>
                    <th className="py-3 px-4">Fecha Compra</th>
                    <th className="py-3 px-4">Vencimiento</th>
                    <th className="py-3 px-4 text-center">Ítems</th>
                    <th className="py-3 px-4 text-right">Total Factura</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {purchasesHistory.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-mono-code font-bold text-slate-900">
                        {p.invoiceNumber}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {p.supplierName}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono-code">
                        {p.purchaseDate}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono-code">
                        {p.dueDate}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-800">
                        {p.items?.length || 0}
                      </td>
                      <td className="py-3 px-4 text-right font-display font-black text-[#0A735E]">
                        {formatCurrency(p.total)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Check className="w-3 h-3" /> {p.status || 'Completada'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal Nuevo Proveedor */}
      {showNewSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <form
            onSubmit={handleCreateSupplier}
            className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 animate-scaleUp"
          >
            <h3 className="font-display font-extrabold text-base text-slate-900">
              Registrar Nuevo Proveedor
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Nombre Comercial / Razón Social *</label>
                <input
                  type="text"
                  required
                  value={newSupplierData.name}
                  onChange={(e) => setNewSupplierData({ ...newSupplierData, name: e.target.value })}
                  placeholder="Ej. Distribuciones Alfa S.A.S."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:border-[#0A735E]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">NIT / Cédula</label>
                <input
                  type="text"
                  value={newSupplierData.nit}
                  onChange={(e) => setNewSupplierData({ ...newSupplierData, nit: e.target.value })}
                  placeholder="900.123.456-7"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:border-[#0A735E]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={newSupplierData.phone}
                    onChange={(e) => setNewSupplierData({ ...newSupplierData, phone: e.target.value })}
                    placeholder="312 000 0000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:border-[#0A735E]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={newSupplierData.email}
                    onChange={(e) => setNewSupplierData({ ...newSupplierData, email: e.target.value })}
                    placeholder="contacto@alfa.co"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:border-[#0A735E]"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewSupplierModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#0A735E] hover:bg-[#075949] text-white font-bold text-xs shadow-xs"
              >
                Guardar Proveedor
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
