import React from 'react';
import { motion } from 'motion/react';
import { X, ShieldCheck, FileText, Lock, scale } from 'lucide-react';

interface AboutOverlayProps {
  onClose: () => void;
}

export default function AboutOverlay({ onClose }: AboutOverlayProps) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-panel border border-border-gold w-full max-w-2xl max-h-[85vh] flex flex-col relative overflow-hidden shadow-2xl shadow-gold/10"
      >
        <div className="flex items-center justify-between p-4 border-b border-border-gold/30 bg-black/40">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-gold" size={20} />
            <span className="text-sm tracking-[0.2em] uppercase font-bold text-white">About & Legal</span>
          </div>
          <button 
            onClick={onClose}
            className="text-gold hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 p-6 space-y-8 custom-scrollbar">
          <div className="space-y-4">
            <h2 className="text-2xl font-serif text-gold flex items-center gap-2">
              <FileText size={20} />
              Terms of Service
            </h2>
            <div className="text-sm text-gray-400 space-y-3 leading-relaxed">
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

          <div className="h-px w-full bg-border-gold/20" />

          <div className="space-y-4">
            <h2 className="text-2xl font-serif text-gold flex items-center gap-2">
              <Lock size={20} />
              Privacy Policy
            </h2>
            <div className="text-sm text-gray-400 space-y-3 leading-relaxed">
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

          <div className="h-px w-full bg-border-gold/20" />

          <div className="space-y-4">
            <h2 className="text-2xl font-serif text-gold flex items-center gap-2">
              <ShieldCheck size={20} />
              License Information
            </h2>
            <div className="text-sm text-gray-400 space-y-3 leading-relaxed">
              <p>
                PicoPDF is currently functioning as an internal System Audit Protocol prototype. Certain visual assets and 
                libraries utilized within this system may carry their respective open-source or commercial licenses. 
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><span className="text-gray-300 font-bold">React & Vite</span> - MIT License</li>
                <li><span className="text-gray-300 font-bold">Tailwind CSS</span> - MIT License</li>
                <li><span className="text-gray-300 font-bold">Lucide Icons</span> - ISC License</li>
                <li><span className="text-gray-300 font-bold">PDF.js</span> - Apache License 2.0</li>
              </ul>
              <p className="mt-4 italic opacity-70">
                PicoPDF Assessment Engine v1.0.4. All systems operational.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
