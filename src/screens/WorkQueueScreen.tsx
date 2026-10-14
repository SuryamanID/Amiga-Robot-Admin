/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Layers,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  Search,
  Filter,
  Eye,
  ArrowRight,
  ShieldAlert,
  Building,
  Calendar,
  Clock,
  Sparkles,
  Lock,
  ChevronRight,
  FileText,
  AlertOctagon,
  Copy,
  PlusCircle,
} from 'lucide-react';
import { InvoiceDocument, UserProfile, InvoiceStatus, ExceptionFlag } from '../types';
import { formatRupiah } from '../services/api';

interface WorkQueueScreenProps {
  invoices: InvoiceDocument[];
  currentUser: UserProfile;
  onSelectInvoiceForReview: (invoice: InvoiceDocument) => void;
  onSelectInvoiceForVoucher: (invoice: InvoiceDocument) => void;
  onSelectInvoiceForAudit: (invoice: InvoiceDocument) => void;
  onNavigateToUpload: () => void;
  onTriggerAccessDenied: (targetClient: string, targetInvNum: string) => void;
}

export const WorkQueueScreen: React.FC<WorkQueueScreenProps> = ({
  invoices,
  currentUser,
  onSelectInvoiceForReview,
  onSelectInvoiceForVoucher,
  onSelectInvoiceForAudit,
  onNavigateToUpload,
  onTriggerAccessDenied,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [clientFilter, setClientFilter] = useState<string>('ALL');
  const [flagFilter, setFlagFilter] = useState<string>('ALL');

  // Multi-Client Security rule:
  // If user is a Client PIC (PIC_CLIENT_OWNER or PIC_CLIENT_OTHER), their view is strictly filtered to their own client's documents.
  // Internal AMIGA users (Finance Reviewer, Intake Support, Service Lead, System Admin) can view all clients according to RBAC.
  const isClientUser = currentUser.role === 'PIC_CLIENT_OWNER' || currentUser.role === 'PIC_CLIENT_OTHER';

  // Compute counts
  const stats = useMemo(() => {
    // For clients, only count their own documents
    const accessible = isClientUser
      ? invoices.filter((inv) => inv.clientId === currentUser.clientId)
      : invoices;

    return {
      total: accessible.length,
      readyForReview: accessible.filter((i) => i.status === 'READY_FOR_REVIEW').length,
      exception: accessible.filter((i) => i.status === 'EXCEPTION').length,
      completed: accessible.filter((i) => i.status === 'AMIGA_REVIEWED' || i.status === 'SENT_TO_CLIENT').length,
      otherClientCount: isClientUser
        ? invoices.filter((inv) => inv.clientId !== currentUser.clientId).length
        : 0,
    };
  }, [invoices, currentUser, isClientUser]);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // 1. Multi-client Isolation Filter
      if (isClientUser && inv.clientId !== currentUser.clientId) {
        return false;
      }

      // 2. Client filter dropdown (if internal)
      if (clientFilter !== 'ALL' && inv.clientId !== clientFilter) {
        return false;
      }

      // 3. Status filter
      if (statusFilter !== 'ALL' && inv.status !== statusFilter) {
        return false;
      }

      // 4. Exception Flag filter
      if (flagFilter !== 'ALL' && !inv.exceptionFlags.includes(flagFilter as ExceptionFlag)) {
        return false;
      }

      // 5. Search query
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const matchNumber = inv.invoiceNumber.toLowerCase().includes(query);
        const matchVendor = inv.vendorName.toLowerCase().includes(query);
        const matchReqId = inv.requestId.toLowerCase().includes(query);
        return matchNumber || matchVendor || matchReqId;
      }

      return true;
    });
  }, [invoices, isClientUser, currentUser, clientFilter, statusFilter, flagFilter, searchTerm]);

  // Distinct clients for dropdown
  const availableClients = useMemo(() => {
    const map = new Map<string, string>();
    invoices.forEach((i) => map.set(i.clientId, i.clientName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [invoices]);

  return (
    <div className="space-y-6">
      {/* Page Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-white tracking-tight">
              Layar 01: Dashboard Antrean Kerja
            </h1>
            <span className="px-2 py-0.5 text-xs font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800 rounded">
              AMIGA Back Office
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Monitoring arus faktur vendor terpusat, status verifikasi AI, SLA jatuh tempo, dan eskalasi pengecualian.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Quick Upload Button */}
          <button
            type="button"
            onClick={onNavigateToUpload}
            className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-cyan-600/20 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Unggah Faktur Baru</span>
          </button>

          {/* Test Scenario 6 trigger button if Client PIC */}
          {isClientUser && (
            <button
              type="button"
              onClick={() => {
                const otherDoc = invoices.find((i) => i.clientId !== currentUser.clientId);
                onTriggerAccessDenied(
                  otherDoc?.clientName || 'PT Nusantara Sejahtera',
                  otherDoc?.invoiceNumber || 'INV/2026/DNS-019'
                );
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/80 text-rose-300 text-xs font-semibold rounded-xl transition"
              title="Simulasikan percobaan membuka dokumen klien lain untuk melihat proteksi Scenario 6"
            >
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>Tes Isolasi Multi-Klien</span>
            </button>
          )}
        </div>
      </div>

      {/* Multi-Client Isolation Notice Banner (If Client PIC) */}
      {isClientUser && (
        <div className="bg-indigo-950/40 border border-indigo-700/50 rounded-xl p-3.5 flex items-center justify-between text-xs text-indigo-200">
          <div className="flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-indigo-400 shrink-0" />
            <div>
              <span className="font-bold text-white">Multi-Client Isolation Aktif:</span> Menampilkan data khusus entitas{' '}
              <strong className="text-cyan-300">{currentUser.clientName}</strong> ({currentUser.clientId}). Sebanyak{' '}
              <span className="font-mono text-white font-bold">{stats.otherClientCount} dokumen</span> milik klien lain disembunyikan secara otomatis.
            </div>
          </div>
          <span className="hidden md:inline-block px-2 py-0.5 bg-indigo-900 text-indigo-300 font-mono text-[10px] rounded border border-indigo-700">
            Scenario 6 Protected
          </span>
        </div>
      )}

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Total Antrean */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Antrean Aktif</span>
            <div className="p-2 bg-slate-800 rounded-lg text-slate-300">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{stats.total}</span>
            <span className="text-[11px] text-slate-400">Dokumen</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3" /> SLA target rata-rata &lt; 2 Jam
          </div>
        </div>

        {/* Card 2: Ready for Review */}
        <div className="bg-slate-900/90 border border-amber-900/40 rounded-xl p-4 shadow-sm hover:border-amber-800/60 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-400">Ready for Review</span>
            <div className="p-2 bg-amber-950/80 rounded-lg text-amber-300 border border-amber-800/50">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-300">{stats.readyForReview}</span>
            <span className="text-[11px] text-amber-400/80">Perlu Persetujuan</span>
          </div>
          <div className="mt-2 text-[11px] text-amber-500 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Ekstraksi AI 100% Selesai
          </div>
        </div>

        {/* Card 3: Exception */}
        <div className="bg-slate-900/90 border border-rose-900/40 rounded-xl p-4 shadow-sm hover:border-rose-800/60 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-400">Exception / Tahanan</span>
            <div className="p-2 bg-rose-950/80 rounded-lg text-rose-300 border border-rose-800/50">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-300">{stats.exception}</span>
            <span className="text-[11px] text-rose-400/80">Butuh Intervensi</span>
          </div>
          <div className="mt-2 text-[11px] text-rose-500 flex items-center gap-1">
            <AlertOctagon className="w-3 h-3" /> Missing Evidence & Duplikasi
          </div>
        </div>

        {/* Card 4: Selesai */}
        <div className="bg-slate-900/90 border border-emerald-900/40 rounded-xl p-4 shadow-sm hover:border-emerald-800/60 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-400">Voucher Disetujui</span>
            <div className="p-2 bg-emerald-950/80 rounded-lg text-emerald-300 border border-emerald-800/50">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-300">{stats.completed}</span>
            <span className="text-[11px] text-emerald-400/80">AMIGA_REVIEWED</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-500 flex items-center gap-1">
            <FileText className="w-3 h-3" /> Siap Diunduh PIC Klien
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nomor invoice, vendor, request ID..."
            className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Client Filter (for internal AMIGA users) */}
          {!isClientUser && (
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900 text-slate-200">Semua Klien</option>
                {availableClients.map((c) => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-slate-200">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-slate-200">Semua Status</option>
              <option value="QUEUED" className="bg-slate-900 text-slate-200">QUEUED</option>
              <option value="PROCESSING" className="bg-slate-900 text-slate-200">PROCESSING</option>
              <option value="READY_FOR_REVIEW" className="bg-slate-900 text-slate-200">READY_FOR_REVIEW</option>
              <option value="EXCEPTION" className="bg-slate-900 text-slate-200">EXCEPTION</option>
              <option value="AMIGA_REVIEWED" className="bg-slate-900 text-slate-200">AMIGA_REVIEWED</option>
              <option value="SENT_TO_CLIENT" className="bg-slate-900 text-slate-200">SENT_TO_CLIENT</option>
            </select>
          </div>

          {/* Exception Flag Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={flagFilter}
              onChange={(e) => setFlagFilter(e.target.value)}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-slate-200">Semua Bendera</option>
              <option value="MISSING_EVIDENCE" className="bg-slate-900 text-slate-200">MISSING_EVIDENCE</option>
              <option value="POSSIBLE_DUPLICATE" className="bg-slate-900 text-slate-200">POSSIBLE_DUPLICATE</option>
              <option value="MATH_MISMATCH" className="bg-slate-900 text-slate-200">MATH_MISMATCH</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Invoices Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950 text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
                <th className="py-3 px-4">Request ID & Saluran</th>
                <th className="py-3 px-4">Klien & Tipe</th>
                <th className="py-3 px-4">Vendor & No Faktur</th>
                <th className="py-3 px-4">Tanggal & SLA</th>
                <th className="py-3 px-4 text-right">Total Tagihan</th>
                <th className="py-3 px-4 text-center">Status & Bendera</th>
                <th className="py-3 px-4 text-center">Aksi Operasional</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Tidak ada dokumen faktur yang cocok dengan kriteria pencarian dan filter saat ini.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const isReady = inv.status === 'READY_FOR_REVIEW';
                  const isException = inv.status === 'EXCEPTION';
                  const isReviewed = inv.status === 'AMIGA_REVIEWED' || inv.status === 'SENT_TO_CLIENT';

                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-slate-800/50 transition-colors group"
                    >
                      {/* Column 1: Request ID & Intake Channel */}
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-cyan-400">{inv.requestId}</div>
                        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-[10px] text-slate-300">
                            {inv.intakeChannel}
                          </span>
                          <span className="truncate max-w-[120px] text-slate-500" title={inv.uploadedByUserName}>
                            by {inv.uploadedByUserName.split(' ')[0]}
                          </span>
                        </div>
                      </td>

                      {/* Column 2: Client & Request Type */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200">{inv.clientName}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {inv.requestType === 'PEMBAYARAN_REGULER'
                            ? 'Pembayaran Reguler'
                            : inv.requestType === 'REIMBURSEMENT_URGENT'
                            ? 'Reimbursement Urgent'
                            : 'Kontrak Berkala'}
                        </div>
                      </td>

                      {/* Column 3: Vendor & Invoice Number */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white group-hover:text-cyan-300 transition-colors">
                          {inv.vendorName}
                        </div>
                        <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                          {inv.invoiceNumber}
                        </div>
                      </td>

                      {/* Column 4: Date & SLA */}
                      <td className="py-3 px-4">
                        <div className="text-slate-300">{inv.uploadDate.split(' ')[0]}</div>
                        <div
                          className={`inline-flex items-center gap-1 text-[11px] font-medium mt-0.5 ${
                            inv.deadlineSLA.includes('Mendesak') || inv.deadlineSLA.includes('1 Jam')
                              ? 'text-rose-400'
                              : inv.deadlineSLA.includes('Hold')
                              ? 'text-amber-400'
                              : 'text-slate-400'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          {inv.deadlineSLA}
                        </div>
                      </td>

                      {/* Column 5: Grand Total */}
                      <td className="py-3 px-4 text-right">
                        <div className="font-mono font-bold text-white text-sm">
                          {formatRupiah(inv.grandTotal)}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {inv.lineItems.length} baris item
                        </div>
                      </td>

                      {/* Column 6: Status & Flags */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-block">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider inline-flex items-center gap-1 ${
                              isReady
                                ? 'bg-amber-950/80 text-amber-300 border border-amber-700/60'
                                : isException
                                ? 'bg-rose-950/80 text-rose-300 border border-rose-700/60'
                                : isReviewed
                                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </div>

                        {/* Exception Flags Pills */}
                        {inv.exceptionFlags.length > 0 && (
                          <div className="flex flex-wrap justify-center gap-1 mt-1.5">
                            {inv.exceptionFlags.map((flag) => (
                              <span
                                key={flag}
                                className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-rose-950/90 text-rose-300 border border-rose-800"
                              >
                                {flag}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Column 7: Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* If Ready or Exception: Button to Review Screen */}
                          <button
                            type="button"
                            onClick={() => onSelectInvoiceForReview(inv)}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-cyan-600 hover:text-white text-cyan-400 text-xs font-semibold rounded-lg border border-slate-700 transition flex items-center gap-1"
                            title="Buka Layar Peninjauan & Verifikasi"
                          >
                            <FileCheck className="w-3.5 h-3.5" />
                            <span>Tinjau</span>
                          </button>

                          {/* If Approved: Button to Voucher Screen */}
                          {isReviewed && (
                            <button
                              type="button"
                              onClick={() => onSelectInvoiceForVoucher(inv)}
                              className="px-2.5 py-1.5 bg-emerald-950 hover:bg-emerald-700 text-emerald-300 hover:text-white text-xs font-semibold rounded-lg border border-emerald-800 transition flex items-center gap-1"
                              title="Lihat Pratinjau Bukti Pengeluaran Kas (Payment Voucher)"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Voucher</span>
                            </button>
                          )}

                          {/* Detail Audit Trail Button */}
                          <button
                            type="button"
                            onClick={() => onSelectInvoiceForAudit(inv)}
                            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
                            title="Lihat Kronologi Jejak Audit"
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
