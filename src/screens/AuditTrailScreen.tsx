/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Clock,
  Filter,
  Download,
  Search,
  Sparkles,
  FileCheck,
  AlertTriangle,
  User,
  ShieldAlert,
  ArrowRight,
  Database,
  History,
  FileText,
} from 'lucide-react';
import { InvoiceDocument, UserProfile, AuditLogEntry } from '../types';

interface AuditTrailScreenProps {
  invoices: InvoiceDocument[];
  currentUser: UserProfile;
  selectedInvoiceId?: string;
}

export const AuditTrailScreen: React.FC<AuditTrailScreenProps> = ({
  invoices,
  currentUser,
  selectedInvoiceId,
}) => {
  const [activeInvoiceFilter, setActiveInvoiceFilter] = useState<string>(
    selectedInvoiceId || 'ALL'
  );
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Collect all audit entries across accessible invoices
  const isClientUser = currentUser.role === 'PIC_CLIENT_OWNER' || currentUser.role === 'PIC_CLIENT_OTHER';

  const allAuditEntries = useMemo(() => {
    const list: (AuditLogEntry & { invoiceRef: { reqId: string; vendor: string; invNum: string; client: string } })[] = [];

    invoices.forEach((inv) => {
      // Multi-client isolation: skip docs from other clients for client users
      if (isClientUser && inv.clientId !== currentUser.clientId) {
        return;
      }

      (inv.auditTrail || []).forEach((entry) => {
        list.push({
          ...entry,
          invoiceRef: {
            reqId: inv.requestId,
            vendor: inv.vendorName,
            invNum: inv.invoiceNumber,
            client: inv.clientName,
          },
        });
      });
    });

    // Sort chronologically descending
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [invoices, isClientUser, currentUser]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return allAuditEntries.filter((item) => {
      if (activeInvoiceFilter !== 'ALL' && item.invoiceId !== activeInvoiceFilter) {
        return false;
      }
      if (actionFilter !== 'ALL' && item.action !== actionFilter) {
        return false;
      }
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const mActor = item.actorName.toLowerCase().includes(q);
        const mNote = (item.note || '').toLowerCase().includes(q);
        const mField = (item.fieldName || '').toLowerCase().includes(q);
        const mReq = item.invoiceRef.reqId.toLowerCase().includes(q);
        const mVendor = item.invoiceRef.vendor.toLowerCase().includes(q);
        return mActor || mNote || mField || mReq || mVendor;
      }
      return true;
    });
  }, [allAuditEntries, activeInvoiceFilter, actionFilter, searchQuery]);

  // Export Audit to CSV
  const handleExportCSV = () => {
    const headers = ['Timestamp', 'Request ID', 'Vendor', 'Actor Name', 'Actor Role', 'Action', 'Field Name', 'Old Value', 'New Value', 'Notes'];
    const rows = filteredEntries.map((e) => [
      `"${e.timestamp}"`,
      `"${e.invoiceRef.reqId}"`,
      `"${e.invoiceRef.vendor}"`,
      `"${e.actorName}"`,
      `"${e.actorRole}"`,
      `"${e.action}"`,
      `"${e.fieldName || ''}"`,
      `"${e.oldValue || ''}"`,
      `"${e.newValue || ''}"`,
      `"${e.note || ''}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AMIGA_Audit_Trail_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-white tracking-tight">
              Layar 05: Layar Riwayat & Jejak Audit (Audit Trail & History Log)
            </h1>
            <span className="px-2 py-0.5 text-xs font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800 rounded">
              Scenario 7 Compliant
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Kronologi kepatuhan audit tidak dapat diubah (immutable log), mencatat stempel waktu ekstraksi AI, validasi aturan, dan rincian perubahan field (diff).
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition shrink-0"
        >
          <Download className="w-4 h-4 text-cyan-400" />
          <span>Ekspor Log Audit (.CSV)</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col md:flex-row items-center justify-between gap-3 text-xs shadow-xl">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari aktor, catatan, field, atau request ID..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Invoice Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={activeInvoiceFilter}
              onChange={(e) => setActiveInvoiceFilter(e.target.value)}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer max-w-[180px]"
            >
              <option value="ALL" className="bg-slate-900">Semua Dokumen Faktur</option>
              {invoices
                .filter((inv) => !isClientUser || inv.clientId === currentUser.clientId)
                .map((inv) => (
                  <option key={inv.id} value={inv.id} className="bg-slate-900">
                    {inv.requestId} - {inv.vendorName}
                  </option>
                ))}
            </select>
          </div>

          {/* Action Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900">Semua Tipe Aktivitas</option>
              <option value="DOCUMENT_UPLOADED" className="bg-slate-900">DOCUMENT_UPLOADED</option>
              <option value="AI_EXTRACTED" className="bg-slate-900">AI_EXTRACTED</option>
              <option value="VALIDATION_PASSED" className="bg-slate-900">VALIDATION_PASSED</option>
              <option value="FLAG_EXCEPTION" className="bg-slate-900">FLAG_EXCEPTION</option>
              <option value="FIELD_UPDATE" className="bg-slate-900">FIELD_UPDATE (Diffs)</option>
              <option value="APPROVED" className="bg-slate-900">APPROVED</option>
              <option value="SENT_TO_CLIENT" className="bg-slate-900">SENT_TO_CLIENT</option>
            </select>
          </div>
        </div>
      </div>

      {/* Chronological Timeline List */}
      <div className="space-y-4">
        {filteredEntries.length === 0 ? (
          <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-xl text-slate-500 text-xs">
            Tidak ada jejak audit yang sesuai dengan filter pencarian.
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const isFieldUpdate = entry.action === 'FIELD_UPDATE';
            const isAI = entry.action === 'AI_EXTRACTED';
            const isException = entry.action === 'FLAG_EXCEPTION';
            const isApproved = entry.action === 'APPROVED';

            return (
              <div
                key={entry.id}
                className={`p-4 rounded-xl border bg-slate-900/90 shadow-md transition hover:border-slate-700 ${
                  isFieldUpdate
                    ? 'border-blue-900/60 ring-1 ring-blue-500/10'
                    : isException
                    ? 'border-rose-900/60'
                    : isApproved
                    ? 'border-emerald-900/60'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80 text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                        isApproved
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : isException
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : isFieldUpdate
                          ? 'bg-blue-950 text-blue-300 border border-blue-800'
                          : isAI
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {entry.action}
                    </span>

                    <span className="font-mono text-cyan-400 font-semibold">
                      {entry.invoiceRef.reqId}
                    </span>
                    <span className="text-slate-500">|</span>
                    <span className="text-slate-300 font-medium">{entry.invoiceRef.vendor}</span>
                  </div>

                  <div className="flex items-center gap-3 text-slate-400 text-[11px] font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {entry.timestamp}
                    </span>
                  </div>
                </div>

                {/* Actor & Action Description */}
                <div className="mt-3 flex items-start justify-between gap-4 text-xs">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="text-slate-500">Aktor:</span>
                      <strong className="text-white">{entry.actorName}</strong>
                      <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded border border-slate-700">
                        {entry.actorRole}
                      </span>
                    </div>

                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      {entry.note}
                    </p>

                    {/* Field Level Before/After Diff Table (Scenario 7 Highlighting) */}
                    {isFieldUpdate && entry.fieldName && (
                      <div className="mt-3 p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs space-y-2">
                        <div className="flex items-center gap-1.5 text-blue-400 font-semibold text-[11px]">
                          <History className="w-3.5 h-3.5" />
                          Rincian Perubahan Field: <strong className="text-white font-mono">{entry.fieldName}</strong>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="p-2 bg-rose-950/30 border border-rose-900/60 rounded">
                            <span className="text-[10px] text-rose-400 font-bold block uppercase tracking-wider">
                              Nilai Sebelum (Old Value)
                            </span>
                            <span className="font-mono text-rose-300 font-semibold text-xs break-all">
                              {entry.oldValue || '(Kosong)'}
                            </span>
                          </div>

                          <div className="p-2 bg-emerald-950/30 border border-emerald-900/60 rounded">
                            <span className="text-[10px] text-emerald-400 font-bold block uppercase tracking-wider">
                              Nilai Sesudah (New Value)
                            </span>
                            <span className="font-mono text-emerald-300 font-semibold text-xs break-all">
                              {entry.newValue}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
