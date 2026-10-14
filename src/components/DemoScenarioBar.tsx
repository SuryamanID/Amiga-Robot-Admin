/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Sparkles,
  CheckCircle2,
  ListOrdered,
  AlertOctagon,
  Copy,
  ShieldCheck,
  ShieldAlert,
  History,
  Play,
} from 'lucide-react';
import { UserProfile, InvoiceDocument } from '../types';

interface DemoScenarioBarProps {
  onSelectScenario: (scenarioNumber: number) => void;
  activeScenario?: number | null;
  currentUser: UserProfile;
}

export const DemoScenarioBar: React.FC<DemoScenarioBarProps> = ({
  onSelectScenario,
  activeScenario,
}) => {
  const scenarios = [
    {
      id: 1,
      title: '1. Normal Flow',
      subtitle: 'Upload -> AI -> Review -> PV',
      icon: CheckCircle2,
      badgeColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-800',
    },
    {
      id: 2,
      title: '2. Multi-line Item',
      subtitle: '4 Item Hardware & Penjumlahan',
      icon: ListOrdered,
      badgeColor: 'text-cyan-400 bg-cyan-950/60 border-cyan-800',
    },
    {
      id: 3,
      title: '3. Missing Evidence',
      subtitle: 'Rekening Kosong -> EXCEPTION',
      icon: AlertOctagon,
      badgeColor: 'text-amber-400 bg-amber-950/60 border-amber-800',
    },
    {
      id: 4,
      title: '4. Duplicate Detection',
      subtitle: 'Vendor & No Faktur Terduplikasi',
      icon: Copy,
      badgeColor: 'text-rose-400 bg-rose-950/60 border-rose-800',
    },
    {
      id: 5,
      title: '5. Segregation of Duties',
      subtitle: 'Pengunggah Dilarang Approve',
      icon: ShieldCheck,
      badgeColor: 'text-indigo-400 bg-indigo-950/60 border-indigo-800',
    },
    {
      id: 6,
      title: '6. Multi-Client Security',
      subtitle: 'Isolasi Dokumen Antar Klien',
      icon: ShieldAlert,
      badgeColor: 'text-purple-400 bg-purple-950/60 border-purple-800',
    },
    {
      id: 7,
      title: '7. Audit Traceability',
      subtitle: 'Jejak Perubahan Field & Diff',
      icon: History,
      badgeColor: 'text-blue-400 bg-blue-950/60 border-blue-800',
    },
  ];

  return (
    <div className="bg-slate-900/95 border-b border-slate-800 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>MAIN HACKATHON 2026:</span>
          </div>
          <span className="text-xs text-slate-300 font-medium">
            Demo Day 7 Acceptance Test Scenarios
          </span>
        </div>

        {/* Scrollable scenario pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {scenarios.map((sc) => {
            const Icon = sc.icon;
            const isActive = activeScenario === sc.id;
            return (
              <button
                key={sc.id}
                type="button"
                onClick={() => onSelectScenario(sc.id)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all shrink-0 ${
                  isActive
                    ? 'bg-cyan-600 text-white border-cyan-400 shadow-md ring-2 ring-cyan-500/30'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
                }`}
                title={sc.subtitle}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : ''}`} />
                <div className="text-left leading-tight">
                  <div className="font-semibold">{sc.title}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
