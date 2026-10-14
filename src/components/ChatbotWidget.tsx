/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Bot,
  X,
  Send,
  Sparkles,
  Loader2,
  Trash2,
  Minimize2,
  Maximize2,
  ArrowRight,
  HelpCircle,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { InvoiceDocument, UserProfile } from '../types';
import { askAmigaCopilot, ChatMessage } from '../services/chatbot';

interface ChatbotWidgetProps {
  invoices: InvoiceDocument[];
  currentUser: UserProfile;
  onNavigateToInvoice: (invoiceId: string) => void;
}

export const ChatbotWidget: React.FC<ChatbotWidgetProps> = ({
  invoices,
  currentUser,
  onNavigateToInvoice,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Initial welcome message
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'assistant',
      text: `Halo **${currentUser.name}**! Saya adalah **AMIGA Robot Copilot**.\n\nSaya siap membantu menganalisis status antrean faktur, mendiagnosis bendera pengecualian (*MISSING_EVIDENCE*, *POSSIBLE_DUPLICATE*), serta menjelaskan kebijakan kepatuhan **Segregation of Duties** pada demo ini.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestions: [
        'Ada berapa faktur EXCEPTION?',
        'Jelaskan aturan Segregation of Duties',
        'Mengapa faktur PT Mitra Graha tertahan?',
        'Ringkas status antrean saat ini',
      ],
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || isLoading) return;

    const userMessage: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const answer = await askAmigaCopilot(query, messages, invoices, currentUser);
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'assistant',
          text: 'Maaf, terjadi gangguan saat menghubungi asisten AI. Silakan coba kembali dalam beberapa saat.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `msg-${Date.now()}`,
        sender: 'assistant',
        text: `Riwayat obrolan dibersihkan. Halo **${currentUser.name}**, ada yang ingin Anda tanyakan seputar dokumen faktur atau alur verifikasi?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: [
          'Ada berapa faktur EXCEPTION?',
          'Jelaskan aturan Segregation of Duties',
          'Mengapa faktur PT Mitra Graha tertahan?',
        ],
      },
    ]);
  };

  // Helper to render simple markdown formatting (**bold**, `code`, • bullets)
  const renderFormattedText = (rawText: string) => {
    const lines = rawText.split('\n');
    return (
      <div className="space-y-1.5 leading-relaxed text-xs">
        {lines.map((line, idx) => {
          if (!line.trim()) {
            return <div key={idx} className="h-1" />;
          }

          // Bullet point
          const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');
          const cleanLine = isBullet ? line.trim().replace(/^[•\-]\s*/, '') : line;

          // Parse bold **text** and code `text`
          const parts = cleanLine.split(/(\*\*.*?\*\*|`.*?`)/g);

          const formattedContent = parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={pIdx} className="font-semibold text-white">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            if (part.startsWith('`') && part.endsWith('`')) {
              return (
                <span
                  key={pIdx}
                  className="font-mono text-[11px] bg-slate-900 px-1 py-0.2 rounded text-cyan-300 border border-slate-700"
                >
                  {part.slice(1, -1)}
                </span>
              );
            }
            return part;
          });

          if (isBullet) {
            return (
              <div key={idx} className="flex items-start gap-1.5 ml-2">
                <span className="text-cyan-400 font-bold shrink-0 mt-0.5">•</span>
                <div>{formattedContent}</div>
              </div>
            );
          }

          return <p key={idx}>{formattedContent}</p>;
        })}
      </div>
    );
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-2xl shadow-2xl shadow-cyan-500/30 transition-all transform hover:scale-105 ring-2 ring-white/20"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-white" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-slate-950 animate-pulse" />
          </div>
          <div className="text-left">
            <div className="text-xs font-black tracking-tight leading-none flex items-center gap-1.5">
              <span>AMIGA Copilot</span>
              <span className="text-[9px] bg-cyan-950/80 px-1.5 py-0.2 rounded font-mono uppercase text-cyan-300 border border-cyan-800">
                AI Assistant
              </span>
            </div>
            <div className="text-[10px] text-cyan-100/80 mt-0.5 font-medium">
              Tanya Alur & Status Faktur
            </div>
          </div>
        </button>
      )}

      {/* Expanded Chat Drawer / Popover */}
      {isOpen && (
        <div
          className={`bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 animate-in fade-in zoom-in-95 ${
            isExpanded
              ? 'w-[90vw] sm:w-[600px] h-[85vh] max-h-[780px]'
              : 'w-[90vw] sm:w-[420px] h-[550px]'
          }`}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-md">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-white tracking-tight">AMIGA Robot Copilot</h3>
                  <span className="flex items-center gap-1 text-[9px] font-mono text-emerald-400 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-800">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    Gemini 3.8 Flash
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Asisten Cerdas Finansial & Kepatuhan Back Office
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClearChat}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
                title="Bersihkan Obrolan"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
                title={isExpanded ? 'Perkecil Ukuran' : 'Perbesar Ukuran'}
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
                title="Tutup Chatbot"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Context Strip */}
          <div className="px-4 py-1.5 bg-slate-900/60 border-b border-slate-800/60 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Peran: <strong className="text-cyan-300">{currentUser.roleLabel}</strong></span>
            <span>Antrean: <strong className="text-white">{invoices.length} faktur</strong></span>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-950/80">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl p-3 text-xs shadow-md ${
                      isUser
                        ? 'bg-cyan-600 text-white rounded-br-xs'
                        : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-xs'
                    }`}
                  >
                    {!isUser && (
                      <div className="flex items-center gap-1.5 mb-1.5 text-[10px] font-bold text-cyan-400">
                        <Sparkles className="w-3 h-3" />
                        <span>AMIGA Copilot</span>
                      </div>
                    )}

                    {isUser ? <p className="leading-relaxed">{msg.text}</p> : renderFormattedText(msg.text)}

                    {/* Suggestions Buttons if available */}
                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-800 flex flex-wrap gap-1.5">
                        {msg.suggestions.map((sug, sIdx) => (
                          <button
                            key={sIdx}
                            type="button"
                            onClick={() => handleSendMessage(sug)}
                            className="px-2 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700/80 text-[10px] font-medium text-cyan-300 hover:text-white transition flex items-center gap-1"
                          >
                            <span>{sug}</span>
                            <ArrowRight className="w-2.5 h-2.5 text-cyan-400" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <span className="text-[9px] text-slate-500 mt-1 px-1 font-mono">
                    {msg.timestamp}
                  </span>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-start gap-2 text-slate-400 text-xs p-3 bg-slate-900/60 border border-slate-800 rounded-2xl max-w-[80%]">
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400 shrink-0 mt-0.5" />
                <span>AMIGA Copilot sedang menganalisis dokumen dan aturan akuntansi...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="p-3 bg-slate-900 border-t border-slate-800 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Ketik pertanyaan (cth: 'cek faktur exception', 'aturan SoD')..."
                className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
              />
              <button
                type="submit"
                disabled={isLoading || !inputQuery.trim()}
                className="p-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 text-white rounded-xl shadow-md transition shrink-0"
                title="Kirim Pesan"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
