import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { awareness, ComponentState } from '../services/awareness';
import { cascade } from '../services/cascade';
import { X, Activity, Shield, Zap, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';

interface MetricsOverlayProps {
  onClose: () => void;
}

export default function MetricsOverlay({ onClose }: MetricsOverlayProps) {
  const [data, setData] = useState<{ component: string; state: ComponentState }[]>([]);

  useEffect(() => {
    const update = () => {
      const components = ['UI', 'Viewer', 'Editor', 'OCR', 'LLM', 'Security'];
      setData(components.map(c => ({
        component: c,
        state: awareness.getState(c)
      })));
    };
    update();
    const timer = setInterval(update, 2000);
    return () => clearInterval(timer);
  }, []);

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
            <span className="text-[9px] tracking-[0.3em] uppercase text-gold opacity-50">Diagnostic Interface</span>
            <div className="flex items-center gap-3">
              <Zap size={18} className="text-gold" />
              <span className="serif text-xl italic font-semibold tracking-wide">OmniEngine Awareness Matrix</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 border border-gold/20 text-gold hover:bg-gold hover:text-black rounded-sm transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-8 space-y-8 custom-scrollbar">
          <div className="grid grid-cols-2 gap-6">
            {data.map((item) => {
              const health = awareness.getHealthScore(item.component);
              return (
                <div key={item.component} className="bg-panel border border-gold/10 p-5 space-y-4 rounded-sm relative overflow-hidden group hover:border-gold/30 transition-all">
                  <div className="flex items-center justify-between relative z-10">
                    <span className="serif italic text-lg text-white">{item.component}</span>
                    <span className={cn(
                      "text-[9px] px-2 py-0.5 rounded-sm font-mono font-bold tracking-widest border",
                      item.state.circuitBreaker === 'open' 
                        ? "border-red-500/50 text-red-500 bg-red-500/5" 
                        : "border-gold/50 text-gold bg-gold/5"
                    )}>
                      {item.state.circuitBreaker.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] uppercase tracking-tighter text-gold/60 font-mono">
                      <span>Integrity</span>
                      <span>{health}%</span>
                    </div>
                    <div className="h-1 bg-black rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${health}%` }}
                        className={cn(
                          "h-full transition-all duration-1000",
                          health > 70 ? "bg-gold" : health > 30 ? "bg-status-warn" : "bg-status-alert"
                        )}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-y-2 gap-x-4 font-mono text-[9px] uppercase tracking-tighter opacity-40">
                    <div className="flex justify-between"><span>Attempts</span> <span className="text-white">{item.state.totalAttempts}</span></div>
                    <div className="flex justify-between"><span>Latency</span> <span className="text-white">{Math.round(item.state.avgLatency)}ms</span></div>
                    <div className="flex justify-between"><span>Failures</span> <span className="text-white">{item.state.failures.length}</span></div>
                    <div className="flex justify-between"><span>Z-Score</span> <span className="text-white">σ 1.2</span></div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-black/40 border border-gold/20 text-white p-6 rounded-sm space-y-4 font-mono relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-gold/20 pb-4">
              <div className="flex items-center gap-3">
                <RefreshCw size={16} className="text-gold animate-spin" />
                <span className="text-[11px] uppercase font-bold tracking-[0.2em] text-gold">Cascade Mitigation Graph</span>
              </div>
              <span className="text-[9px] opacity-40">Ref: CM-004 / ISOLATION_ACTIVE</span>
            </div>
            
            <div className="grid grid-cols-2 gap-8 text-[10px] tracking-wide font-light">
              <div className="space-y-2 opacity-80">
                <p className="flex justify-between"><span>/ Self-Healing</span> <span className="text-gold">ENABLED</span></p>
                <p className="flex justify-between"><span>/ Isolation Points</span> <span className="text-gold">04_ACTIVE</span></p>
                <p className="flex justify-between"><span>/ Protocol Version</span> <span className="text-gold">1.0.4A</span></p>
              </div>
              <div className="space-y-2 opacity-80 border-l border-gold/10 pl-8">
                <p className="flex justify-between"><span>/ Resource Pressure</span> <span className="text-gold">{(awareness.getResourcePressure() * 100).toFixed(1)}%</span></p>
                <p className="flex justify-between"><span>/ Thread Count</span> <span className="text-gold">08_VIRTUAL</span></p>
                <p className="flex justify-between"><span>/ Network Latency</span> <span className="text-gold">24MS</span></p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-panel border-t border-gold/20 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-10 py-3 border border-gold text-gold text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-gold hover:text-black transition-all active:scale-95"
          >
            Acknowledge Audit
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
