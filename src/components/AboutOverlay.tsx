import React from 'react';
import { motion } from 'motion/react';
import { X, ShieldCheck, FileText, Lock, Info } from 'lucide-react';

interface AboutOverlayProps {
  onClose: () => void;
}

export default function AboutOverlay({ onClose }: AboutOverlayProps) {
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
        className="w-full max-w-3xl bg-dark-bg border border-gold/40 shadow-[0_40px_100px_rgba(0,0,0,0.8)] flex flex-col max-h-[85vh] rounded-sm relative"
      >
        <div className="h-16 bg-panel border-b border-gold/30 text-white flex items-center justify-between px-6 shrink-0">
          <div className="flex flex-col">
            <span className="text-[9px] tracking-[0.3em] uppercase text-gold opacity-50">Subsystem</span>
            <div className="flex items-center gap-3">
              <ShieldCheck size={18} className="text-gold" />
              <span className="serif text-xl italic font-semibold tracking-wide">About & Legal Matrix</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 border border-gold/20 text-gold hover:bg-gold hover:text-black rounded-sm transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 p-6 md:p-8 space-y-10 custom-scrollbar">
          <div className="space-y-4">
            <h2 className="text-xl serif italic text-gold flex items-center gap-2 border-b border-white/5 pb-2">
              <FileText size={18} />
              Terms of Service
            </h2>
            <div className="text-[12px] font-mono text-gray-400 space-y-4 leading-relaxed">
              <p>
                By using PicoPDF and its AI Integrations (PicoAI Orchestrator), you agree to these inferred terms of service. 
                PicoPDF acts as a localized assessment and analysis hub for PDF documents. We do not permanently store your intellectual 
                property on our systems; rather, files are processed actively and analyzed selectively based on user instruction.
              </p>
              <p>
                Any interactions routed through third-party LLMs (OpenRouter, Anthropic, Google Gemini, Groq, etc.) are subject to 
                their respective data policies and terms. Be aware that you should not process highly sensitive or classified data 
                through external APIs lacking a Zero Data-Retention agreement.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl serif italic text-gold flex items-center gap-2 border-b border-white/5 pb-2">
              <Lock size={18} />
              Privacy Policy
            </h2>
            <div className="text-[12px] font-mono text-gray-400 space-y-4 leading-relaxed">
              <p>
                PicoPDF focuses on privacy and localized execution where applicable. PDF buffers and document content are primarily 
                kept within your client browser environment. Data is transmitted securely strictly for summarization, querying, and 
                intel extraction as invoked by the user interacting with the AI functionalities.
              </p>
              <p>
                Telemetry, usage stats, API keys, and model chain sequences are stored in your browser's local storage to prevent data leakage 
                and to ensure you maintain complete sovereignty over your API keys. We explicitly prohibit the extraction of user API keys.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl serif italic text-gold flex items-center gap-2 border-b border-white/5 pb-2">
              <ShieldCheck size={18} />
              License Information
            </h2>
            <div className="text-[12px] font-mono text-gray-400 space-y-4 leading-relaxed">
              <p>
                PicoPDF is currently functioning as an internal System Audit Protocol prototype. Certain visual assets and 
                libraries utilized within this system may carry their respective open-source or commercial licenses. 
              </p>
              <ul className="list-none mt-2 space-y-2">
                <li className="flex justify-between items-center bg-black/40 p-2 rounded-sm border border-white/5"><span className="text-gray-300">React & Vite</span> <span className="text-gold tracking-widest uppercase">MIT</span></li>
                <li className="flex justify-between items-center bg-black/40 p-2 rounded-sm border border-white/5"><span className="text-gray-300">Tailwind CSS</span> <span className="text-gold tracking-widest uppercase">MIT</span></li>
                <li className="flex justify-between items-center bg-black/40 p-2 rounded-sm border border-white/5"><span className="text-gray-300">Lucide Icons</span> <span className="text-gold tracking-widest uppercase">ISC</span></li>
                <li className="flex justify-between items-center bg-black/40 p-2 rounded-sm border border-white/5"><span className="text-gray-300">PDF.js</span> <span className="text-gold tracking-widest uppercase">Apache-2.0</span></li>
              </ul>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl serif italic text-gold flex items-center gap-2 border-b border-white/5 pb-2">
              <Info size={18} />
              Attribution & Credits
            </h2>
            <div className="text-[12px] font-mono text-gray-400 space-y-4">
              <ul className="list-none mt-2 space-y-2">
                <li className="flex justify-between items-center bg-black/40 p-2 rounded-sm border border-white/5"><span className="text-gray-300">Author & Creator</span> <span className="text-gold tracking-widest uppercase text-[10px]">Michael John R. Gapate</span></li>
                <li className="flex justify-between items-center bg-black/40 p-2 rounded-sm border border-white/5"><span className="text-gray-300">Lead Engineer</span> <span className="text-gold tracking-widest uppercase text-[10px]">Gemini 2.5 Pro</span></li>
                <li className="flex justify-between items-center bg-black/40 p-2 rounded-sm border border-white/5"><span className="text-gray-300">System Architect</span> <span className="text-gold tracking-widest uppercase text-[10px]">DeepSeek V3</span></li>
              </ul>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl serif italic text-gold flex items-center gap-2 border-b border-white/5 pb-2">
              <FileText size={18} />
              Keyboard Shortcuts
            </h2>
            <div className="text-[12px] font-mono text-gray-400 space-y-4">
              <ul className="list-none mt-2 space-y-2">
                <li className="flex justify-between items-center bg-black/40 p-2 rounded-sm border border-white/5"><span className="text-gray-300">Open Settings</span> <span className="text-gold tracking-widest uppercase">Cmd/Ctrl + ,</span></li>
                <li className="flex justify-between items-center bg-black/40 p-2 rounded-sm border border-white/5"><span className="text-gray-300">Open File</span> <span className="text-gold tracking-widest uppercase">Cmd/Ctrl + O</span></li>
                <li className="flex justify-between items-center bg-black/40 p-2 rounded-sm border border-white/5"><span className="text-gray-300">Undo Action</span> <span className="text-gold tracking-widest uppercase">Cmd/Ctrl + Z</span></li>
                <li className="flex justify-between items-center bg-black/40 p-2 rounded-sm border border-white/5"><span className="text-gray-300">Redo Action</span> <span className="text-gold tracking-widest uppercase">Cmd/Ctrl + Y / Shift+Z</span></li>
                <li className="flex justify-between items-center bg-black/40 p-2 rounded-sm border border-white/5"><span className="text-gray-300">Copy File Blob</span> <span className="text-gold tracking-widest uppercase">Cmd/Ctrl + C</span></li>
                <li className="flex justify-between items-center bg-black/40 p-2 rounded-sm border border-white/5"><span className="text-gray-300">Paste File</span> <span className="text-gold tracking-widest uppercase">Cmd/Ctrl + V</span></li>
                <li className="flex justify-between items-center bg-black/40 p-2 rounded-sm border border-white/5"><span className="text-gray-300">Export Artifact</span> <span className="text-gold tracking-widest uppercase">Cmd/Ctrl + S</span></li>
                <li className="flex justify-between items-center bg-black/40 p-2 rounded-sm border border-white/5"><span className="text-gray-300">Toggle Sidebar</span> <span className="text-gold tracking-widest uppercase">Cmd/Ctrl + B</span></li>
                <li className="flex justify-between items-center bg-black/40 p-2 rounded-sm border border-white/5"><span className="text-gray-300">Zoom In/Out</span> <span className="text-gold tracking-widest uppercase">Cmd/Ctrl + / -</span></li>
                <li className="flex justify-between items-center bg-black/40 p-2 rounded-sm border border-white/5"><span className="text-gray-300">Previous/Next Page</span> <span className="text-gold tracking-widest uppercase">Arrow Left / Right</span></li>
                <li className="flex justify-between items-center bg-black/40 p-2 rounded-sm border border-white/5"><span className="text-gray-300">About & Legal</span> <span className="text-gold tracking-widest uppercase">Cmd/Ctrl + /</span></li>
                <li className="flex justify-between items-center bg-black/40 p-2 rounded-sm border border-white/5"><span className="text-gray-300">Close Overlay</span> <span className="text-gold tracking-widest uppercase">Escape</span></li>
              </ul>
              
              <div className="mt-8 pt-4 border-t border-gold/20 flex flex-col items-center justify-center">
                <p className="tracking-[0.3em] uppercase text-gold opacity-50 text-[10px] mb-1">System Status</p>
                <p className="italic text-white opacity-80 serif">
                  PicoPDF Assessment Engine v1.0.4. All systems operational.
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
