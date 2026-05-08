import React from 'react';
import { motion } from 'motion/react';
import { X, Database, Lock, Shield } from 'lucide-react';
import { cn } from '../lib/utils';

interface TokenPanelProps {
  onClose: () => void;
}

export default function TokenPanel({ onClose }: TokenPanelProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
      animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
      exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60"
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="w-full max-w-3xl bg-dark-bg border border-gold/40 shadow-[0_40px_100px_rgba(0,0,0,0.8)] flex flex-col max-h-[85vh] rounded-sm"
      >
        <div className="h-16 bg-panel border-b border-gold/30 text-white flex items-center justify-between px-6 shrink-0">
          <div className="flex flex-col">
            <span className="text-[9px] tracking-[0.3em] uppercase text-gold opacity-50">Subsystem</span>
            <div className="flex items-center gap-3">
              <Database size={18} className="text-gold" />
              <span className="serif text-xl italic font-semibold tracking-wide">Secure Token Ledger</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 border border-gold/20 text-gold hover:bg-gold hover:text-black rounded-sm transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-8 space-y-8 custom-scrollbar">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-panel border border-gold/10 p-5 rounded-sm relative overflow-hidden group hover:border-gold/30 transition-all">
              <span className="text-[9px] tracking-widest uppercase text-gold opacity-60 font-mono">Session Input</span>
              <p className="serif text-3xl mt-2 text-white">4,285</p>
              <div className="absolute top-0 right-0 p-4 opacity-5"><Database size={48} /></div>
            </div>
            <div className="bg-panel border border-gold/10 p-5 rounded-sm relative overflow-hidden group hover:border-gold/30 transition-all">
              <span className="text-[9px] tracking-widest uppercase text-gold opacity-60 font-mono">Session Output</span>
              <p className="serif text-3xl mt-2 text-white">1,024</p>
              <div className="absolute top-0 right-0 p-4 opacity-5"><Database size={48} /></div>
            </div>
             <div className="bg-panel border border-gold/30 p-5 rounded-sm relative overflow-hidden group hover:shadow-[0_0_15px_rgba(212,175,55,0.1)] transition-all">
              <span className="text-[9px] tracking-widest uppercase text-gold font-mono">Lifetime Tokens</span>
              <p className="serif text-3xl mt-2 text-gold">42,891</p>
              <div className="absolute top-0 right-0 p-4 opacity-10 text-gold"><Database size={48} /></div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="serif italic text-lg text-white border-b border-white/5 pb-2">Recent Transactions</h4>
            <div className="bg-[#0C0C0E] border border-white/5 rounded-sm overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="bg-white/5 text-[9px] uppercase tracking-widest text-gold opacity-60 font-mono">
                    <th className="p-3 border-b border-white/5">Timestamp</th>
                    <th className="p-3 border-b border-white/5">Provider</th>
                    <th className="p-3 border-b border-white/5">Model</th>
                    <th className="p-3 border-b border-white/5 text-right">In/Out</th>
                  </tr>
                </thead>
                <tbody className="text-[11px] font-mono opacity-80 font-light">
                  <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-3">14:02:45</td>
                    <td className="p-3 text-gold">Gemini</td>
                    <td className="p-3">gemini-3.1-pro-preview</td>
                    <td className="p-3 text-right text-status-warn">↑ 412 / ↓ 86</td>
                  </tr>
                  <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-3">13:58:12</td>
                    <td className="p-3 text-gold">LocalAI</td>
                    <td className="p-3">llama3-8b</td>
                    <td className="p-3 text-right text-status-warn">↑ 204 / ↓ 14</td>
                  </tr>
                  <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-3">13:45:00</td>
                    <td className="p-3 text-gold">OpenRouter</td>
                    <td className="p-3">llama-3.1-405b</td>
                    <td className="p-3 text-right text-status-warn">↑ 1024 / ↓ 412</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-black/40 border border-gold/20 text-white p-6 rounded-sm space-y-4 font-mono relative overflow-hidden">
             <div className="flex items-center justify-between border-b border-gold/20 pb-4">
              <div className="flex items-center gap-3">
                <Shield size={16} className="text-gold" />
                <span className="text-[11px] uppercase font-bold tracking-[0.2em] text-gold">Security Perimeter</span>
              </div>
              <span className="text-[9px] opacity-40 flex items-center gap-2"><Lock size={10} className="text-gold"/> AES-GCM ENCRYPTED</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 text-[10px] tracking-wide font-light opacity-80">
               <div>
                  <p className="flex justify-between border-b border-white/5 pb-2"><span>/ Provider Failover</span> <span className="text-status-check">ONLINE</span></p>
                  <p className="flex justify-between mt-2 pt-2"><span>/ Token Anomaly Detector</span> <span className="text-status-check">ACTIVE</span></p>
               </div>
               <div className="md:border-l md:border-gold/10 md:pl-8">
                  <p className="flex justify-between border-b border-white/5 pb-2"><span>/ Limits Enforcement</span> <span className="text-gold">NOMINAL</span></p>
                  <p className="flex justify-between mt-2 pt-2"><span>/ Firewall Condition</span> <span className="text-gold">ARMED</span></p>
               </div>
            </div>
          </div>
        </div>

        <div className="p-4 md:p-6 bg-panel border-t border-gold/20 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="w-full md:w-auto px-10 py-3 border border-gold text-gold text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-gold hover:text-black transition-all active:scale-95 text-center"
          >
            Acknowledge Ledger
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
