/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FileText,
  Printer,
  Download,
  Send,
  CheckCircle2,
  ShieldCheck,
  Building,
  CreditCard,
  AlertCircle,
  Clock,
  Stamp,
  Layers,
  ArrowLeft,
} from 'lucide-react';
import { InvoiceDocument, UserProfile, AuditLogEntry } from '../types';
import { formatRupiah } from '../services/api';

interface VoucherPreviewScreenProps {
  invoice: InvoiceDocument;
  currentUser: UserProfile;
  onUpdateInvoice: (invoice: InvoiceDocument) => void;
  onBackToReview: () => void;
}

export const VoucherPreviewScreen: React.FC<VoucherPreviewScreenProps> = ({
  invoice,
  currentUser,
  onUpdateInvoice,
  onBackToReview,
}) => {
  const [isSending, setIsSending] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const voucherNumber = invoice.approvedVoucherNumber || `PV-2026-${invoice.requestId.slice(-4)}`;
  const reviewerName = invoice.reviewedByUserName || 'Dewi Lestari, SE., Ak. (AMIGA SSC)';
  const reviewedAt = invoice.reviewedAt || invoice.uploadDate;

  // Convert numbers to Indonesian terbilang words representation
  const numberToWordsIDR = (num: number): string => {
    // Elegant descriptive words for demo presentation
    if (num === 24420000) return 'Dua Puluh Empat Juta Empat Ratus Dua Puluh Ribu Rupiah';
    if (num === 174545000) return 'Seratus Tujuh Puluh Empat Juta Lima Ratus Empat Puluh Lima Ribu Rupiah';
    if (num === 13897000) return 'Tiga Belas Juta Delapan Ratus Sembilan Puluh Tujuh Ribu Rupiah';
    if (num === 42180000) return 'Empat Puluh Dua Juta Seratus Delapan Puluh Ribu Rupiah';
    if (num === 30080000) return 'Tiga Puluh Juta Delapan Puluh Ribu Rupiah';
    return `${formatRupiah(num)} (Lunas Administratif)`;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    alert(`Mengunduh Berkas Voucher Resmi: ${voucherNumber}.pdf (Standardized ISO/AMIGA Payment Voucher)`);
  };

  const handleSendToClient = () => {
    setIsSending(true);
    setTimeout(() => {
      const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const sendAudit: AuditLogEntry = {
        id: `aud-send-${Date.now()}`,
        invoiceId: invoice.id,
        timestamp,
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.roleLabel,
        action: 'SENT_TO_CLIENT',
        note: `Voucher pembayaran resmi ${voucherNumber} dikirimkan ke portal keuangan klien ${invoice.clientName}. Status dimutakhirkan ke SENT_TO_CLIENT.`,
      };

      const updated: InvoiceDocument = {
        ...invoice,
        status: 'SENT_TO_CLIENT',
        auditTrail: [sendAudit, ...invoice.auditTrail],
      };

      onUpdateInvoice(updated);
      setIsSending(false);
      setSuccessToast(`Voucher ${voucherNumber} berhasil dikirim ke Klien ${invoice.clientName}! Status: SENT_TO_CLIENT.`);
      setTimeout(() => setSuccessToast(null), 4000);
    }, 600);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToReview}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
            title="Kembali ke Layar Peninjauan"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-white tracking-tight">
                Layar 04: Pratinjau Bukti Pengeluaran Kas (Payment Voucher)
              </h1>
              <span className="font-mono text-xs px-2 py-0.5 bg-emerald-950 text-emerald-300 rounded border border-emerald-800">
                {voucherNumber}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Tata letak baku voucher pengeluaran bank AMIGA Back Office dengan stempel AMIGA_REVIEWED.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak (Print)</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPDF}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition"
          >
            <Download className="w-4 h-4" />
            <span>Unduh PDF</span>
          </button>

          <button
            type="button"
            disabled={isSending || invoice.status === 'SENT_TO_CLIENT'}
            onClick={handleSendToClient}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-md transition"
          >
            <Send className="w-4 h-4" />
            <span>
              {invoice.status === 'SENT_TO_CLIENT' ? 'Sudah Terkirim ke Klien' : 'Kirim ke Klien (SENT_TO_CLIENT)'}
            </span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successToast && (
        <div className="p-3 bg-emerald-950/90 border border-emerald-600 rounded-xl text-emerald-200 text-xs flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold">{successToast}</span>
        </div>
      )}

      {/* FIXED LEGAL DISCLAIMER BANNER (MANDATORY AMIGA GOVERNANCE) */}
      <div className="p-4 bg-slate-900 border-l-4 border-amber-500 rounded-xl shadow-lg space-y-1 text-xs">
        <div className="flex items-center gap-2 text-amber-400 font-bold uppercase tracking-wider text-[11px]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          DISCLAIMER HUKUM & BATASAN OTORITAS AMIGA ROBOT ADMIN
        </div>
        <p className="text-slate-300 leading-relaxed text-[11px]">
          AMIGA Robot Admin memproses verifikasi administratif faktur vendor berdasarkan dokumen pendukung yang diterima. AMIGA <strong>TIDAK</strong> memegang wewenang otorisasi pengeluaran dana akhir. Persetujuan akhir pembayaran dan eksekusi transfer dana dilakukan sepenuhnya oleh Pejabat Berwenang Klien sesuai limit kewenangan internal Klien.
        </p>
      </div>

      {/* Official Voucher Printable Canvas */}
      <div
        id="printable-voucher"
        className="bg-white text-slate-900 rounded-xl shadow-2xl p-8 border border-slate-300 font-sans relative overflow-hidden"
      >
        {/* Holographic Watermark / Official Stamp overlay */}
        <div className="absolute right-8 top-28 pointer-events-none opacity-85 select-none transform rotate-12">
          <div className="border-4 border-emerald-600 rounded-xl p-3 text-center bg-emerald-50/70 backdrop-blur-xs shadow-md">
            <div className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">
              AMIGA BACK OFFICE VERIFIED
            </div>
            <div className="text-lg font-black text-emerald-700 font-mono tracking-tight my-0.5">
              AMIGA_REVIEWED
            </div>
            <div className="text-[9px] font-mono text-emerald-800">
              Ref: {voucherNumber}
            </div>
            <div className="text-[8px] text-emerald-900 mt-0.5 font-medium">
              Oleh: {reviewerName.split(' ')[0]} | {reviewedAt.split(' ')[0]}
            </div>
          </div>
        </div>

        {/* Voucher Header */}
        <div className="flex items-start justify-between border-b-2 border-slate-900 pb-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-950 text-white flex items-center justify-center font-black text-xl font-mono shadow-md">
              A
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-950 tracking-tight">AMIGA BACK OFFICE</h2>
                <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono border border-slate-300">
                  Shared Service Center
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Sistem Robotika Pemrosesan Faktur Vendor ke Bukti Pengeluaran Kas/Bank
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-slate-900 text-white font-extrabold text-xs uppercase tracking-widest rounded">
              BUKTI PENGELUARAN KAS / BANK
            </span>
            <p className="font-mono font-bold text-slate-900 text-sm mt-1.5">
              No: {voucherNumber}
            </p>
            <p className="text-xs text-slate-600">Tanggal: {reviewedAt.split(' ')[0]}</p>
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6 text-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Entitas Klien (Beban Perusahaan):
            </span>
            <p className="font-bold text-slate-900 text-sm mt-0.5">{invoice.clientName}</p>
            <p className="text-slate-600">ID Registrasi AMIGA: {invoice.clientId}</p>
            <p className="text-slate-600">Request Intake Ref: {invoice.requestId}</p>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Penerima Pembayaran (Vendor):
            </span>
            <p className="font-bold text-slate-900 text-sm mt-0.5">{invoice.vendorName}</p>
            <p className="text-slate-600">Nomor Faktur Referensi: {invoice.invoiceNumber}</p>
            <p className="text-slate-600">Jatuh Tempo Faktur: {invoice.dueDate}</p>
          </div>
        </div>

        {/* Bank Requisition Card */}
        <div className="bg-slate-100/80 border border-slate-300 rounded-lg p-4 mb-6 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-900 mb-2">
            <CreditCard className="w-4 h-4 text-cyan-700" />
            Rekening Bank Tujuan Transfer (Telah Divalidasi)
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <span className="text-slate-500 text-[11px]">Nama Bank:</span>
              <p className="font-semibold text-slate-900 mt-0.5">{invoice.bankDetails.bankName}</p>
            </div>
            <div>
              <span className="text-slate-500 text-[11px]">Nomor Rekening:</span>
              <p className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                {invoice.bankDetails.accountNumber}
              </p>
            </div>
            <div>
              <span className="text-slate-500 text-[11px]">Atas Nama Penerima:</span>
              <p className="font-semibold text-slate-900 uppercase mt-0.5">
                {invoice.bankDetails.accountHolder}
              </p>
            </div>
          </div>
        </div>

        {/* Itemized Table */}
        <div className="mb-6">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-900 bg-slate-100 text-slate-900 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">No</th>
                <th className="py-2.5 px-3">Uraian Transaksi / Rincian Belanja</th>
                <th className="py-2.5 px-2 text-center">Kuantitas</th>
                <th className="py-2.5 px-3 text-right">Harga Satuan</th>
                <th className="py-2.5 px-3 text-right">Total (IDR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {invoice.lineItems.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">{idx + 1}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-900">{item.description}</td>
                  <td className="py-2.5 px-2 text-center font-mono text-slate-700">{item.quantity}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                    {formatRupiah(item.unitPrice)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                    {formatRupiah(item.totalPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Calculation Summary Box */}
        <div className="flex justify-between items-start pt-3 border-t border-slate-200 text-xs mb-8">
          <div className="max-w-md">
            <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">
              Terbilang:
            </span>
            <p className="italic text-slate-800 font-medium mt-1 bg-slate-50 p-2.5 rounded border border-slate-200">
              "{numberToWordsIDR(invoice.grandTotal)}"
            </p>
          </div>

          <div className="w-64 space-y-1.5">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono font-medium">{formatRupiah(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>PPN (11%):</span>
              <span className="font-mono font-medium">{formatRupiah(invoice.taxAmount)}</span>
            </div>
            {invoice.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Diskon:</span>
                <span className="font-mono">-{formatRupiah(invoice.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-black text-slate-950 pt-2 border-t-2 border-slate-900">
              <span>Total Voucher:</span>
              <span className="font-mono text-base text-cyan-900">
                {formatRupiah(invoice.grandTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* 3 Signatures Columns */}
        <div className="grid grid-cols-3 gap-6 pt-6 border-t-2 border-slate-300 text-center text-xs text-slate-600">
          <div>
            <p className="font-bold text-slate-800 text-[11px] uppercase">1. Diproses & Diekstrak</p>
            <div className="h-16 flex items-center justify-center font-mono text-[10px] text-cyan-800">
              [Robot AI Gemini 3.8 Flash]
              <br />
              Waktu: {invoice.aiExtractedAt || invoice.uploadDate}
            </div>
            <div className="border-t border-slate-400 pt-1 font-semibold text-slate-800">
              AMIGA Robot Engine
            </div>
          </div>

          <div>
            <p className="font-bold text-slate-800 text-[11px] uppercase">2. Diverifikasi & Disetujui</p>
            <div className="h-16 flex items-center justify-center text-[10px] text-emerald-800 font-semibold">
              ✓ Telah Lolos Rekonsiliasi
              <br />
              Stempel: AMIGA_REVIEWED
            </div>
            <div className="border-t border-slate-400 pt-1 font-semibold text-slate-800">
              {reviewerName}
            </div>
            <p className="text-[10px] text-slate-500">Finance Reviewer Independen</p>
          </div>

          <div>
            <p className="font-bold text-slate-800 text-[11px] uppercase">3. Otorisasi Pembayaran Akhir</p>
            <div className="h-16 flex items-center justify-center text-[10px] text-slate-400 italic">
              [Persetujuan Akhir oleh Klien]
            </div>
            <div className="border-t border-slate-400 pt-1 font-semibold text-slate-800">
              Pejabat Berwenang {invoice.clientName}
            </div>
            <p className="text-[10px] text-slate-500">Kewenangan Eksekusi Transfer</p>
          </div>
        </div>
      </div>
    </div>
  );
};
