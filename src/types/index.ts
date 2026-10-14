/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type InvoiceStatus =
  | 'QUEUED'
  | 'PROCESSING'
  | 'READY_FOR_REVIEW'
  | 'EXCEPTION'
  | 'AMIGA_REVIEWED'
  | 'SENT_TO_CLIENT';

export type ExceptionFlag =
  | 'MISSING_EVIDENCE'
  | 'POSSIBLE_DUPLICATE'
  | 'MATH_MISMATCH'
  | 'EXPIRED_INVOICE'
  | 'SUSPICIOUS_VENDOR'
  | 'POLICY_VIOLATION';

export type UserRole =
  | 'PIC_CLIENT_OWNER'
  | 'PIC_CLIENT_OTHER'
  | 'INTAKE_SUPPORT'
  | 'FINANCE_REVIEWER'
  | 'SERVICE_LEAD'
  | 'SYSTEM_ADMIN';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  roleLabel: string;
  clientId: string; // e.g. "CLIENT-001" (PT Maju Jaya)
  clientName: string;
  email: string;
  avatarColor: string;
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface BankAccountDetails {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  swiftCode?: string;
  isVerified?: boolean;
}

export interface AuditLogEntry {
  id: string;
  invoiceId: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string; // e.g., 'STATUS_CHANGE', 'FIELD_UPDATE', 'AI_EXTRACTED', 'APPROVED'
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  note?: string;
}

export interface InvoiceDocument {
  id: string; // Internal UUID
  requestId: string; // Display ID e.g., REQ-2026-0312-001
  invoiceNumber: string;
  vendorName: string;
  vendorTaxId?: string; // NPWP
  vendorAddress?: string;
  clientId: string;
  clientName: string;
  intakeChannel: 'EMAIL' | 'WHATSAPP' | 'PORTAL';
  requestType: 'PEMBAYARAN_REGULER' | 'REIMBURSEMENT_URGENT' | 'KONTRAK_BERKALA';
  uploadDate: string;
  dueDate: string;
  deadlineSLA: string; // e.g. "2 Jam Tersisa", "4 Jam Tersisa"
  uploadedByUserId: string;
  uploadedByUserName: string;
  status: InvoiceStatus;
  exceptionFlags: ExceptionFlag[];
  exceptionNote?: string;
  
  // Financial Fields
  currency: 'IDR' | 'USD';
  lineItems: LineItem[];
  subtotal: number;
  taxAmount: number; // PPN 11%
  discountAmount: number;
  grandTotal: number;

  // Bank destination
  bankDetails: BankAccountDetails;

  // Review & Approval Metadata
  reviewedByUserId?: string;
  reviewedByUserName?: string;
  reviewedAt?: string;
  approvedVoucherNumber?: string; // e.g. PV-2026-0891
  legalDisclaimerAcknowledged?: boolean;

  // File Reference
  fileUrl?: string;
  fileName: string;
  fileSize: string;
  fileType: string;

  // AI Extraction Metadata
  aiConfidenceScore?: number;
  aiProcessingTimeMs?: number;
  aiExtractedAt?: string;

  // Audit Logs
  auditTrail: AuditLogEntry[];
}

export interface ExtractionResult {
  vendorName: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  bankDetails: BankAccountDetails;
  lineItems: LineItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  grandTotal: number;
  currency: 'IDR';
  confidenceScore: number;
  validationFlags: ExceptionFlag[];
  validationNotes: string[];
}
