/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Bot,
  Users,
  ShieldCheck,
  ChevronDown,
  RotateCcw,
  Sparkles,
  Server,
  Layers,
  FileCheck,
  Clock,
  UploadCloud,
  CheckCircle,
  FileText,
  Database,
  LogIn,
  LogOut,
} from 'lucide-react';
import { UserProfile, UserRole } from '../types';
import { DEMO_USERS } from '../services/mockData';
import { USE_PYTHON_BACKEND } from '../services/api';

interface HeaderProps {
  currentUser: UserProfile;
  onSwitchUser: (user: UserProfile) => void;
  activeScreen: number;
  onNavigateScreen: (screenIndex: number) => void;
  onResetData: () => void;
  queueCounts: {
    total: number;
    readyForReview: number;
    exception: number;
    completed: number;
  };
  firebaseUser?: any;
  onLoginGoogle?: () => void;
  onLogoutFirebase?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onSwitchUser,
  activeScreen,
  onNavigateScreen,
  onResetData,
  queueCounts,
  firebaseUser,
  onLoginGoogle,
  onLogoutFirebase,
}) => {
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  const navItems = [
    { id: 1, label: '01. Antrean Kerja', icon: Layers, badge: queueCounts.total },
    { id: 2, label: '02. Unggah Dokumen', icon: UploadCloud },
    { id: 3, label: '03. Peninjauan & Verifikasi', icon: FileCheck, badge: queueCounts.readyForReview },
    { id: 4, label: '04. Pratinjau Voucher', icon: FileText },
    { id: 5, label: '05. Jejak Audit', icon: Clock },
  ];

  return (
    <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md">
      {/* Top Banner: Brand, Architecture Toggle Status & Role Switcher */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-white/20">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                AMIGA <span className="text-cyan-400 font-mono text-xs uppercase bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">Robot Admin</span>
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono border border-slate-700 hidden sm:inline-block">
                MAIN Hackathon 2026 PoC
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Intelligent Vendor Invoice-to-Voucher Processing & Segregation of Duties
            </p>
          </div>
        </div>

        {/* Right Section: Cloud DB Status, Google Auth & Role Switcher */}
        <div className="flex items-center gap-2.5">
          {/* Firestore Cloud Status */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-emerald-900/40 text-xs">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">Firestore:</span>
            <span className="font-mono text-emerald-300 font-medium">Terhubung</span>
          </div>

          {/* Architecture Backend Tag */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            <Server className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">Arsitektur:</span>
            <span className="font-mono text-cyan-300 font-medium">
              {USE_PYTHON_BACKEND ? 'FastAPI Python (8000)' : 'Gemini 3.8 Flash'}
            </span>
          </div>

          {/* Google Auth Integration Button */}
          {firebaseUser ? (
            <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-xl text-xs">
              {firebaseUser.photoURL ? (
                <img
                  src={firebaseUser.photoURL}
                  alt={firebaseUser.displayName || 'Google User'}
                  className="w-5 h-5 rounded-full border border-slate-600"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-cyan-600 text-white font-bold text-[10px] flex items-center justify-center">
                  G
                </div>
              )}
              <span className="hidden sm:inline text-slate-300 max-w-[110px] truncate text-[11px]">
                {firebaseUser.displayName || firebaseUser.email}
              </span>
              <button
                type="button"
                onClick={onLogoutFirebase}
                className="text-slate-400 hover:text-rose-400 transition ml-1"
                title="Keluar dari Google Auth"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onLoginGoogle}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-medium text-slate-200 transition shadow-sm"
              title="Masuk dengan Akun Google"
            >
              <LogIn className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Google Auth</span>
            </button>
          )}

          {/* Reset Demo Data Button */}
          <button
            type="button"
            onClick={onResetData}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-lg border border-slate-800 transition"
            title="Reset Data Simulasi ke Awal"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Role Switcher Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowRoleDropdown(!showRoleDropdown)}
              className="flex items-center gap-2.5 p-1.5 pr-3 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-xl transition text-left"
            >
              <div
                className={`w-8 h-8 rounded-lg bg-gradient-to-br ${currentUser.avatarColor} flex items-center justify-center text-white font-bold text-xs shadow-inner`}
              >
                {currentUser.name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')}
              </div>
              <div className="text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-100">{currentUser.name}</span>
                  <span className="text-[10px] px-1.5 py-0.2 bg-cyan-950 text-cyan-300 border border-cyan-800/80 rounded font-medium">
                    {currentUser.roleLabel}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 truncate max-w-[150px]">
                  {currentUser.clientName}
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
            </button>

            {/* Dropdown Options */}
            {showRoleDropdown && (
              <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-800 animate-in fade-in zoom-in-95 duration-150">
                <div className="p-3 bg-slate-950/80">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-200 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-cyan-400" />
                      Simulasi Peran & Klien (Demo Day)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Ganti peran aktif untuk menguji kontrol akses multi-klien dan Segregation of Duties.
                  </p>
                </div>

                <div className="p-1.5 max-h-96 overflow-y-auto space-y-1">
                  {DEMO_USERS.map((user) => {
                    const isSelected = user.id === currentUser.id;
                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => {
                          onSwitchUser(user);
                          setShowRoleDropdown(false);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl text-xs flex items-start gap-3 transition ${
                          isSelected
                            ? 'bg-cyan-950/70 border border-cyan-700/60 text-white'
                            : 'hover:bg-slate-800/80 text-slate-300'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 shrink-0 rounded-lg bg-gradient-to-br ${user.avatarColor} flex items-center justify-center text-white font-bold text-xs mt-0.5`}
                        >
                          {user.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-100">{user.name}</span>
                            {isSelected && (
                              <span className="text-[10px] text-cyan-400 font-mono font-bold">AKTIF</span>
                            )}
                          </div>
                          <div className="text-[11px] font-medium text-cyan-400 mt-0.5">
                            {user.roleLabel}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            🏢 {user.clientName}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="p-2.5 bg-slate-950/50 text-[11px] text-slate-400">
                  💡 <strong>Tips Demo:</strong> Beralih ke <em>PIC Klien (Owner)</em> lalu coba setujui dokumen sendiri untuk melihat peringatan Segregation of Duties!
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs (5 Core Screens) */}
      <div className="border-t border-slate-800/80 bg-slate-950/90 px-4">
        <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto scrollbar-none py-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeScreen === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigateScreen(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all shrink-0 relative ${
                  isActive
                    ? 'text-cyan-400 bg-cyan-950/50 border border-cyan-700/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span
                    className={`ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                      item.id === 3
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                {isActive && (
                  <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-cyan-500 rounded-t-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
