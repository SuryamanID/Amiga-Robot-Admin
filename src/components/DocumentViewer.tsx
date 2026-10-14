/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  FileText,
  Code,
  ShieldCheck,
  Building2,
  CreditCard,
  Layers,
  Sparkles,
} from 'lucide-react';
import { InvoiceDocument } from '../types';
import { formatRupiah } from '../services/api';

interface DocumentViewerProps {
  invoice: InvoiceDocument;
  onHighlightField?: (field: string) => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({ invoice }) => {
  const [zoom, setZoom] = useState<number>(100);
  const [showOverlays, setShowOverlays] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'document' | 'raw_json'>('document');

  return (
    <div className="flex flex-col h-full bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 text-xs text-slate-300">
        <div className="flex items-center space-x-2">
          <span className="flex items-center gap-1.5 font-medium text-cyan-400">
            <FileText className="w-4 h-4" />
            {invoice.fileName}
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">{invoice.fileSize}</span>
        </div>

        <div className="flex items-center space-x-2">
          {/* View Mode Toggle */}
          <div className="flex bg-slate-900 border border-slate-700/60 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('document')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                viewMode === 'document'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Pratinjau PDF
            </button>
            <button
              type="button"
              onClick={() => setViewMode('raw_json')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-all ${
                viewMode === 'raw_json'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              Payload JSON
            </button>
          </div>

          {viewMode === 'document' && (
            <>
              {/* Highlight Overlay Toggle */}
              <button
                type="button"
                onClick={() => setShowOverlays(!showOverlays)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
                  showOverlays
                    ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                    : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-300'
                }`}
                title="Sorot Area Deteksi OCR AI"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Bounding Box OCR</span>
              </button>

              {/* Zoom Controls */}
              <div className="flex items-center space-x-1 bg-slate-800/80 border border-slate-700 rounded-lg px-2 py-0.5">
                <button
                  type="button"
                  onClick={() => setZoom(Math.max(75, zoom - 15))}
                  className="p-1 hover:text-white text-slate-400 transition"
                  title="Perkecil"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="w-10 text-center font-mono text-xs">{zoom}%</span>
                <button
                  type="button"
                  onClick={() => setZoom(Math.min(150, zoom + 15))}
                  className="p-1 hover:text-white text-slate-400 transition"
                  title="Perbesar"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}

          <a
            href={`#download-${invoice.invoiceNumber}`}
            onClick={(e) => {
              e.preventDefault();
              alert(`Mengunduh berkas asli: ${invoice.fileName}`);
            }}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
            title="Unduh Berkas Asli"
          >
            <Download className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Main Preview Container */}
      <div className="flex-1 overflow-auto p-4 flex justify-center items-start bg-slate-950/60">
        {viewMode === 'raw_json' ? (
          <div className="w-full h-full bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-emerald-400 overflow-auto">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800 text-slate-400">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <Sparkles className="w-4 h-4" />
                Gemini 3.8 Flash Multimodal OCR Structured Output
              </span>
              <span>Confidence: {invoice.aiConfidenceScore}%</span>
            </div>
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(
                {
                  requestId: invoice.requestId,
                  vendorName: invoice.vendorName,
                  invoiceNumber: invoice.invoiceNumber,
                  invoiceDate: invoice.uploadDate,
                  dueDate: invoice.dueDate,
                  bankDetails: invoice.bankDetails,
                  subtotal: invoice.subtotal,
                  taxAmount: invoice.taxAmount,
                  discountAmount: invoice.discountAmount,
                  grandTotal: invoice.grandTotal,
                  lineItems: invoice.lineItems,
                  aiMetadata: {
                    confidenceScore: invoice.aiConfidenceScore,
                    processingTimeMs: invoice.aiProcessingTimeMs,
                    extractedAt: invoice.aiExtractedAt,
                  },
                },
                null,
                2
              )}
            </pre>
          </div>
        ) : (
          <div
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
            className="w-[595px] min-h-[842px] bg-white text-slate-900 rounded-lg shadow-2xl p-8 transition-transform duration-150 relative select-none font-sans"
          >
            {/* Watermark / Document Header */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-5 mb-6">
              <div>
                <div className="relative inline-block">
                  <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                    {invoice.vendorName}
                  </h1>
                  {showOverlays && (
                    <div className="absolute -inset-1 border-2 border-dashed border-cyan-500 bg-cyan-500/10 rounded pointer-events-none">
                      <span className="absolute -top-3 left-1 bg-cyan-600 text-white font-mono text-[9px] px-1 rounded">
                        OCR: VENDOR_NAME (99.8%)
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-1 max-w-[320px]">
                  {invoice.vendorAddress || 'Kawasan Industri Terpadu, Jakarta, Indonesia'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  NPWP: {invoice.vendorTaxId || '01.234.567.8-012.000'}
                </p>
              </div>

              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-slate-900 text-white font-bold text-xs uppercase tracking-widest rounded">
                  FAKTUR TAGIHAN
                </span>
                <div className="relative mt-2">
                  <p className="text-sm font-bold text-slate-800">
                    No: <span className="font-mono">{invoice.invoiceNumber}</span>
                  </p>
                  {showOverlays && (
                    <div className="absolute -inset-1 border border-dashed border-purple-500 bg-purple-500/10 rounded pointer-events-none">
                      <span className="absolute -top-3.5 right-1 bg-purple-600 text-white font-mono text-[8px] px-1 rounded">
                        OCR: INVOICE_NO (99.5%)
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-1">Tanggal: {invoice.uploadDate.split(' ')[0]}</p>
                <p className="text-xs font-semibold text-rose-700 mt-0.5">Jatuh Tempo: {invoice.dueDate}</p>
              </div>
            </div>

            {/* Bill To Info */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6 flex justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                  Ditujukan Kepada:
                </p>
                <p className="font-bold text-slate-900 text-sm">{invoice.clientName}</p>
                <p className="text-xs text-slate-600">Finance & Accounts Payable Division</p>
                <p className="text-xs text-slate-500">Jakarta, Indonesia</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                  Ref Intake AMIGA:
                </p>
                <p className="font-mono text-xs font-semibold text-cyan-700">{invoice.requestId}</p>
                <span className="inline-block mt-1 text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                  Saluran: {invoice.intakeChannel}
                </span>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="relative mb-6">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-800 bg-slate-100 text-slate-800 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">No</th>
                    <th className="py-2.5 px-3">Deskripsi Barang / Jasa</th>
                    <th className="py-2.5 px-2 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Harga Satuan</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {invoice.lineItems.map((item, index) => (
                    <tr key={item.id} className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">{index + 1}</td>
                      <td className="py-2 px-3 font-medium text-slate-800">{item.description}</td>
                      <td className="py-2 px-2 text-center font-mono text-slate-700">{item.quantity}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">
                        {formatRupiah(item.unitPrice)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900">
                        {formatRupiah(item.totalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {showOverlays && (
                <div className="absolute -inset-1 border border-dashed border-emerald-500 bg-emerald-500/5 rounded pointer-events-none">
                  <span className="absolute -top-3 left-3 bg-emerald-600 text-white font-mono text-[8px] px-1 rounded">
                    OCR: TABLE_LINE_ITEMS ({invoice.lineItems.length} baris terdeteksi)
                  </span>
                </div>
              )}
            </div>

            {/* Totals & Bank Details Row */}
            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-200">
              {/* Bank Details on Document */}
              <div className="relative bg-slate-50 border border-slate-200 rounded-lg p-3.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-2">
                  <CreditCard className="w-4 h-4 text-cyan-700" />
                  Instruksi Pembayaran Bank
                </div>
                {invoice.bankDetails.accountNumber ? (
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Bank:</span>
                      <span className="font-semibold text-slate-800">{invoice.bankDetails.bankName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">No. Rekening:</span>
                      <span className="font-mono font-bold text-slate-900">{invoice.bankDetails.accountNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Atas Nama:</span>
                      <span className="font-semibold text-slate-800 uppercase">{invoice.bankDetails.accountHolder}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 bg-rose-50 border border-rose-300 rounded text-rose-700 text-xs">
                    <p className="font-bold flex items-center gap-1">
                      ⚠️ Data Rekening Tidak Ditemukan!
                    </p>
                    <p className="text-[11px] mt-0.5">
                      Faktur ini tidak mencantumkan nomor rekening transfer.
                    </p>
                  </div>
                )}

                {showOverlays && invoice.bankDetails.accountNumber && (
                  <div className="absolute -inset-1 border border-dashed border-blue-500 bg-blue-500/10 rounded pointer-events-none">
                    <span className="absolute -top-3 left-2 bg-blue-600 text-white font-mono text-[8px] px-1 rounded">
                      OCR: BANK_REQUISITION (99.1%)
                    </span>
                  </div>
                )}
              </div>

              {/* Summary Calculations */}
              <div className="relative space-y-1.5 text-xs">
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
                  <span>Total Tagihan:</span>
                  <span className="font-mono text-base text-cyan-800">
                    {formatRupiah(invoice.grandTotal)}
                  </span>
                </div>

                {showOverlays && (
                  <div className="absolute -inset-1 border-2 border-amber-500 bg-amber-500/10 rounded pointer-events-none">
                    <span className="absolute -top-3.5 right-1 bg-amber-600 text-white font-mono text-[8px] px-1 rounded">
                      OCR: GRAND_TOTAL (100%)
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Signatures */}
            <div className="mt-12 pt-6 border-t border-slate-200 flex justify-between items-end text-xs text-slate-500">
              <div>
                <p className="font-bold text-slate-700">Catatan:</p>
                <p className="text-[11px]">Pembayaran jatuh tempo dalam 14 hari kerja sejak invoice diterima.</p>
              </div>
              <div className="text-center w-40">
                <div className="h-14 flex items-center justify-center">
                  <div className="text-slate-400 italic text-[11px] border-b border-slate-400 w-full pb-1">
                    [Tanda Tangan & Cap Vendor]
                  </div>
                </div>
                <p className="font-bold text-slate-800 mt-1 uppercase">{invoice.vendorName}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
