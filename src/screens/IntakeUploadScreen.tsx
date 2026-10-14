/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  UploadCloud,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Building,
  Calendar,
  Send,
  Zap,
  Check,
  FileCheck,
} from 'lucide-react';
import { UserProfile, InvoiceDocument, InvoiceStatus, ExceptionFlag } from '../types';
import { extractInvoice, validateInvoiceData } from '../services/api';

interface IntakeUploadScreenProps {
  currentUser: UserProfile;
  existingInvoices: InvoiceDocument[];
  onInvoiceCreated: (newInvoice: InvoiceDocument) => void;
  onNavigateToReview: (invoice: InvoiceDocument) => void;
}

export const IntakeUploadScreen: React.FC<IntakeUploadScreenProps> = ({
  currentUser,
  existingInvoices,
  onInvoiceCreated,
  onNavigateToReview,
}) => {
  // Form State
  const [clientName, setClientName] = useState(
    currentUser.clientId.startsWith('CLIENT') ? currentUser.clientName : 'PT Maju Jaya'
  );
  const [clientId, setClientId] = useState(
    currentUser.clientId.startsWith('CLIENT') ? currentUser.clientId : 'CLIENT-001'
  );
  const [requestType, setRequestType] = useState<'PEMBAYARAN_REGULER' | 'REIMBURSEMENT_URGENT' | 'KONTRAK_BERKALA'>('PEMBAYARAN_REGULER');
  const [intakeChannel, setIntakeChannel] = useState<'EMAIL' | 'WHATSAPP' | 'PORTAL'>('PORTAL');
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    size: string;
    hint: string;
  }>({
    name: 'Invoice_SuryaMandiri_SM089.pdf',
    size: '1.2 MB',
    hint: 'standard',
  });

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [createdInvoice, setCreatedInvoice] = useState<InvoiceDocument | null>(null);

  // Pre-built samples for Demo Day quick-testing
  const samplePills = [
    {
      label: 'Sample 1: Normal Flow',
      fileName: 'Invoice_SuryaMandiri_SM089.pdf',
      size: '1.2 MB',
      hint: 'standard',
      desc: 'PT Surya Mandiri Logistik (2 item, Bank BCA Lengkap)',
    },
    {
      label: 'Sample 2: Multi-line Items',
      fileName: 'Invoice_TechCitra_TCS144_MultiItem.pdf',
      size: '2.1 MB',
      hint: 'multi',
      desc: 'PT Tech Citra Solusi (4 item hardware & jasa)',
    },
    {
      label: 'Sample 3: Missing Bank Account',
      fileName: 'Invoice_MitraGraha_NoBank.pdf',
      size: '950 KB',
      hint: 'nobank',
      desc: 'PT Mitra Graha Semesta (Kolom rekening kosong -> EXCEPTION)',
    },
    {
      label: 'Sample 4: Possible Duplicate',
      fileName: 'Invoice_GlobalLogistik_GL994_Dup.pdf',
      size: '1.4 MB',
      hint: 'duplicate',
      desc: 'Faktur GL-994 sudah pernah diproses -> EXCEPTION',
    },
  ];

  const handleSelectSample = (sample: (typeof samplePills)[0]) => {
    setSelectedFile({
      name: sample.fileName,
      size: sample.size,
      hint: sample.hint,
    });
  };

  const handleCustomFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setSelectedFile({
        name: f.name,
        size: `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
        hint: f.name.toLowerCase().includes('multi')
          ? 'multi'
          : f.name.toLowerCase().includes('nobank')
          ? 'nobank'
          : 'standard',
      });
    }
  };

  const handleStartProcessing = async () => {
    setIsProcessing(true);
    setCreatedInvoice(null);
    setCurrentStep(1);

    // Step 1: Generate Request ID & Initial State
    const randId = Math.floor(100 + Math.random() * 900);
    const requestId = `REQ-2026-0312-${randId}`;
    const invoiceId = `inv-new-${Date.now()}`;
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

    await new Promise((r) => setTimeout(r, 600));
    setCurrentStep(2); // AI Multimodal Extraction

    // Step 2: Trigger AI Extraction
    let extraction = await extractInvoice({
      hint: selectedFile.hint,
      clientId,
      clientName,
      uploadedBy: currentUser,
    });

    // If duplicate test sample is chosen, simulate duplicate vendor & inv number
    if (selectedFile.hint === 'duplicate') {
      extraction = {
        ...extraction,
        vendorName: 'PT Global Logistik Nusantara',
        invoiceNumber: 'INV-2026/GL-994',
      };
    }

    await new Promise((r) => setTimeout(r, 800));
    setCurrentStep(3); // Business Rules & Policy Validation

    // Step 3: Run Validation
    const validation = validateInvoiceData(extraction, existingInvoices, invoiceId);

    // If duplicate hint
    let finalFlags: ExceptionFlag[] = [...validation.flags];
    let exceptionNote: string | undefined = undefined;

    if (selectedFile.hint === 'duplicate') {
      if (!finalFlags.includes('POSSIBLE_DUPLICATE')) {
        finalFlags.push('POSSIBLE_DUPLICATE');
      }
      exceptionNote = 'Duplikasi Terdeteksi! Kombinasi Vendor & Nomor Faktur telah tercatat sebelumnya di database AMIGA.';
    } else if (finalFlags.includes('MISSING_EVIDENCE')) {
      exceptionNote = 'Nomor rekening bank tujuan tidak ditemukan pada faktur fisik.';
    }

    const finalStatus: InvoiceStatus = finalFlags.length > 0 ? 'EXCEPTION' : 'READY_FOR_REVIEW';

    await new Promise((r) => setTimeout(r, 600));
    setCurrentStep(4); // Finalizing & Assembly

    // Assemble new invoice document
    const newDoc: InvoiceDocument = {
      id: invoiceId,
      requestId,
      invoiceNumber: extraction.invoiceNumber,
      vendorName: extraction.vendorName,
      vendorTaxId: '01.234.567.8-011.000',
      vendorAddress: 'Kawasan Industri Bisnis Terpadu, Jakarta',
      clientId,
      clientName,
      intakeChannel,
      requestType,
      uploadDate: timestamp,
      dueDate: extraction.dueDate || '2026-03-31',
      deadlineSLA: finalStatus === 'EXCEPTION' ? 'Hold / Exception' : '2 Jam Tersisa',
      uploadedByUserId: currentUser.id,
      uploadedByUserName: `${currentUser.name} (${currentUser.roleLabel})`,
      status: finalStatus,
      exceptionFlags: finalFlags,
      exceptionNote,
      currency: 'IDR',
      lineItems: extraction.lineItems,
      subtotal: extraction.subtotal,
      taxAmount: extraction.taxAmount,
      discountAmount: extraction.discountAmount,
      grandTotal: extraction.grandTotal,
      bankDetails: extraction.bankDetails,
      fileName: selectedFile.name,
      fileSize: selectedFile.size,
      fileType: 'application/pdf',
      aiConfidenceScore: extraction.confidenceScore || 98.4,
      aiProcessingTimeMs: 1450,
      aiExtractedAt: timestamp,
      auditTrail: [
        {
          id: `aud-reg-${Date.now()}`,
          invoiceId,
          timestamp,
          actorId: currentUser.id,
          actorName: currentUser.name,
          actorRole: currentUser.roleLabel,
          action: 'DOCUMENT_UPLOADED',
          note: `Dokumen faktur diunggah via saluran ${intakeChannel}. Jenis pengajuan: ${requestType}.`,
        },
        {
          id: `aud-ai-${Date.now() + 1}`,
          invoiceId,
          timestamp,
          actorId: 'system_ai',
          actorName: 'AMIGA Gemini Robot OCR',
          actorRole: 'AI Agent Engine',
          action: 'AI_EXTRACTED',
          note: `Ekstraksi multimodal Gemini 3.8 Flash selesai (Confidence: ${extraction.confidenceScore}%). Subtotal: Rp ${extraction.subtotal.toLocaleString('id-ID')}.`,
        },
        ...(finalFlags.length > 0
          ? [
              {
                id: `aud-flag-${Date.now() + 2}`,
                invoiceId,
                timestamp,
                actorId: 'system_ai',
                actorName: 'AMIGA Rule Validator',
                actorRole: 'System Engine',
                action: 'FLAG_EXCEPTION',
                note: `EXCEPTION ditandai: ${finalFlags.join(', ')}. ${exceptionNote || ''}`,
              },
            ]
          : [
              {
                id: `aud-pass-${Date.now() + 2}`,
                invoiceId,
                timestamp,
                actorId: 'system_ai',
                actorName: 'AMIGA Rule Validator',
                actorRole: 'System Engine',
                action: 'VALIDATION_PASSED',
                note: 'Seluruh 7 validasi akuntansi lolos. Dokumen siap diverifikasi (READY_FOR_REVIEW).',
              },
            ]),
      ],
    };

    onInvoiceCreated(newDoc);
    setCreatedInvoice(newDoc);
    setIsProcessing(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-extrabold text-white tracking-tight">
            Layar 02: Layar Pengunggahan Dokumen (Document Intake & Upload)
          </h1>
          <span className="px-2 py-0.5 text-xs font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800 rounded">
            OCR & Multimodal AI
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Unggah berkas faktur fisik atau pilih berkas uji coba skenario Demo Day. AMIGA Robot Admin akan mengekstrak entitas finansial dan memvalidasi kelengkapan secara otomatis.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Intake Metadata Form */}
        <div className="md:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
          <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
            <Building className="w-4 h-4 text-cyan-400" />
            Metadata Pengajuan
          </h2>

          {/* Client Selection */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Entitas Klien
            </label>
            <select
              value={clientId}
              onChange={(e) => {
                const id = e.target.value;
                setClientId(id);
                setClientName(id === 'CLIENT-001' ? 'PT Maju Jaya' : 'PT Nusantara Sejahtera');
              }}
              disabled={currentUser.clientId.startsWith('CLIENT')}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <option value="CLIENT-001">PT Maju Jaya (CLIENT-001)</option>
              <option value="CLIENT-002">PT Nusantara Sejahtera (CLIENT-002)</option>
            </select>
          </div>

          {/* Request Type */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Jenis Pengajuan
            </label>
            <select
              value={requestType}
              onChange={(e) => setRequestType(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="PEMBAYARAN_REGULER">Pembayaran Vendor Reguler</option>
              <option value="REIMBURSEMENT_URGENT">Reimbursement Urgent</option>
              <option value="KONTRAK_BERKALA">Kontrak Berkala / Retainer</option>
            </select>
          </div>

          {/* Intake Channel */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Saluran Penerimaan
            </label>
            <select
              value={intakeChannel}
              onChange={(e) => setIntakeChannel(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="PORTAL">Portal Klien Mandiri</option>
              <option value="EMAIL">Email (finance-intake@amiga.id)</option>
              <option value="WHATSAPP">WhatsApp Business API</option>
            </select>
          </div>

          {/* Pengunggah Aktif */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs space-y-1">
            <div className="text-[11px] text-slate-400">Pengunggah Aktif (Logged-in):</div>
            <div className="font-semibold text-slate-200">{currentUser.name}</div>
            <div className="text-[10px] text-cyan-400 font-mono">{currentUser.roleLabel}</div>
            {currentUser.id === 'user_a' && (
              <div className="text-[10px] text-amber-400 mt-1">
                ⚠️ Menguji Scenario 5: Dokumen yang Anda unggah akan menguji larangan persetujuan sendiri (SoD).
              </div>
            )}
          </div>

          {/* Catatan */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Catatan Pengaju (Opsional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tambahkan referensi PO atau catatan khusus jika ada..."
              rows={2}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
            />
          </div>
        </div>

        {/* Right Column: File Upload Dropzone & Demo Presets */}
        <div className="md:col-span-2 space-y-4">
          {/* Quick Preset Selector for Judges */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400" />
                Pilih Berkas Uji Coba Cepat (Demo Day Presets)
              </span>
              <span className="text-[10px] text-slate-400">1-Klik Ekstraksi</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {samplePills.map((sample, idx) => {
                const isSelected = selectedFile.name === sample.fileName;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSample(sample)}
                    className={`text-left p-3 rounded-lg border text-xs transition ${
                      isSelected
                        ? 'bg-cyan-950/70 border-cyan-500 ring-1 ring-cyan-500/40 text-white'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-100">{sample.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{sample.desc}</p>
                    <div className="flex items-center gap-2 mt-2 font-mono text-[10px] text-slate-500">
                      <span>📄 {sample.fileName}</span>
                      <span>({sample.size})</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Drag & Drop Upload Zone */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center shadow-xl relative overflow-hidden">
            <input
              type="file"
              id="file-upload"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleCustomFileUpload}
              className="hidden"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer block border-2 border-dashed border-slate-700 hover:border-cyan-500/80 rounded-xl p-6 transition group bg-slate-950/40"
            >
              <div className="w-12 h-12 rounded-xl bg-cyan-950/80 text-cyan-400 flex items-center justify-center mx-auto mb-3 border border-cyan-800 group-hover:scale-105 transition-transform">
                <UploadCloud className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-white">
                Tarik Berkas Invoice PDF ke Sini atau Klik untuk Telusuri
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Format didukung: PDF, PNG, JPG (Maksimal 10 MB per dokumen)
              </p>
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-cyan-300">
                <FileText className="w-3.5 h-3.5" />
                <span>Berkas Terpilih: {selectedFile.name}</span>
                <span className="text-slate-500">({selectedFile.size})</span>
              </div>
            </label>

            {/* Action Button */}
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleStartProcessing}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-600/30 transition cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Robot AI Sedang Memproses Dokumen...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Proses Ekstraksi Otomatis dengan Robot AI</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Progress & Live Execution Step Visualizer */}
      {(isProcessing || createdInvoice) && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Siklus Alur Robotika AMIGA (State Machine Transitions)
            </span>
            {createdInvoice && (
              <span
                className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                  createdInvoice.status === 'READY_FOR_REVIEW'
                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                    : 'bg-rose-950 text-rose-300 border border-rose-800'
                }`}
              >
                STATUS AKHIR: {createdInvoice.status}
              </span>
            )}
          </div>

          {/* Stepper */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            {/* Step 1 */}
            <div
              className={`p-3 rounded-lg border transition ${
                currentStep >= 1
                  ? 'bg-slate-950 border-cyan-700/80 text-white'
                  : 'bg-slate-950/40 border-slate-800 text-slate-500'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[10px] text-cyan-400">FASE 1</span>
                {currentStep > 1 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : currentStep === 1 ? (
                  <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                ) : null}
              </div>
              <p className="font-semibold">Registrasi Intake</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Status: QUEUED</p>
            </div>

            {/* Step 2 */}
            <div
              className={`p-3 rounded-lg border transition ${
                currentStep >= 2
                  ? 'bg-slate-950 border-cyan-700/80 text-white'
                  : 'bg-slate-950/40 border-slate-800 text-slate-500'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[10px] text-cyan-400">FASE 2</span>
                {currentStep > 2 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : currentStep === 2 ? (
                  <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                ) : null}
              </div>
              <p className="font-semibold">Gemini 3.8 Flash OCR</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Status: PROCESSING</p>
            </div>

            {/* Step 3 */}
            <div
              className={`p-3 rounded-lg border transition ${
                currentStep >= 3
                  ? 'bg-slate-950 border-cyan-700/80 text-white'
                  : 'bg-slate-950/40 border-slate-800 text-slate-500'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[10px] text-cyan-400">FASE 3</span>
                {currentStep > 3 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : currentStep === 3 ? (
                  <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                ) : null}
              </div>
              <p className="font-semibold">7 Aturan Validasi</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Rekonsiliasi & Duplikasi</p>
            </div>

            {/* Step 4 */}
            <div
              className={`p-3 rounded-lg border transition ${
                currentStep >= 4
                  ? 'bg-slate-950 border-cyan-700/80 text-white'
                  : 'bg-slate-950/40 border-slate-800 text-slate-500'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[10px] text-cyan-400">FASE 4</span>
                {currentStep === 4 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              </div>
              <p className="font-semibold">Routing Dokumen</p>
              <p className="text-[10px] text-slate-400 mt-0.5">READY atau EXCEPTION</p>
            </div>
          </div>

          {/* Success summary & direct navigate button */}
          {createdInvoice && (
            <div className="mt-4 p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-cyan-400">
                    {createdInvoice.requestId}
                  </span>
                  <span className="text-slate-400">|</span>
                  <span className="font-semibold text-white">{createdInvoice.vendorName}</span>
                  <span className="text-slate-400">({createdInvoice.invoiceNumber})</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Grand Total: <strong>Rp {createdInvoice.grandTotal.toLocaleString('id-ID')}</strong> ({createdInvoice.lineItems.length} baris item).
                  {createdInvoice.exceptionFlags.length > 0 ? (
                    <span className="text-rose-400 ml-1">
                      ⚠️ Ditahan: {createdInvoice.exceptionFlags.join(', ')}
                    </span>
                  ) : (
                    <span className="text-emerald-400 ml-1">
                      ✓ Validasi lolos, siap diverifikasi.
                    </span>
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onNavigateToReview(createdInvoice)}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg shadow-md transition flex items-center gap-2 shrink-0"
              >
                <span>Buka Layar Peninjauan</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
