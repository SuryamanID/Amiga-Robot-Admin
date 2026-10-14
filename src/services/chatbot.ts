/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from '@google/genai';
import { InvoiceDocument, UserProfile } from '../types';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  invoiceReferenceId?: string;
  suggestions?: string[];
}

export async function askAmigaCopilot(
  userQuery: string,
  chatHistory: ChatMessage[],
  invoices: InvoiceDocument[],
  currentUser: UserProfile
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || '';

  // Prepare active queue summary context for the AI
  const invoiceContext = invoices.map((inv) => ({
    requestId: inv.requestId,
    invoiceNumber: inv.invoiceNumber,
    vendorName: inv.vendorName,
    clientName: inv.clientName,
    status: inv.status,
    grandTotal: inv.grandTotal,
    exceptionFlags: inv.exceptionFlags,
    exceptionNote: inv.exceptionNote,
    bankName: inv.bankDetails.bankName,
    bankAccountNumber: inv.bankDetails.accountNumber ? 'Tersedia' : 'KOSONG',
    uploadedBy: inv.uploadedByUserName,
  }));

  const systemInstruction = `
Anda adalah "AMIGA Robot Copilot", asisten AI percakapan cerdas yang terintegrasi pada sistem AMIGA Robot Admin (MAIN Hackathon 2026: Intelligent Vendor Invoice-to-Voucher Processing).

Konteks Pengguna Saat Ini:
- Nama Pengguna: ${currentUser.name}
- Peran Aktif: ${currentUser.roleLabel} (${currentUser.role})
- Entitas Klien: ${currentUser.clientName}

Konteks Antrean Faktur Saat Ini (${invoices.length} Dokumen):
${JSON.stringify(invoiceContext, null, 2)}

Pedoman dan Aturan Sistem AMIGA:
1. Siklus Hidup Status: QUEUED -> PROCESSING -> READY_FOR_REVIEW / EXCEPTION -> AMIGA_REVIEWED -> SENT_TO_CLIENT.
2. Segregation of Duties (SoD): Pengunggah faktur dilarang keras menyetujui fakturnya sendiri. Hanya Finance Reviewer independen (yang bukan pengunggah) yang boleh memberikan stempel AMIGA_REVIEWED.
3. Multi-Client Isolation: Klien hanya berhak melihat data perusahaannya sendiri.
4. Exception Flags:
   - MISSING_EVIDENCE: Terjadi bila nomor rekening bank atau nama bank penerima kosong pada faktur fisik.
   - POSSIBLE_DUPLICATE: Terjadi bila kombinasi Vendor + Nomor Faktur telah tercatat sebelumnya di database.
   - MATH_MISMATCH: Terjadi jika rincian baris item tidak sama dengan subtotal atau grand total.

Gaya Komunikasi:
- Gunakan Bahasa Indonesia profesional, ringkas, solutif, dan ramah seperti staf Senior Finance & Accounting Operations AMIGA.
- Jika pengguna menanyakan status faktur tertentu atau keluhan pengecualian (exception), sebutkan nomor Request ID dan alasannya secara spesifik.
- Berikan saran aksi konkrit (misalnya: "Beralihlah ke peran Finance Reviewer untuk menyetujui dokumen ini").
`;

  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      // Format previous turns for context
      const contents: any[] = chatHistory.slice(-4).map((msg) => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
      }));

      contents.push({
        role: 'user',
        parts: [{ text: userQuery }],
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction,
          temperature: 0.2,
        },
      });

      if (response.text) {
        return response.text;
      }
    } catch (err) {
      console.warn('Gemini chat API error, falling back to smart local response:', err);
    }
  }

  // Fallback intelligent response generator
  return generateLocalSmartResponse(userQuery, invoices, currentUser);
}

function generateLocalSmartResponse(
  query: string,
  invoices: InvoiceDocument[],
  currentUser: UserProfile
): string {
  const q = query.toLowerCase();

  // Query: Exceptions
  if (q.includes('exception') || q.includes('tahan') || q.includes('masalah') || q.includes('kendala')) {
    const exceptions = invoices.filter((i) => i.status === 'EXCEPTION');
    if (exceptions.length === 0) {
      return 'Saat ini tidak ada faktur yang berstatus EXCEPTION. Seluruh antrean berjalan lancar dan siap untuk ditinjau!';
    }
    const list = exceptions
      .map(
        (i) =>
          `• **${i.requestId}** (${i.vendorName}): Terkena bendera \`${i.exceptionFlags.join(', ')}\`. Catatan: ${i.exceptionNote || 'Perlu verifikasi manual'}.`
      )
      .join('\n');
    return `Terdapat **${exceptions.length} faktur** yang saat ini berstatus **EXCEPTION**:\n\n${list}\n\nAnda dapat membuka Layar 03 (Peninjauan) untuk melengkapi data atau menyelesaikan pengecualian tersebut.`;
  }

  // Query: Segregation of Duties / SoD
  if (q.includes('segregation') || q.includes('sod') || q.includes('tugas') || q.includes('sendiri')) {
    return `**Kebijakan Segregation of Duties (SoD) AMIGA:**\n\nUntuk mencegah kecurangan (fraud) dan kesalahan otorisasi, sistem menerapkan aturan ketat: **Pengunggah dokumen TIDAK diperkenankan menyetujui fakturnya sendiri**.\n\nContoh pada demo:\n- Jika Anda masuk sebagai **Budi Santoso (User A)** dan membuka faktur yang diunggah oleh User A (misalnya **REQ-2026-0312-005**), tombol "Setujui Voucher" akan terkunci.\n- Anda harus beralih ke peran **Finance Reviewer (Dewi Lestari)** di bilah atas untuk melakukan persetujuan resmi (AMIGA_REVIEWED).`;
  }

  // Query: Multi-client security / Isolasi
  if (q.includes('multi-client') || q.includes('isolasi') || q.includes('akses ditolak') || q.includes('klien')) {
    return `**Prinsip Keamanan Multi-Client Isolation:**\n\nSetiap entitas klien (misal: PT Maju Jaya vs PT Nusantara Sejahtera) memiliki partisi data finansial terisolasi. PIC Klien hanya memiliki otorisasi untuk melihat, mengunggah, dan mengunduh voucher milik perusahaannya sendiri.\n\nJika PIC Klien mencoba mengakses faktur milik klien lain, sistem AMIGA akan memunculkan dialog **"Akses Ditolak (Multi-Client Isolation)"** sesuai standar kepatuhan ISO 27001 dan tata kelola SSC.`;
  }

  // Query: Total / Summary status
  if (q.includes('total') || q.includes('berapa') || q.includes('antrean') || q.includes('rekap') || q.includes('status')) {
    const ready = invoices.filter((i) => i.status === 'READY_FOR_REVIEW').length;
    const exc = invoices.filter((i) => i.status === 'EXCEPTION').length;
    const reviewed = invoices.filter((i) => i.status === 'AMIGA_REVIEWED' || i.status === 'SENT_TO_CLIENT').length;
    return `**Ringkasan Antrean Faktur Saat Ini:**\n- Total Dokumen: **${invoices.length}**\n- Ready for Review: **${ready}** faktur\n- Exception / Butuh Tindakan: **${exc}** faktur\n- Disetujui (Voucher Terbit): **${reviewed}** faktur\n\nPengguna aktif saat ini adalah **${currentUser.name}** (${currentUser.roleLabel}).`;
  }

  // Query: Rekening Bank / Missing Evidence
  if (q.includes('rekening') || q.includes('bank') || q.includes('mitra graha')) {
    const inv3 = invoices.find((i) => i.id === 'inv-003');
    return `Faktur **${inv3?.vendorName || 'PT Mitra Graha Semesta'}** (${inv3?.requestId || 'REQ-2026-0312-003'}) ditandai dengan bendera **MISSING_EVIDENCE** karena nomor rekening bank tujuan transfer kosong pada faktur fisik.\n\n**Solusi:** Buka Layar 03, masukkan nomor rekening bank vendor pada kolom yang tersedia, lalu klik "Simpan Draf Koreksi" untuk menghapus status Exception.`;
  }

  // Default helpful response
  return `Halo **${currentUser.name}**! Saya adalah **AMIGA Robot Copilot**.\n\nSaya dapat membantu Anda dalam:\n1. Memeriksa status antrean dan menganalisis bendera **EXCEPTION** (*MISSING_EVIDENCE*, *POSSIBLE_DUPLICATE*).\n2. Menjelaskan tata kelola **Segregation of Duties (SoD)** dan **Multi-Client Isolation**.\n3. Memberikan panduan rekonsiliasi matematis faktur multi-item.\n\nAda yang dapat saya bantu terkait pemrosesan faktur hari ini?`;
}
