// AdminCreditsPanel.jsx — JavrelStore Enterprise
// Módulo Financiero de Créditos, Cuentas por Cobrar e Historial de Abonos
// Permite controlar clientes con saldo, deudas pendientes, plazos y registrar pagos parciales/totales.

import React, { useState } from 'react';
import {
  Users,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Receipt,
  Search,
  Check,
  FileCheck,
} from 'lucide-react';
import { erpFinanceService } from '../services/erpFinanceService';
import { formatCurrency } from '../services/storeService';
import confetti from 'canvas-confetti';

export const AdminCreditsPanel = ({ onNotify }) => {
  const [credits, setCredits] = useState(() => erpFinanceService.getCredits());
  const [abonosHistory, setAbonosHistory] = useState(() => erpFinanceService.getAbonosHistory());
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('portfolio'); // 'portfolio' | 'abonos'

  // Modal para Registrar Abono
  const [abonoModal, setAbonoModal] = useState({
    isOpen: false,
    credit: null,
    amount: '',
    paymentMethod: 'Efectivo',
    note: '',
  });

  // Modal para Crear Crédito Nuevo
  const [newCreditModal, setNewCreditModal] = useState(false);
  const [newCreditForm, setNewCreditForm] = useState({
    clientName: '',
    docId: '',
    phone: '',
    email: '',
    creditLimit: 1500000,
    currentDebt: 0,
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    notes: '',
  });

  // KPIs de Cartera
  const totalReceivable = credits.reduce((acc, c) => acc + (Number(c.currentDebt) || 0), 0);
  const debtorsCount = credits.filter((c) => Number(c.currentDebt) > 0).length;
  const overdueCount = credits.filter((c) => c.status === 'en_mora' && Number(c.currentDebt) > 0).length;
  const totalAbonosThisPeriod = abonosHistory.reduce((acc, a) => acc + (Number(a.amount) || 0), 0);

  const filteredCredits = credits.filter((c) => {
    const q = searchTerm.toLowerCase();
    return (
      c.clientName?.toLowerCase().includes(q) ||
      c.docId?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    );
  });

  const handleOpenAbonoModal = (credit) => {
    setAbonoModal({
      isOpen: true,
      credit,
      amount: '',
      paymentMethod: 'Efectivo',
      note: '',
    });
  };

  const handleConfirmAbono = (e) => {
    e.preventDefault();
    if (!abonoModal.credit || !abonoModal.amount) return;

    try {
      const { updatedCredit, abonoRecord } = erpFinanceService.registerAbono({
        creditId: abonoModal.credit.id,
        amount: Number(abonoModal.amount),
        paymentMethod: abonoModal.paymentMethod,
        note: abonoModal.note,
      });

      setCredits(erpFinanceService.getCredits());
      setAbonosHistory(erpFinanceService.getAbonosHistory());
      setAbonoModal({ isOpen: false, credit: null, amount: '', paymentMethod: 'Efectivo', note: '' });

      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#0A735E', '#10B981', '#3B82F6'],
      });

      onNotify?.(
        `Abono de ${formatCurrency(abonoRecord.amount)} registrado con éxito para ${updatedCredit.clientName}.`
      );
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateCredit = (e) => {
    e.preventDefault();
    if (!newCreditForm.clientName) return;

    erpFinanceService.saveCredit({
      ...newCreditForm,
      currentDebt: Number(newCreditForm.currentDebt) || 0,
      creditLimit: Number(newCreditForm.creditLimit) || 1000000,
      status: Number(newCreditForm.currentDebt) > 0 ? 'al_dia' : 'saldado',
      lastPaymentDate: null,
      totalPurchases: 1,
    });

    setCredits(erpFinanceService.getCredits());
    setNewCreditModal(false);
    setNewCreditForm({
      clientName: '',
      docId: '',
      phone: '',
      email: '',
      creditLimit: 1500000,
      currentDebt: 0,
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      notes: '',
    });
    onNotify?.('Cuenta de crédito habilitada correctamente.');
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Encabezado */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-slate-200">
        <div>
          <h2 className="font-display font-extrabold text-lg sm:text-xl text-slate-900 flex items-center gap-2">
            <span>Créditos & Cuentas por Cobrar</span>
            <span className="text-[10px] font-mono-code font-bold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-[#0A6CFF] border border-blue-200">
              Cartera Clientes
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestiona clientes con saldo pendiente, plazos de pago y registro inmediato de abonos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('portfolio')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'portfolio'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            Cartera de Clientes ({credits.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('abonos')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'abonos'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            Historial de Abonos ({abonosHistory.length})
          </button>
          <button
            type="button"
            onClick={() => setNewCreditModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0A6CFF] hover:bg-blue-600 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Crear Crédito</span>
          </button>
        </div>
      </div>

      {/* Tarjetas KPI de Cartera */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-400 uppercase font-mono-code mb-1">
            <span>Cartera Total</span>
            <Receipt className="w-4 h-4 text-violet-500" />
          </div>
          <div className="font-display font-black text-xl text-slate-900">
            {formatCurrency(totalReceivable)}
          </div>
          <span className="text-[10px] text-slate-500">{debtorsCount} cliente(s) con saldo pendiente</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-400 uppercase font-mono-code mb-1">
            <span>Abonos Recibidos</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="font-display font-black text-xl text-emerald-600">
            {formatCurrency(totalAbonosThisPeriod)}
          </div>
          <span className="text-[10px] text-slate-500">{abonosHistory.length} transacciones de recaudo</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-400 uppercase font-mono-code mb-1">
            <span>En Mora</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="font-display font-black text-xl text-rose-600">
            {overdueCount} cliente(s)
          </div>
          <span className="text-[10px] text-slate-500">Requieren gestión y seguimiento</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-400 uppercase font-mono-code mb-1">
            <span>Al Día</span>
            <CheckCircle2 className="w-4 h-4 text-blue-500" />
          </div>
          <div className="font-display font-black text-xl text-[#0A6CFF]">
            {credits.length - overdueCount} cliente(s)
          </div>
          <span className="text-[10px] text-slate-500">Dentro del periodo de pago</span>
        </div>
      </div>

      {activeTab === 'portfolio' ? (
        /* TABLA DE CARTERA DE CLIENTES */
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs space-y-4 p-4 sm:p-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar cliente, cédula o teléfono..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-[#0A6CFF]"
              />
            </div>
            <span className="text-[11px] text-slate-400 font-mono-code">
              Mostrando {filteredCredits.length} cuentas registradas
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-500 uppercase font-mono-code text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Cédula / NIT</th>
                  <th className="py-3 px-4">Teléfono</th>
                  <th className="py-3 px-4 text-right">Cupo Límite</th>
                  <th className="py-3 px-4 text-right">Deuda Pendiente</th>
                  <th className="py-3 px-4">Vencimiento</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCredits.map((c) => {
                  const hasDebt = Number(c.currentDebt) > 0;
                  const isOverdue = c.status === 'en_mora' && hasDebt;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{c.clientName}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-xs">{c.notes}</div>
                      </td>
                      <td className="py-3 px-4 font-mono-code text-slate-600">{c.docId}</td>
                      <td className="py-3 px-4 text-slate-700">{c.phone}</td>
                      <td className="py-3 px-4 text-right font-mono-code text-slate-500">
                        {formatCurrency(c.creditLimit)}
                      </td>
                      <td className="py-3 px-4 text-right font-display font-black text-sm">
                        <span className={hasDebt ? (isOverdue ? 'text-rose-600' : 'text-slate-900') : 'text-emerald-600'}>
                          {formatCurrency(c.currentDebt)}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono-code text-slate-600">{c.dueDate}</td>
                      <td className="py-3 px-4 text-center">
                        {isOverdue ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            En Mora
                          </span>
                        ) : hasDebt ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            Al Día
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Saldado
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenAbonoModal(c)}
                          disabled={!hasDebt}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Abonar</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* HISTORIAL DE ABONOS RECIBIDOS */
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs space-y-4 p-4 sm:p-5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h4 className="font-display font-extrabold text-sm text-slate-900">
              Registro de Pagos y Abonos de Cartera ({abonosHistory.length})
            </h4>
            <span className="text-[11px] text-slate-400 font-mono-code">Auditoría en tiempo real</span>
          </div>

          {abonosHistory.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-600">Aún no se han registrado abonos a créditos</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-500 uppercase font-mono-code text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Fecha & Hora</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Medio de Pago</th>
                    <th className="py-3 px-4 text-right">Saldo Previo</th>
                    <th className="py-3 px-4 text-right">Monto Abonado</th>
                    <th className="py-3 px-4 text-right">Saldo Restante</th>
                    <th className="py-3 px-4">Nota</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {abonosHistory.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono-code text-slate-500">
                        {new Date(a.date).toLocaleDateString('es-CO', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">{a.clientName}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {a.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono-code text-slate-400 line-through">
                        {formatCurrency(a.previousDebt)}
                      </td>
                      <td className="py-3 px-4 text-right font-display font-black text-sm text-emerald-600">
                        +{formatCurrency(a.amount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-code font-bold text-slate-800">
                        {formatCurrency(a.remainingDebt)}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px] truncate max-w-xs">{a.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal Registrar Abono */}
      {abonoModal.isOpen && abonoModal.credit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-fadeIn">
          <form
            onSubmit={handleConfirmAbono}
            className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 animate-scaleUp"
          >
            <div className="border-b border-slate-100 pb-2">
              <h3 className="font-display font-extrabold text-base text-slate-900">
                Registrar Abono a Cuenta de Crédito
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cliente: <strong className="text-slate-800">{abonoModal.credit.clientName}</strong>
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Deuda actual pendiente:</span>
                <span className="font-display font-bold text-slate-900">
                  {formatCurrency(abonoModal.credit.currentDebt)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Monto del Abono en COP *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  required
                  min="1"
                  max={abonoModal.credit.currentDebt}
                  value={abonoModal.amount}
                  onChange={(e) => setAbonoModal({ ...abonoModal, amount: e.target.value })}
                  placeholder="Ej. 150000"
                  className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-emerald-700 outline-none focus:border-emerald-600"
                />
              </div>
              <button
                type="button"
                onClick={() => setAbonoModal({ ...abonoModal, amount: String(abonoModal.credit.currentDebt) })}
                className="text-[10px] text-blue-600 font-bold hover:underline mt-1 cursor-pointer block"
              >
                Pagar total de la deuda ({formatCurrency(abonoModal.credit.currentDebt)})
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Medio de Pago</label>
              <select
                value={abonoModal.paymentMethod}
                onChange={(e) => setAbonoModal({ ...abonoModal, paymentMethod: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 outline-none cursor-pointer"
              >
                <option value="Efectivo">Efectivo en Caja</option>
                <option value="Nequi">Nequi / Bre-B</option>
                <option value="DaviPlata">DaviPlata</option>
                <option value="Transferencia Bancolombia">Transferencia Bancolombia</option>
                <option value="Datáfono">Datáfono Tarjeta</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Nota o Comprobante (Opcional)</label>
              <input
                type="text"
                value={abonoModal.note}
                onChange={(e) => setAbonoModal({ ...abonoModal, note: e.target.value })}
                placeholder="Ej. N° aprobación 45892 o recibo físico #102"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAbonoModal({ isOpen: false, credit: null, amount: '', paymentMethod: 'Efectivo', note: '' })}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/25 cursor-pointer"
              >
                Confirmar Abono
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Crear Nuevo Crédito */}
      {newCreditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-fadeIn">
          <form
            onSubmit={handleCreateCredit}
            className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-3.5 animate-scaleUp"
          >
            <h3 className="font-display font-extrabold text-base text-slate-900 border-b border-slate-100 pb-2">
              Habilitar Línea de Crédito a Cliente
            </h3>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Nombre Completo del Cliente *</label>
              <input
                type="text"
                required
                value={newCreditForm.clientName}
                onChange={(e) => setNewCreditForm({ ...newCreditForm, clientName: e.target.value })}
                placeholder="Ej. Rodrigo Ospina"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:border-[#0A6CFF]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Cédula / NIT</label>
                <input
                  type="text"
                  value={newCreditForm.docId}
                  onChange={(e) => setNewCreditForm({ ...newCreditForm, docId: e.target.value })}
                  placeholder="1.090..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:border-[#0A6CFF]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Teléfono</label>
                <input
                  type="text"
                  value={newCreditForm.phone}
                  onChange={(e) => setNewCreditForm({ ...newCreditForm, phone: e.target.value })}
                  placeholder="310..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:border-[#0A6CFF]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Cupo Límite en COP</label>
                <input
                  type="number"
                  value={newCreditForm.creditLimit}
                  onChange={(e) => setNewCreditForm({ ...newCreditForm, creditLimit: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:border-[#0A6CFF]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Deuda Inicial</label>
                <input
                  type="number"
                  value={newCreditForm.currentDebt}
                  onChange={(e) => setNewCreditForm({ ...newCreditForm, currentDebt: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:border-[#0A6CFF]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Fecha de Vencimiento de Pago</label>
              <input
                type="date"
                value={newCreditForm.dueDate}
                onChange={(e) => setNewCreditForm({ ...newCreditForm, dueDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:border-[#0A6CFF]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNewCreditModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#0A6CFF] hover:bg-blue-600 text-white font-bold text-xs shadow-xs"
              >
                Guardar Cuenta
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
