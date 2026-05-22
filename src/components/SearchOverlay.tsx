import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, X, Loader2 } from 'lucide-react';
import { ocrService } from '../services/ocr';
import { pdfService } from '../services/pdf';

interface SearchOverlayProps {
  file: ArrayBuffer | null;
  onClose: () => void;
  onResultClick: (page: number, bbox: any) => void;
}

export default function SearchOverlay({ file, onClose, onResultClick }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !file) return;

    setIsSearching(true);
    setResults([]);
    setProgress(0);

    try {
      const pdf = await pdfService.loadPDF(file);
      const totalPages = pdf.numPages;
      const allResults = [];
      const lowerQuery = query.toLowerCase();

      for (let i = 1; i <= totalPages; i++) {
        // Render page at a reasonable scale for fast OCR, but clear enough for accuracy
        const canvas = await pdfService.renderPage(pdf, i, 1.5);
        
        // Pass canvas directly to Tesseract
        const words = await ocrService.getWords(canvas);
        
        for (const word of words) {
          if (word.text.toLowerCase().includes(lowerQuery)) {
            // Tesseract bbox is { x0, y0, x1, y1 }
            const bbox = word.bbox;
            allResults.push({
              id: `${i}-${bbox.x0}-${bbox.y0}`,
              page: i,
              text: word.text,
              bbox: bbox, // these are relative to the canvas rendered at scale 1.5
              scale: 1.5
            });
          }
        }
        
        setProgress(Math.round((i / totalPages) * 100));
        setResults([...allResults]); // update progressively
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="fixed top-[60px] right-[20px] w-80 bg-panel border border-border-gold shadow-2xl z-50 flex flex-col font-sans" style={{ maxHeight: 'calc(100vh - 100px)' }}>
      <div className="flex items-center justify-between p-3 border-b border-border-gold/50 bg-black/20">
        <h3 className="text-gold font-mono text-xs uppercase tracking-widest flex items-center gap-2">
          <Search size={14} /> Global Search (OCR)
        </h3>
        <button onClick={onClose} className="text-white/50 hover:text-white">
          <X size={16} />
        </button>
      </div>

      <div className="p-4 flex flex-col flex-1 min-h-0">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search all pages..."
            className="flex-1 bg-black/40 border border-border-gold/50 rounded p-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-gold"
          />
          <button 
            type="submit" 
            disabled={isSearching || !query.trim()}
            className="bg-gold text-black px-3 py-2 rounded text-sm font-semibold disabled:opacity-50 hover:bg-white transition-colors"
          >
            {isSearching ? <Loader2 size={16} className="animate-spin" /> : 'Find'}
          </button>
        </form>

        {isSearching && (
          <div className="mt-4 flex flex-col gap-1">
            <div className="text-[10px] text-white/50 font-mono uppercase">Scanning Pages... {progress}%</div>
            <div className="h-1 bg-black/50 rounded-full overflow-hidden border border-border-gold/20">
              <motion.div 
                className="h-full bg-gold"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto mt-4 custom-scrollbar pr-1 flex flex-col gap-2">
          {!isSearching && results.length === 0 && query && (
             <div className="text-white/50 text-xs italic text-center py-4">No results found</div>
          )}
          
          {results.map((res) => (
            <button
              key={res.id}
              onClick={() => onResultClick(res.page, res)}
              className="w-full text-left bg-black/20 hover:bg-gold/10 border border-transparent hover:border-gold/30 p-2 rounded transition-colors group flex items-start gap-3"
            >
              <div className="w-8 h-8 rounded bg-black/40 border border-border-gold/30 flex items-center justify-center font-mono text-[10px] text-gold shrink-0 mt-1">
                P{res.page}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm truncate font-medium group-hover:text-gold transition-colors">{res.text}</div>
                <div className="text-white/40 text-[10px] font-mono mt-1">x:{res.bbox.x0} y:{res.bbox.y0}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
