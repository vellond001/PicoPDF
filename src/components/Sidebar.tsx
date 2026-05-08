import React, { useEffect, useState } from 'react';
import { pdfService } from '../services/pdf';
import { cn } from '../lib/utils';
import { List, Info, Database } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  file: ArrayBuffer | null;
  currentPage: number;
  onPageChange: (page: number) => void;
  onTotalPages: (total: number) => void;
}

export default function Sidebar({ 
  isOpen, 
  file, 
  currentPage, 
  onPageChange,
  onTotalPages
}: SidebarProps) {
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [metadata, setMetadata] = useState<any>(null);

  useEffect(() => {
    const generate = async () => {
      if (!file) {
        setThumbnails([]);
        setMetadata(null);
        return;
      }

      try {
        const pdf = await pdfService.loadPDF(file);
        onTotalPages(pdf.numPages);
        
        // Generate thumbnails for first 10 pages for performance
        const limit = Math.min(pdf.numPages, 20);
        const thumbs: string[] = [];
        for (let i = 1; i <= limit; i++) {
          const canvas = await pdfService.renderPage(pdf, i, 0.2); // Small scale for thumbs
          thumbs.push(canvas.toDataURL());
        }
        setThumbnails(thumbs);
        
        const meta = await (pdf as any).getMetadata();
        setMetadata(meta?.info);
      } catch (e) {
        console.error(e);
      }
    };
    generate();
  }, [file]);

  return (
    <aside 
      className={cn(
        "bg-sidebar-bg border-r border-border-gold transition-all duration-300 overflow-hidden flex flex-col shrink-0 absolute md:relative h-full z-40",
        isOpen ? "w-64 md:w-72 translate-x-0" : "w-0 -translate-x-full md:translate-x-0 border-none"
      )}
    >
      <div className="p-4 md:p-6 border-b border-border-gold flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[8px] md:text-[9px] tracking-[0.2em] uppercase text-gold opacity-40">Navigation</span>
          <h3 className="serif text-lg md:text-xl italic text-white flex items-center gap-2">
            <List size={16} className="text-gold" />
            Page Matrix
          </h3>
        </div>
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
    </aside>
  );
}
