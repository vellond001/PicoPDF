import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Type, 
  Droplet,
  Split,
  FolderOpen,
  Settings,
  Scissors,
  Move,
  FileText,
  Archive,
  Image as ImageIcon
} from 'lucide-react';
import { cn } from '../lib/utils';
import { pdfService } from '../services/pdf';

interface ToolbarProps {
  file: ArrayBuffer | null;
  currentPage: number;
  totalPages: number;
  scale: number;
  onPageChange: (page: number) => void;
  onScaleChange: (scale: number) => void;
  onFileLoad: (e: React.ChangeEvent<HTMLInputElement>) => void;
  editMode: 'none' | 'text' | 'watermark' | 'draw';
  onEditModeChange: (mode: 'none' | 'text' | 'watermark' | 'draw') => void;
  fileName: string;
  onFileUpdate: (data: Uint8Array) => void;
}

export default function Toolbar({ 
  file, 
  currentPage, 
  totalPages, 
  scale, 
  onPageChange, 
  onScaleChange, 
  onFileLoad,
  editMode,
  onEditModeChange,
  fileName,
  onFileUpdate
}: ToolbarProps) {

  const handleAddPageNumbers = async () => {
    if (!file) return;
    const updated = await pdfService.addPageNumbers(file);
    onFileUpdate(updated);
  };

  const handleExtractText = async () => {
    if (!file) return;
    const text = await pdfService.extractToText(file);
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSplit = async () => {
    if (!file) return;
    try {
      const parts = await pdfService.splitPDF(file);
      parts.forEach((bytes, i) => {
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName}_part_${i + 1}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="w-full h-auto min-h-[3.5rem] py-2 md:py-0 md:h-14 bg-panel border-b border-border-gold flex flex-wrap md:flex-nowrap items-center justify-between px-4 md:px-6 sticky top-0 z-10 shadow-lg gap-2">
      <div className="flex items-center gap-2">
        <label className="p-2 border border-border-gold text-gold hover:bg-gold hover:text-black rounded-sm cursor-pointer transition-all shrink-0" title="Initialize Protocol">
          <FolderOpen size={16} />
          <input type="file" className="hidden" accept=".pdf" onChange={onFileLoad} />
        </label>
        
        <div className="w-[1px] h-6 bg-gold opacity-10 mx-1 md:mx-2" />
        
        <div className="flex items-center gap-1 md:gap-2">
          <button 
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            className="p-1 md:p-1.5 border border-border-gold text-gold hover:bg-gold hover:text-black rounded-sm disabled:opacity-10 transition-all font-mono text-[9px] md:text-[10px]"
            disabled={currentPage <= 1 || !file}
          >
            PREV
          </button>
          <div className="px-2 md:px-4 py-1 md:py-1.5 bg-black/40 font-mono text-[10px] md:text-[11px] font-bold text-gold border border-border-gold/50 rounded-sm min-w-[60px] md:min-w-[80px] text-center">
            {currentPage.toString().padStart(2, '0')} <span className="opacity-30">/</span> {totalPages.toString().padStart(2, '0') || '00'}
          </div>
          <button 
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            className="p-1 md:p-1.5 border border-border-gold text-gold hover:bg-gold hover:text-black rounded-sm disabled:opacity-10 transition-all font-mono text-[9px] md:text-[10px]"
            disabled={currentPage >= totalPages || !file}
          >
            NEXT
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3 order-3 md:order-2 w-full md:w-auto justify-center md:justify-start">
        <div className="flex items-center bg-black/40 rounded-sm border border-border-gold/50 p-1 gap-1">
          <button 
            onClick={() => onEditModeChange(editMode === 'text' ? 'none' : 'text')}
            className={cn(
              "p-1.5 md:p-2 rounded-sm transition-all",
              editMode === 'text' ? "bg-gold text-black" : "text-white/60 hover:text-gold"
            )}
            title="Text Assessment"
          >
            <Type size={15} />
          </button>
          <button 
            onClick={() => onEditModeChange(editMode === 'watermark' ? 'none' : 'watermark')}
            className={cn(
              "p-1.5 md:p-2 rounded-sm transition-all",
              editMode === 'watermark' ? "bg-gold text-black" : "text-white/60 hover:text-gold"
            )}
            title="Audit Watermark"
          >
            <Droplet size={15} />
          </button>
          <button 
            onClick={() => onEditModeChange(editMode === 'draw' ? 'none' : 'draw')}
            className={cn(
              "p-1.5 md:p-2 rounded-sm transition-all",
              editMode === 'draw' ? "bg-gold text-black" : "text-white/60 hover:text-gold"
            )}
            title="Free Draw"
          >
            <Move size={15} />
          </button>
        </div>

        <div className="w-[1px] h-6 bg-gold opacity-10 mx-1" />

        <div className="flex items-center gap-1 md:gap-2">
          <button 
            onClick={async () => {
              if(!file) return;
              try {
                const updated = await pdfService.compressPDF(file);
                onFileUpdate(updated);
              } catch(e) { console.error(e); }
            }}
            className="p-1.5 md:p-2 border border-border-gold/40 text-gold hover:bg-gold/10 rounded-sm transition-all"
            title="Compress Matrix"
          >
            <Archive size={15} />
          </button>
          <button 
            onClick={() => {
              if(!file) return;
              alert("Converting sequence to images... Requires web worker extension in full implementation.");
            }}
            className="p-1.5 md:p-2 border border-border-gold/40 text-gold hover:bg-gold/10 rounded-sm transition-all"
            title="Convert to Imagery"
          >
            <ImageIcon size={15} />
          </button>

          <button 
            onClick={handleSplit}
            className="p-1.5 md:p-2 border border-border-gold/40 text-gold hover:bg-gold/10 rounded-sm transition-all"
            title="Matrix Split"
          >
            <Scissors size={15} />
          </button>

          <button 
            onClick={handleAddPageNumbers}
            className="p-1.5 md:p-2 border border-border-gold/40 text-gold hover:bg-gold/10 rounded-sm transition-all font-mono text-[8px] md:text-[9px] font-bold"
            title="Sequential Indices"
          >
            #P
          </button>

          <button 
            onClick={handleExtractText}
            className="p-1.5 md:p-2 border border-border-gold/40 text-gold hover:bg-gold/10 rounded-sm transition-all"
            title="Extract Data String"
          >
            <FileText size={15} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 order-2 md:order-3">
        <div className="flex items-center bg-black/40 rounded-sm border border-border-gold/50 overflow-hidden">
          <button 
            onClick={() => onScaleChange(Math.max(0.25, scale - 0.25))}
            className="p-1.5 md:p-2 text-gold hover:bg-gold/10 transition-all border-r border-border-gold/30"
          >
            <ZoomOut size={15} />
          </button>
          <div className="w-12 md:w-16 text-center font-mono text-[9px] md:text-[10px] uppercase font-bold text-gold/80">
            {Math.round(scale * 100)}%
          </div>
          <button 
            onClick={() => onScaleChange(Math.min(4, scale + 0.25))}
            className="p-1.5 md:p-2 text-gold hover:bg-gold/10 transition-all border-l border-border-gold/30"
          >
            <ZoomIn size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
