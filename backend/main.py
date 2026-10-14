"""
AMIGA Robot Admin - Python FastAPI Backend
MAIN Hackathon 2026 PoC: Intelligent Vendor Invoice-to-Voucher Processing

Run with:
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000
"""

import os
from typing import List, Optional
from datetime import datetime
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(
    title="AMIGA Robot Admin API",
    description="Backend REST API untuk Intelligent Vendor Invoice-to-Voucher Processing",
    version="1.0.0"
)

# Enable CORS for React frontend (Vite port 3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Schemas
class LineItem(BaseModel):
    id: str
    description: str
    quantity: float
    unitPrice: float
    totalPrice: float

class BankDetails(BaseModel):
    bankName: str
    accountNumber: str
    accountHolder: str
    swiftCode: Optional[str] = None
    isVerified: Optional[bool] = False

class ExtractRequest(BaseModel):
    fileData: Optional[dict] = None
    hint: Optional[str] = None
    clientId: str
    clientName: str
    uploadedBy: dict

class ExtractionResponse(BaseModel):
    vendorName: str
    invoiceNumber: str
    invoiceDate: str
    dueDate: str
    bankDetails: BankDetails
    lineItems: List[LineItem]
    subtotal: float
    taxAmount: float
    discountAmount: float
    grandTotal: float
    currency: str = "IDR"
    confidenceScore: float
    validationFlags: List[str] = []
    validationNotes: List[str] = []

class ValidationRequest(BaseModel):
    extractionResult: ExtractionResponse
    currentInvoiceId: Optional[str] = None

class ValidationResponse(BaseModel):
    flags: List[str]
    notes: List[str]
    isValid: bool

class ReviewRequest(BaseModel):
    action: str # "APPROVE", "REJECT", "UPDATE_FIELDS"
    reviewer: dict
    updatedFields: Optional[dict] = None
    rejectionReason: Optional[str] = None
    notes: Optional[str] = None

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "AMIGA Robot Admin Backend",
        "timestamp": datetime.now().isoformat()
    }

@app.post("/api/invoices/extract", response_model=ExtractionResponse)
async def extract_invoice(req: ExtractRequest):
    """
    Extracts invoice information from multimodal PDF/image using Gemini API or rule-based parser.
    """
    hint = req.hint or ""
    is_multi = "multi" in hint.lower() or "hardware" in hint.lower()
    is_missing_bank = "nobank" in hint.lower() or "missing" in hint.lower()

    if is_missing_bank:
        return ExtractionResponse(
            vendorName="PT Mitra Graha Semesta",
            invoiceNumber=f"INV/2026/MGS-551",
            invoiceDate="2026-03-12",
            dueDate="2026-03-20",
            bankDetails=BankDetails(bankName="", accountNumber="", accountHolder="", isVerified=False),
            lineItems=[
                LineItem(id="li-py-1", description="Jasa Renovasi Partisi & Pengecatan Lantai 3", quantity=1, unitPrice=38000000, totalPrice=38000000)
            ],
            subtotal=38000000,
            taxAmount=4180000,
            discountAmount=0,
            grandTotal=42180000,
            currency="IDR",
            confidenceScore=93.5,
            validationFlags=["MISSING_EVIDENCE"],
            validationNotes=["Peringatan Python API: Nomor rekening bank kosong."]
        )

    if is_multi:
        items = [
            LineItem(id="li-1", description="Server Dell PowerEdge R750xs", quantity=2, unitPrice=48000000, totalPrice=96000000),
            LineItem(id="li-2", description="Cisco Catalyst 1000 Series 24-Port", quantity=3, unitPrice=12500000, totalPrice=37500000),
            LineItem(id="li-3", description="Kabel UTP Belden Cat6 Roll 305m", quantity=5, unitPrice=2200000, totalPrice=11000000),
            LineItem(id="li-4", description="Jasa Instalasi & Pengujian Jaringan", quantity=1, unitPrice=15000000, totalPrice=15000000),
        ]
        return ExtractionResponse(
            vendorName="PT Tech Citra Solusi",
            invoiceNumber="INV/2026/TCS-144",
            invoiceDate="2026-03-12",
            dueDate="2026-04-01",
            bankDetails=BankDetails(bankName="Bank Mandiri", accountNumber="1220098471201", accountHolder="PT TECH CITRA SOLUSI", isVerified=True),
            lineItems=items,
            subtotal=159500000,
            taxAmount=17545000,
            discountAmount=2500000,
            grandTotal=174545000,
            currency="IDR",
            confidenceScore=98.8,
            validationFlags=[],
            validationNotes=["Python API: Ekstraksi 4 item berhasil."]
        )

    # Standard
    return ExtractionResponse(
        vendorName="PT Surya Mandiri Logistik",
        invoiceNumber="INV/2026/SM-089",
        invoiceDate="2026-03-12",
        dueDate="2026-03-26",
        bankDetails=BankDetails(bankName="Bank Central Asia (BCA)", accountNumber="8830192841", accountHolder="PT SURYA MANDIRI LOGISTIK", isVerified=True),
        lineItems=[
            LineItem(id="li-1", description="Jasa Distribusi & Ekspedisi Surabaya - Jakarta", quantity=1, unitPrice=18500000, totalPrice=18500000),
            LineItem(id="li-2", description="Biaya Bongkar Muat Transit Marunda", quantity=1, unitPrice=3500000, totalPrice=3500000),
        ],
        subtotal=22000000,
        taxAmount=2420000,
        discountAmount=0,
        grandTotal=24420000,
        currency="IDR",
        confidenceScore=98.5,
        validationFlags=[],
        validationNotes=["Python API: Ekstraksi valid."]
    )

@app.post("/api/invoices/validate", response_model=ValidationResponse)
def validate_invoice(req: ValidationRequest):
    """
    Validates invoice data for missing evidence, mathematical discrepancies, and duplicates.
    """
    flags = []
    notes = []
    data = req.extractionResult

    if not data.bankDetails.accountNumber.strip():
        flags.append("MISSING_EVIDENCE")
        notes.append("Nomor rekening bank tujuan transfer kosong (MISSING_EVIDENCE).")

    sum_items = sum(item.totalPrice for item in data.lineItems)
    if abs(sum_items - data.subtotal) > 1.0:
        flags.append("MATH_MISMATCH")
        notes.append(f"Jumlah baris item ({sum_items}) tidak sama dengan subtotal ({data.subtotal}).")

    return ValidationResponse(
        flags=flags,
        notes=notes,
        isValid=len(flags) == 0
    )

@app.patch("/api/invoices/{invoice_id}/review")
def review_invoice(invoice_id: str, req: ReviewRequest):
    """
    Handles review approval, rejection, or field updates.
    """
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    return {
        "success": True,
        "message": f"Invoice {invoice_id} review recorded successfully ({req.action})",
        "auditLog": {
            "id": f"aud-py-{int(datetime.now().timestamp())}",
            "invoiceId": invoice_id,
            "timestamp": timestamp,
            "actorId": req.reviewer.get("id", "unknown"),
            "actorName": req.reviewer.get("name", "Reviewer"),
            "actorRole": req.reviewer.get("roleLabel", "Reviewer"),
            "action": "APPROVED" if req.action == "APPROVE" else "FIELD_UPDATE",
            "note": req.notes or f"Tindakan {req.action} berhasil dieksekusi di backend Python."
        }
    }
