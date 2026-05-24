import React, { useEffect, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { pdfService } from '../services/pdf';
import { cn } from '../lib/utils';
import { List, Info, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  file: ArrayBuffer | null;
  currentPage: number;
  onPageChange: (page: number) => void;
  onTotalPages: (total: number) => void;
  onOpenPanel: (panel: 'settings' | 'organiser' | 'token' | 'metrics' | 'about') => void;
}

export default function Sidebar({ 
  isOpen, 
  file, 
  currentPage, 
  onPageChange,
  onTotalPages,
  onOpenPanel
}: SidebarProps) {
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [metadata, setMetadata] = useState<any>(null);

  useEffect(() => {
    let active = true;
    let localPdf: pdfjs.PDFDocumentProxy | null = null;

    const generate = async () => {
      if (!file) {
        setThumbnails([]);
        setMetadata(null);
        return;
      }

      try {
        const pdf = await pdfService.loadPDF(file);
        localPdf = pdf;
        
        if (!active) return;
        
        onTotalPages(pdf.numPages);
        
        // Generate thumbnails for first 10 pages for performance
        const limit = Math.min(pdf.numPages, 20);
        const thumbs: string[] = [];
        for (let i = 1; i <= limit; i++) {
          if (!active) break;
          const canvas = await pdfService.renderPage(pdf, i, 0.2); // Small scale for thumbs
          thumbs.push(canvas.toDataURL());
        }
        
        if (!active) return;
        setThumbnails(thumbs);
        
        const meta = await (pdf as any).getMetadata();
        if (active) setMetadata(meta?.info);
      } catch (e) {
        console.error(e);
      }
    };
    generate();
    
    return () => {
      active = false;
      if (localPdf) {
        localPdf.destroy();
      }
    };
  }, [file]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside 
          key="sidebar"
          initial={{ width: 0, opacity: 0, x: -20 }}
          animate={{ width: "auto", opacity: 1, x: 0 }}
          exit={{ width: 0, opacity: 0, x: -20 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className={cn(
            "bg-sidebar-bg border-r border-border-gold overflow-hidden flex flex-col shrink-0 absolute md:relative h-full z-40",
          )}
        >
          <div className="w-64 md:w-72 h-full flex flex-col">
            <div className="p-4 md:p-6 border-b border-border-gold flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[8px] md:text-[9px] tracking-[0.2em] uppercase text-gold opacity-40">Navigation</span>
                <h3 className="serif text-lg md:text-xl italic text-white flex items-center gap-2">
                  <List size={16} className="text-gold" />
                  Page Matrix
                </h3>
              </div>
            </div>

            <div className="p-4 border-b border-white/5 space-y-1 flex flex-col shrink-0">
              <button onClick={() => onOpenPanel('organiser')} className="w-full text-left px-3 py-2 text-[10px] md:text-xs uppercase tracking-widest text-[#D1D1D1] hover:text-black hover:bg-gold rounded-sm transition-all border border-transparent hover:border-gold/50 cursor-pointer">
                Auto-Organiser
              </button>
              <button onClick={() => onOpenPanel('token')} className="w-full text-left px-3 py-2 text-[10px] md:text-xs uppercase tracking-widest text-[#D1D1D1] hover:text-black hover:bg-gold rounded-sm transition-all border border-transparent hover:border-gold/50 cursor-pointer">
                Token Ledger
              </button>
              <button onClick={() => onOpenPanel('metrics')} className="w-full text-left px-3 py-2 text-[10px] md:text-xs uppercase tracking-widest text-[#D1D1D1] hover:text-black hover:bg-gold rounded-sm transition-all border border-transparent hover:border-gold/50 cursor-pointer">
                Diagnostics
              </button>
              <button onClick={() => onOpenPanel('settings')} className="w-full text-left px-3 py-2 text-[10px] md:text-xs uppercase tracking-widest text-[#D1D1D1] hover:text-black hover:bg-gold rounded-sm transition-all border border-transparent hover:border-gold/50 cursor-pointer">
                API Settings
              </button>
              <button onClick={() => onOpenPanel('about')} className="w-full text-left px-3 py-2 text-[10px] md:text-xs uppercase tracking-widest text-[#D1D1D1] hover:text-black hover:bg-gold rounded-sm transition-all border border-transparent hover:border-gold/50 cursor-pointer">
                About & Legal
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 md:p-6 space-y-4 md:space-y-6 custom-scrollbar bg-[#0F0F11]">
              {thumbnails.map((src, i) => (
                <div 
                  key={i}
                  onClick={() => onPageChange(i + 1)}
                  className={cn(
                    "cursor-pointer transition-all border p-1 rounded-sm group",
                    currentPage === i + 1 ? "border-gold bg-gold/5 scale-[1.02]" : "border-white/5 opacity-40 hover:opacity-100 hover:border-gold/30"
                  )}
                >
                  <img src={src} alt={`Page ${i + 1}`} className="w-full shadow-lg brightness-90 contrast-110 group-hover:brightness-100 transition-all" />
                  <div className="mt-2 text-[10px] font-mono text-center uppercase tracking-tighter text-gold opacity-60">
                    Index_00{i + 1}
                  </div>
                </div>
              ))}
            </div>

            {metadata && (
              <div className="p-6 bg-panel border-t border-border-gold space-y-4">
                <div className="flex flex-col">
                  <span className="text-[9px] tracking-[0.2em] uppercase text-gold opacity-40 mb-1">Artifact Metadata</span>
                  <div className="h-px bg-gold opacity-20 w-8" />
                </div>
                <div className="space-y-2 text-[11px] font-light tracking-wide opacity-80 serif italic">
                  <p className="truncate"><span className="text-gold not-italic opacity-50 uppercase text-[9px]">Title / </span> {metadata.Title || 'Undefined'}</p>
                  <p className="truncate"><span className="text-gold not-italic opacity-50 uppercase text-[9px]">Origin / </span> {metadata.Author || 'Unknown'}</p>
                  <p className="truncate"><span className="text-gold not-italic opacity-50 uppercase text-[9px]">Protocol / </span> {metadata.Creator || 'Standard'}</p>
                </div>
              </div>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
