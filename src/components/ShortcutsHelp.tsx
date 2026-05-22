import React, { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export default function ShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-1.5 md:p-2 border border-border-gold text-gold hover:bg-gold hover:text-black rounded-sm transition-all"
        title="Keyboard Shortcuts"
      >
        <HelpCircle size={15} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              className="relative bg-panel border-2 border-border-gold p-6 max-w-md w-full text-white font-sans shadow-2xl"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <button 
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 text-white/50 hover:text-white"
              >
                <X size={20} />
              </button>
              
              <h2 className="text-xl font-bold mb-6 text-gold flex items-center gap-2">
                <HelpCircle className="w-6 h-6" />
                Keyboard Shortcuts
              </h2>

              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <span className="text-sm font-bold opacity-80">Open File</span>
                  <div className="flex gap-1">
                    <kbd className="px-2 py-1 bg-black/50 border border-white/20 rounded text-xs font-mono">Cmd/Ctrl</kbd>
                    <span className="text-white/50">+</span>
                    <kbd className="px-2 py-1 bg-black/50 border border-white/20 rounded text-xs font-mono">O</kbd>
                  </div>
                </div>

                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <span className="text-sm font-bold opacity-80">Next Page</span>
                  <div className="flex gap-1">
                    <kbd className="px-2 py-1 bg-black/50 border border-white/20 rounded text-xs font-mono">Arrow Right</kbd>
                  </div>
                </div>
                
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <span className="text-sm font-bold opacity-80">Previous Page</span>
                  <div className="flex gap-1">
                    <kbd className="px-2 py-1 bg-black/50 border border-white/20 rounded text-xs font-mono">Arrow Left</kbd>
                  </div>
                </div>

                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <span className="text-sm font-bold opacity-80">Zoom In</span>
                  <div className="flex gap-1">
                    <kbd className="px-2 py-1 bg-black/50 border border-white/20 rounded text-xs font-mono">Cmd/Ctrl</kbd>
                    <span className="text-white/50">+</span>
                    <kbd className="px-2 py-1 bg-black/50 border border-white/20 rounded text-xs font-mono">+</kbd>
                  </div>
                </div>

                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <span className="text-sm font-bold opacity-80">Zoom Out</span>
                  <div className="flex gap-1">
                    <kbd className="px-2 py-1 bg-black/50 border border-white/20 rounded text-xs font-mono">Cmd/Ctrl</kbd>
                    <span className="text-white/50">+</span>
                    <kbd className="px-2 py-1 bg-black/50 border border-white/20 rounded text-xs font-mono">-</kbd>
                  </div>
                </div>

                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <span className="text-sm font-bold opacity-80">Undo</span>
                  <div className="flex gap-1">
                    <kbd className="px-2 py-1 bg-black/50 border border-white/20 rounded text-xs font-mono">Cmd/Ctrl</kbd>
                    <span className="text-white/50">+</span>
                    <kbd className="px-2 py-1 bg-black/50 border border-white/20 rounded text-xs font-mono">Z</kbd>
                  </div>
                </div>

                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <span className="text-sm font-bold opacity-80">Redo</span>
                  <div className="flex gap-1">
                    <kbd className="px-2 py-1 bg-black/50 border border-white/20 rounded text-xs font-mono">Cmd/Ctrl</kbd>
                    <span className="text-white/50">+</span>
                    <kbd className="px-2 py-1 bg-black/50 border border-white/20 rounded text-xs font-mono">Y</kbd>
                  </div>
                </div>

                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <span className="text-sm font-bold opacity-80">Copy PDF Object</span>
                  <div className="flex gap-1">
                    <kbd className="px-2 py-1 bg-black/50 border border-white/20 rounded text-xs font-mono">Cmd/Ctrl</kbd>
                    <span className="text-white/50">+</span>
                    <kbd className="px-2 py-1 bg-black/50 border border-white/20 rounded text-xs font-mono">C</kbd>
                  </div>
                </div>
              </div>

              <div className="mt-8 text-center">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-6 py-2 bg-gold text-black font-bold text-sm uppercase tracking-wider hover:bg-white transition-colors w-full"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
