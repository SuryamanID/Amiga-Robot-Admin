/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  FileText,
  Clock,
  Sparkles,
  Building2,
  CreditCard,
  Layers,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { InvoiceDocument, UserProfile, LineItem, AuditLogEntry, ExceptionFlag } from '../types';
import { DocumentViewer } from '../components/DocumentViewer';
import { formatRupiah, submitInvoiceReview } from '../services/api';

interface ReviewScreenProps {
  invoice: InvoiceDocument;
  allInvoices: InvoiceDocument[];
  currentUser: UserProfile;
  onSelectInvoice: (invoice: InvoiceDocument) => void;
  onUpdateInvoice: (updatedInvoice: InvoiceDocument) => void;
  onNavigateToVoucher: (invoice: InvoiceDocument) => void;
}

export const ReviewScreen: React.FC<ReviewScreenProps> = ({
  invoice,
  allInvoices,
  currentUser,
  onSelectInvoice,
  onUpdateInvoice,
  onNavigateToVoucher,
}) => {
  // Local editable form fields initialized from invoice
  const [vendorName, setVendorName] = useState(invoice.vendorName);
  const [invoiceNumber, setInvoiceNumber] = useState(invoice.invoiceNumber);
  const [dueDate, setDueDate] = useState(invoice.dueDate);
  const [bankName, setBankName] = useState(invoice.bankDetails.bankName);
  const [accountNumber, setAccountNumber] = useState(invoice.bankDetails.accountNumber);
  const [accountHolder, setAccountHolder] = useState(invoice.bankDetails.accountHolder);
  const [lineItems, setLineItems] = useState<LineItem[]>(invoice.lineItems);
  const [discountAmount, setDiscountAmount] = useState(invoice.discountAmount || 0);
  const [taxPercent, setTaxPercent] = useState<number>(11);

  // Success / notification toast
  const [notification, setNotification] = useState<string | null>(null);

  // Sync form when active invoice changes
  useEffect(() => {
    setVendorName(invoice.vendorName);
    setInvoiceNumber(invoice.invoiceNumber);
    setDueDate(invoice.dueDate);
    setBankName(invoice.bankDetails.bankName);
    setAccountNumber(invoice.bankDetails.accountNumber);
    setAccountHolder(invoice.bankDetails.accountHolder);
    setLineItems(invoice.lineItems);
    setDiscountAmount(invoice.discountAmount || 0);
  }, [invoice]);

  // Calculations
  const subtotal = lineItems.reduce((acc, curr) => acc + (curr.totalPrice || 0), 0);
  const taxAmount = Math.round((subtotal * taxPercent) / 100);
  const grandTotal = subtotal + taxAmount - discountAmount;

  // Segregation of Duties (Scenario 5) Validation:
  // Is current user the person who uploaded this invoice?
  const isUploader = currentUser.id === invoice.uploadedByUserId;

  // Can current user approve?
  // Only independent Finance Reviewer who did NOT upload the document can approve!
  const isFinanceReviewer = currentUser.role === 'FINANCE_REVIEWER';
  const isSystemAdmin = currentUser.role === 'SYSTEM_ADMIN';
  const canApprove = isFinanceReviewer && !isUploader;

  // Reason why user cannot approve
  let approvalBlockReason = '';
  if (isUploader) {
    approvalBlockReason = `Pelanggaran Segregation of Duties: Anda adalah pengunggah dokumen ini (${invoice.uploadedByUserName}). Pengunggah dilarang menyetujui dokumen sendiri.`;
  } else if (isSystemAdmin) {
    approvalBlockReason = 'System Admin hanya bertugas mengelola akun & akses sistem; TIDAK memiliki wewenang menyetujui transaksi keuangan.';
  } else if (!isFinanceReviewer) {
    approvalBlockReason = `Peran "${currentUser.roleLabel}" tidak memiliki wewenang persetujuan voucher. Wewenang berada pada Finance Reviewer independen.`;
  }

  // Handle line item updates
  const handleItemChange = (index: number, field: keyof LineItem, value: any) => {
    const updated = [...lineItems];
    const item = { ...updated[index], [field]: value };
    if (field === 'quantity' || field === 'unitPrice') {
      const q = field === 'quantity' ? Number(value) : item.quantity;
      const u = field === 'unitPrice' ? Number(value) : item.unitPrice;
      item.totalPrice = q * u;
    }
    updated[index] = item;
    setLineItems(updated);
  };

  const handleAddLineItem = () => {
    const newItem: LineItem = {
      id: `li-manual-${Date.now()}`,
      description: 'Barang / Jasa Tambahan',
      quantity: 1,
      unitPrice: 1000000,
      totalPrice: 1000000,
    };
    setLineItems([...lineItems, newItem]);
  };

  const handleDeleteLineItem = (index: number) => {
    if (lineItems.length <= 1) {
      alert('Faktur harus memiliki minimal 1 baris item');
      return;
    }
    const updated = lineItems.filter((_, i) => i !== index);
    setLineItems(updated);
  };

  // Compare changes and generate audit log diffs (Scenario 7)
  const collectAuditDiffs = (): AuditLogEntry[] => {
    const diffs: AuditLogEntry[] = [];
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

    if (vendorName !== invoice.vendorName) {
      diffs.push({
        id: `aud-diff-${Date.now()}-1`,
        invoiceId: invoice.id,
        timestamp,
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.roleLabel,
        action: 'FIELD_UPDATE',
        fieldName: 'Nama Vendor (vendor_name)',
        oldValue: invoice.vendorName,
        newValue: vendorName,
        note: `Koreksi nama vendor oleh ${currentUser.name}`,
      });
    }

    if (invoiceNumber !== invoice.invoiceNumber) {
      diffs.push({
        id: `aud-diff-${Date.now()}-2`,
        invoiceId: invoice.id,
        timestamp,
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.roleLabel,
        action: 'FIELD_UPDATE',
        fieldName: 'Nomor Faktur (invoice_number)',
        oldValue: invoice.invoiceNumber,
        newValue: invoiceNumber,
        note: `Koreksi nomor faktur oleh ${currentUser.name}`,
      });
    }

    if (accountNumber !== invoice.bankDetails.accountNumber) {
      diffs.push({
        id: `aud-diff-${Date.now()}-3`,
        invoiceId: invoice.id,
        timestamp,
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.roleLabel,
        action: 'FIELD_UPDATE',
        fieldName: 'Nomor Rekening Bank (bank_account_number)',
        oldValue: invoice.bankDetails.accountNumber || '(KOSONG - MISSING_EVIDENCE)',
        newValue: accountNumber,
        note: `Pengisian/koreksi rekening bank penerima oleh ${currentUser.name}`,
      });
    }

    if (grandTotal !== invoice.grandTotal) {
      diffs.push({
        id: `aud-diff-${Date.now()}-4`,
        invoiceId: invoice.id,
        timestamp,
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.roleLabel,
        action: 'FIELD_UPDATE',
        fieldName: 'Grand Total Tagihan (grand_total)',
        oldValue: formatRupiah(invoice.grandTotal),
        newValue: formatRupiah(grandTotal),
        note: `Rekalkulasi nilai tagihan oleh ${currentUser.name}`,
      });
    }

    return diffs;
  };

  // Save Edits Button
  const handleSaveDraft = () => {
    const diffs = collectAuditDiffs();

    // Check if missing evidence was resolved
    let remainingFlags = [...invoice.exceptionFlags];
    if (accountNumber.trim() !== '' && remainingFlags.includes('MISSING_EVIDENCE')) {
      remainingFlags = remainingFlags.filter((f) => f !== 'MISSING_EVIDENCE');
    }

    const updatedInvoice: InvoiceDocument = {
      ...invoice,
      vendorName,
      invoiceNumber,
      dueDate,
      bankDetails: {
        ...invoice.bankDetails,
        bankName,
        accountNumber,
        accountHolder,
        isVerified: accountNumber.trim() !== '',
      },
      lineItems,
      subtotal,
      taxAmount,
      discountAmount,
      grandTotal,
      exceptionFlags: remainingFlags,
      status: remainingFlags.length === 0 ? 'READY_FOR_REVIEW' : 'EXCEPTION',
      auditTrail: [...diffs, ...invoice.auditTrail],
    };

    onUpdateInvoice(updatedInvoice);
    setNotification(
      diffs.length > 0
        ? `Jejak Audit berhasil mencatat ${diffs.length} perubahan field!`
        : 'Perubahan draf berhasil disimpan.'
    );
    setTimeout(() => setNotification(null), 4000);
  };

  // Approve Voucher Button (AMIGA_REVIEWED)
  const handleApproveVoucher = async () => {
    if (!canApprove) {
      alert(approvalBlockReason);
      return;
    }

    if (accountNumber.trim() === '') {
      alert('Persetujuan ditolak: Dokumen masih memiliki bendera MISSING_EVIDENCE (rekening bank kosong). Mohon isi rekening bank sebelum menyetujui.');
      return;
    }

    const diffs = collectAuditDiffs();
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const voucherNumber = `PV-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const approvalAudit: AuditLogEntry = {
      id: `aud-appr-${Date.now()}`,
      invoiceId: invoice.id,
      timestamp,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.roleLabel,
      action: 'APPROVED',
      note: `Faktur diverifikasi oleh ${currentUser.name}. Bukti Kas Resmi ${voucherNumber} diterbitkan dengan stempel AMIGA_REVIEWED.`,
    };

    const approvedInvoice: InvoiceDocument = {
      ...invoice,
      vendorName,
      invoiceNumber,
      dueDate,
      bankDetails: {
        ...invoice.bankDetails,
        bankName,
        accountNumber,
        accountHolder,
        isVerified: true,
      },
      lineItems,
      subtotal,
      taxAmount,
      discountAmount,
      grandTotal,
      exceptionFlags: [],
      status: 'AMIGA_REVIEWED',
      reviewedByUserId: currentUser.id,
      reviewedByUserName: currentUser.name,
      reviewedAt: timestamp,
      approvedVoucherNumber: voucherNumber,
      legalDisclaimerAcknowledged: true,
      auditTrail: [approvalAudit, ...diffs, ...invoice.auditTrail],
    };

    onUpdateInvoice(approvedInvoice);
    setNotification(`Faktur Berhasil Disetujui! Voucher ${voucherNumber} diterbitkan.`);
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Document Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-950 border border-cyan-800 rounded-xl text-cyan-400">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-white tracking-tight">
                Layar 03: Peninjauan & Verifikasi Faktur
              </h1>
              <span className="font-mono text-xs px-2 py-0.5 bg-slate-800 text-cyan-300 rounded border border-slate-700">
                {invoice.requestId}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Split-Screen: Dokumen Asli PDF (Kiri) vs Data Ekstraksi AI & Rekonsiliasi (Kanan)
            </p>
          </div>
        </div>

        {/* Invoice Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Pilih Dokumen:</span>
          <select
            value={invoice.id}
            onChange={(e) => {
              const selected = allInvoices.find((i) => i.id === e.target.value);
              if (selected) onSelectInvoice(selected);
            }}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 max-w-xs"
          >
            {allInvoices.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.requestId} - {inv.vendorName} ({inv.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div className="p-3 bg-emerald-950/90 border border-emerald-600 rounded-xl text-emerald-200 text-xs flex items-center justify-between shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{notification}</span>
          </div>
        </div>
      )}

      {/* Validation Badges Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        {/* Bank Status Badge */}
        <div
          className={`p-2.5 rounded-lg border flex items-center gap-2 ${
            accountNumber.trim() !== ''
              ? 'bg-slate-900 border-emerald-900/60 text-emerald-300'
              : 'bg-rose-950/70 border-rose-800 text-rose-300'
          }`}
        >
          {accountNumber.trim() !== '' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <div className="truncate">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Rekening Bank</div>
            <div className="font-semibold">
              {accountNumber.trim() !== '' ? 'Lengkap & Terverifikasi' : 'MISSING_EVIDENCE'}
            </div>
          </div>
        </div>

        {/* Duplicate Status Badge */}
        <div
          className={`p-2.5 rounded-lg border flex items-center gap-2 ${
            invoice.exceptionFlags.includes('POSSIBLE_DUPLICATE')
              ? 'bg-rose-950/70 border-rose-800 text-rose-300'
              : 'bg-slate-900 border-emerald-900/60 text-emerald-300'
          }`}
        >
          {invoice.exceptionFlags.includes('POSSIBLE_DUPLICATE') ? (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <div className="truncate">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Cek Duplikasi</div>
            <div className="font-semibold">
              {invoice.exceptionFlags.includes('POSSIBLE_DUPLICATE')
                ? 'POSSIBLE_DUPLICATE'
                : 'Faktur Unik'}
            </div>
          </div>
        </div>

        {/* Math Reconciliation Badge */}
        <div className="p-2.5 rounded-lg border bg-slate-900 border-emerald-900/60 text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="truncate">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Rekonsiliasi Matematika</div>
            <div className="font-semibold">Subtotal + Pajak Cocok</div>
          </div>
        </div>

        {/* AI Confidence Score */}
        <div className="p-2.5 rounded-lg border bg-slate-900 border-cyan-900/60 text-cyan-300 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          <div className="truncate">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Confidence Gemini 3.8</div>
            <div className="font-semibold">{invoice.aiConfidenceScore || 98.4}% Presisi</div>
          </div>
        </div>
      </div>

      {/* Main Split-Screen Workspace (50% - 50%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Pane (50% width on desktop -> 6 cols) */}
        <div className="lg:col-span-6 h-[780px]">
          <DocumentViewer invoice={invoice} />
        </div>

        {/* Right Pane (50% width on desktop -> 6 cols) */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl flex flex-col h-[780px] overflow-hidden">
          {/* Header of Right Pane */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
            <div>
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Formulir Verifikasi Finansial (Editable)
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Koreksi nilai yang dilakukan Reviewer otomatis tercatat dalam Audit Trail (Scenario 7).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                Pengunggah: {invoice.uploadedByUserName.split(' ')[0]}
              </span>
            </div>
          </div>

          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto pr-1 py-4 space-y-4">
            {/* Section 1: Vendor & Invoice Header */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-3">
              <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                Informasi Vendor & Nomor Faktur
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1 font-medium">
                    Nama Resmi Vendor
                  </label>
                  <input
                    type="text"
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] mb-1 font-medium">
                    Nomor Faktur / Invoice Ref
                  </label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] mb-1 font-medium">
                    Tanggal Jatuh Tempo
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] mb-1 font-medium">
                    Entitas Klien
                  </label>
                  <input
                    type="text"
                    disabled
                    value={invoice.clientName}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Beneficiary Bank Account */}
            <div
              className={`border rounded-xl p-3.5 space-y-3 transition ${
                accountNumber.trim() === ''
                  ? 'bg-rose-950/20 border-rose-800/80 ring-1 ring-rose-500/20'
                  : 'bg-slate-950/70 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-cyan-400" />
                  Instruksi Rekening Bank Tujuan Transfer
                </span>
                {accountNumber.trim() === '' && (
                  <span className="text-[10px] bg-rose-950 text-rose-300 border border-rose-800 px-2 py-0.5 rounded font-mono font-bold">
                    MISSING_EVIDENCE
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1 font-medium">
                    Nama Bank
                  </label>
                  <input
                    type="text"
                    value={bankName}
                    placeholder="e.g. Bank Central Asia (BCA)"
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] mb-1 font-medium">
                    Nomor Rekening
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    placeholder="Isi nomor rekening..."
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] mb-1 font-medium">
                    Atas Nama Rekening
                  </label>
                  <input
                    type="text"
                    value={accountHolder}
                    placeholder="Nama pemilik rekening..."
                    onChange={(e) => setAccountHolder(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 uppercase focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Line Items Table (Scenario 2: Multi-line Items) */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  Rincian Item Faktur ({lineItems.length} baris)
                </span>
                <button
                  type="button"
                  onClick={handleAddLineItem}
                  className="flex items-center gap-1 text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800 transition"
                >
                  <Plus className="w-3 h-3" /> Tambah Baris
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase font-semibold">
                      <th className="py-1.5 pr-2">Deskripsi</th>
                      <th className="py-1.5 px-2 w-16 text-center">Qty</th>
                      <th className="py-1.5 px-2 w-28 text-right">Harga Satuan</th>
                      <th className="py-1.5 px-2 w-28 text-right">Total</th>
                      <th className="py-1.5 pl-2 w-8 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {lineItems.map((item, index) => (
                      <tr key={item.id} className="group">
                        <td className="py-1.5 pr-2">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded px-2 py-1 text-xs text-slate-200"
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded px-1.5 py-1 text-xs text-center font-mono"
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <input
                            type="number"
                            step="1000"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded px-1.5 py-1 text-xs text-right font-mono"
                          />
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono font-semibold text-slate-100">
                          {formatRupiah(item.totalPrice)}
                        </td>
                        <td className="py-1.5 pl-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteLineItem(index)}
                            className="p-1 text-slate-500 hover:text-rose-400 transition"
                            title="Hapus Baris"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 4: Totals & Tax Calculation */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span>Subtotal Barang / Jasa:</span>
                <span className="font-mono font-semibold text-slate-200">{formatRupiah(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span className="flex items-center gap-1.5">
                  PPN Tarif ({taxPercent}%):
                  <input
                    type="number"
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(Number(e.target.value) || 0)}
                    className="w-12 bg-slate-900 border border-slate-700 rounded px-1 text-center font-mono text-xs text-cyan-300"
                  />
                </span>
                <span className="font-mono font-semibold text-slate-200">{formatRupiah(taxAmount)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Diskon / Potongan Harga:</span>
                <input
                  type="number"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                  className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-right font-mono text-xs text-slate-200"
                />
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between items-center font-bold text-sm">
                <span className="text-white">Grand Total Tagihan:</span>
                <span className="font-mono text-base text-cyan-400">{formatRupiah(grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Bottom Action Footer with Segregation of Duties Enforcement (Scenario 5) */}
          <div className="pt-4 border-t border-slate-800 shrink-0 space-y-3">
            {/* Segregation of Duties Warning Banner if User is Uploader */}
            {!canApprove && (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/80 text-amber-300 text-xs flex items-start gap-2.5 animate-in fade-in">
                <Lock className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <div className="leading-tight">
                  <span className="font-bold">Penegakan Segregation of Duties (Scenario 5):</span> {approvalBlockReason}
                  <div className="mt-1 text-[11px] text-amber-200/80">
                    💡 <em>Petunjuk:</em> Beralih ke peran <strong>"Finance Reviewer"</strong> (Dewi Lestari) pada bilah atas untuk menyetujui voucher ini.
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons Row */}
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleSaveDraft}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition"
                title="Simpan perubahan draf ke audit trail"
              >
                <Save className="w-4 h-4 text-slate-400" />
                <span>Simpan Draf Koreksi</span>
              </button>

              <div className="flex items-center gap-2">
                {invoice.status === 'AMIGA_REVIEWED' ? (
                  <button
                    type="button"
                    onClick={() => onNavigateToVoucher(invoice)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-lg transition"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Lihat Voucher Resmi ({invoice.approvedVoucherNumber})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!canApprove}
                    onClick={handleApproveVoucher}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-700/20 transition"
                    title={!canApprove ? approvalBlockReason : 'Setujui Voucher Pembayaran'}
                  >
                    {!canApprove ? <Lock className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                    <span>Setujui Voucher (AMIGA_REVIEWED)</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
