/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldAlert, Lock, AlertTriangle, ArrowRight, UserCheck } from 'lucide-react';
import { UserProfile } from '../../types';

interface AccessDeniedModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  targetClientName: string;
  targetInvoiceNumber?: string;
}

export const AccessDeniedModal: React.FC<AccessDeniedModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  targetClientName,
  targetInvoiceNumber,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-rose-600/60 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-start gap-4">
          <div className="p-3 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/40 shrink-0">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-rose-950 text-rose-300 border border-rose-800 rounded">
                MAIN Hackathon Scenario 6
              </span>
              <span className="text-xs text-rose-400 font-semibold flex items-center gap-1">
                <Lock className="w-3 h-3" /> Isolasi Multi-Klien
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mt-1.5">
              Akses Ditolak (Multi-Client Isolation)
            </h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Sistem AMIGA mengisolasi data finansial antar entitas klien secara ketat. Pengguna tidak diizinkan membuka atau melihat faktur milik perusahaan klien lain.
            </p>
          </div>
        </div>

        {/* Security Details Card */}
        <div className="my-5 p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2.5 text-xs">
          <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
            <span className="text-slate-400">Pengguna Aktif:</span>
            <span className="font-semibold text-slate-200">{currentUser.name}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
            <span className="text-slate-400">Otorisasi Klien Anda:</span>
            <span className="font-bold text-cyan-400">{currentUser.clientName}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
            <span className="text-slate-400">Target Dokumen:</span>
            <span className="font-mono text-rose-300 font-semibold">
              {targetInvoiceNumber || 'Faktur Rahasia'}
            </span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-400">Pemilik Dokumen Target:</span>
            <span className="font-bold text-rose-400">{targetClientName}</span>
          </div>
        </div>

        {/* Advisory Box */}
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <p>
            Untuk memeriksa dokumen ini pada sesi demonstrasi, silakan gunakan <strong>"Simulasi Peran & Klien"</strong> di bilah atas untuk beralih ke <strong>Finance Reviewer</strong> (AMIGA SSC) atau <strong>PIC Klien {targetClientName}</strong>.
          </p>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition"
          >
            Tutup Dialog
          </button>
        </div>
      </div>
    </div>
  );
};
