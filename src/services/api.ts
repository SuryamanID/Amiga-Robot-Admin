/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { InvoiceDocument, ExtractionResult, ExceptionFlag, AuditLogEntry, UserProfile } from '../types';
import { extractInvoiceWithGemini } from './gemini';

/**
 * ARCHITECTURE TOGGLE:
 * Set to `true` when running with the local Python FastAPI backend (http://localhost:8000).
 * Set to `false` for live execution inside the AI Studio web preview environment using Gemini directly.
 */
export const USE_PYTHON_BACKEND = false;
export const PYTHON_BACKEND_URL = 'http://localhost:8000';

export interface ExtractInvoicePayload {
  fileData?: { base64: string; mimeType: string };
  hint?: string;
  clientId: string;
  clientName: string;
  uploadedBy: UserProfile;
}

export interface ReviewInvoicePayload {
  invoiceId: string;
  action: 'APPROVE' | 'REJECT' | 'UPDATE_FIELDS';
  reviewer: UserProfile;
  updatedFields?: Partial<InvoiceDocument>;
  rejectionReason?: string;
  notes?: string;
}

/**
 * 1. POST /api/invoices/extract
 * Extracts vendor invoice metadata using multimodal AI or Python backend
 */
export async function extractInvoice(payload: ExtractInvoicePayload): Promise<ExtractionResult> {
  if (USE_PYTHON_BACKEND) {
    try {
      const response = await fetch(`${PYTHON_BACKEND_URL}/api/invoices/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(`Python API error: ${response.statusText}`);
      }
      return await response.json();
    } catch (err) {
      console.error('Python backend request failed, falling back to client-side Gemini:', err);
    }
  }

  // Preview mode: Direct Gemini API extraction
  return await extractInvoiceWithGemini(payload.fileData, payload.hint);
}

/**
 * 2. POST /api/invoices/validate
 * Validates extracted invoice data against business rules:
 * - Scenario 3: Missing evidence (bank account null/empty)
 * - Scenario 4: Duplicate detection (vendor_name + invoice_number in existing database)
 * - Mathematical consistency (sum of line items == subtotal, subtotal + tax - discount == grand total)
 */
export function validateInvoiceData(
  data: ExtractionResult,
  existingInvoices: InvoiceDocument[],
  currentInvoiceId?: string
): {
  flags: ExceptionFlag[];
  notes: string[];
  isValid: boolean;
} {
  const flags: ExceptionFlag[] = [];
  const notes: string[] = [];

  // Check 1: Missing Evidence (Bank account details)
  const bankAcc = data.bankDetails?.accountNumber?.trim();
  const bankName = data.bankDetails?.bankName?.trim();
  if (!bankAcc || bankAcc === '' || !bankName || bankName === '') {
    flags.push('MISSING_EVIDENCE');
    notes.push('Rekening bank atau nama bank tujuan tidak ditemukan pada faktur pendukung (MISSING_EVIDENCE).');
  }

  // Check 2: Possible Duplicate Detection
  // Matches vendor name (case insensitive) and invoice number (case insensitive)
  const normalizedVendor = (data.vendorName || '').toLowerCase().trim();
  const normalizedInvNum = (data.invoiceNumber || '').toLowerCase().trim();

  const isDuplicate = existingInvoices.some((inv) => {
    if (currentInvoiceId && inv.id === currentInvoiceId) return false;
    const sameVendor = inv.vendorName.toLowerCase().trim() === normalizedVendor;
    const sameInvoice = inv.invoiceNumber.toLowerCase().trim() === normalizedInvNum;
    return sameVendor && sameInvoice;
  });

  if (isDuplicate) {
    flags.push('POSSIBLE_DUPLICATE');
    notes.push(`Faktur dengan Vendor "${data.vendorName}" dan Nomor "${data.invoiceNumber}" sudah pernah diproses sebelumnya dalam sistem (POSSIBLE_DUPLICATE).`);
  }

  // Check 3: Mathematical Consistency
  const sumItems = (data.lineItems || []).reduce((acc, curr) => acc + (curr.totalPrice || 0), 0);
  if (Math.abs(sumItems - data.subtotal) > 5) {
    flags.push('MATH_MISMATCH');
    notes.push(`Selisih matematis: Total baris item (Rp ${sumItems.toLocaleString('id-ID')}) tidak sama dengan subtotal (Rp ${data.subtotal.toLocaleString('id-ID')}).`);
  }

  const expectedGrandTotal = data.subtotal + (data.taxAmount || 0) - (data.discountAmount || 0);
  if (Math.abs(expectedGrandTotal - data.grandTotal) > 5) {
    flags.push('MATH_MISMATCH');
    notes.push(`Selisih rekonsiliasi: Subtotal + Pajak - Diskon (Rp ${expectedGrandTotal.toLocaleString('id-ID')}) tidak sama dengan Grand Total (Rp ${data.grandTotal.toLocaleString('id-ID')}).`);
  }

  return {
    flags,
    notes,
    isValid: flags.length === 0,
  };
}

/**
 * 3. PATCH /api/invoices/:id/review
 * Reviewer action (Approve, Reject, or Edit fields)
 */
export async function submitInvoiceReview(payload: ReviewInvoicePayload): Promise<{
  success: boolean;
  message: string;
  auditLog: AuditLogEntry;
}> {
  if (USE_PYTHON_BACKEND) {
    try {
      const response = await fetch(`${PYTHON_BACKEND_URL}/api/invoices/${payload.invoiceId}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return await response.json();
    } catch (err) {
      console.error('Python backend review failed:', err);
    }
  }

  // Simulated backend response for web preview
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const auditLog: AuditLogEntry = {
    id: `aud-${Date.now()}`,
    invoiceId: payload.invoiceId,
    timestamp,
    actorId: payload.reviewer.id,
    actorName: payload.reviewer.name,
    actorRole: payload.reviewer.roleLabel,
    action: payload.action === 'APPROVE' ? 'APPROVED' : payload.action === 'REJECT' ? 'FLAG_EXCEPTION' : 'FIELD_UPDATE',
    note: payload.notes || (payload.action === 'APPROVE' ? 'Dokumen disetujui & stempel AMIGA_REVIEWED diterbitkan.' : 'Pembaruan data faktur disimpan.'),
  };

  return {
    success: true,
    message: 'Review berhasil diproses',
    auditLog,
  };
}

/**
 * Format currency in Indonesian Rupiah (IDR)
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
