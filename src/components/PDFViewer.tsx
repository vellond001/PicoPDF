import React, { useEffect, useRef, useState, useMemo } from 'react';
import { pdfService } from '../services/pdf';
import { ocrService } from '../services/ocr';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Type, Move } from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';
import { cn } from '../lib/utils';

interface PDFViewerProps {
  file: ArrayBuffer;
  page: number;
  scale: number;
  editMode: 'none' | 'text' | 'watermark' | 'draw';
  onUpdate: (data: Uint8Array) => void;
}

export default function PDFViewer({ file, page, scale, editMode, onUpdate }: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawingPath, setDrawingPath] = useState<{ x: number, y: number }[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    if (editMode === 'none' || !containerRef.current) return;

    const canvas = containerRef.current.querySelector('canvas');
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Translate to PDF coordinates
    // PDF coordinates are (0,0) at bottom left. Canvas is (0,0) at top left.
    const pdfX = (x / scale);
    const pdfY = (canvas.height / (window.devicePixelRatio || 1) / scale) - (y / scale);

    if (editMode === 'text') {
      const text = prompt('Enter text to insert:');
      if (text) {
        const updated = await pdfService.insertText(file, page, text, pdfX, pdfY);
        onUpdate(updated);
      }
    } else if (editMode === 'watermark') {
      const updated = await pdfService.addWatermark(file, 'DRAFT');
      onUpdate(updated);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (editMode !== 'draw' || !containerRef.current) return;
    setIsDrawing(true);
    const canvas = containerRef.current.querySelector('canvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pdfX = (x / scale);
    const pdfY = (canvas.height / (window.devicePixelRatio || 1) / scale) - (y / scale);
    setDrawingPath([{ x: pdfX, y: pdfY }]);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || editMode !== 'draw' || !containerRef.current) return;
    const canvas = containerRef.current.querySelector('canvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pdfX = (x / scale);
    const pdfY = (canvas.height / (window.devicePixelRatio || 1) / scale) - (y / scale);
    setDrawingPath(prev => [...prev, { x: pdfX, y: pdfY }]);
  };

  const handleMouseUp = async () => {
    if (!isDrawing || editMode !== 'draw' || drawingPath.length < 2) {
      setIsDrawing(false);
      setDrawingPath([]);
      return;
    }
    const updated = await pdfService.applyDrawing(file, page, drawingPath);
    onUpdate(updated);
    setIsDrawing(false);
    setDrawingPath([]);
  };

  useEffect(() => {
    let active = true;
    let localPdf: pdfjs.PDFDocumentProxy | null = null;
    
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const loadedPdf = await pdfService.loadPDF(file);
        localPdf = loadedPdf;
        if (active) {
          setPdf(loadedPdf);
        } else {
          loadedPdf.destroy();
        }
      } catch (e: any) {
        if (active) setError(e.message);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    
    return () => {
      active = false;
      if (localPdf) {
        localPdf.destroy();
      }
    };
  }, [file]);

  useEffect(() => {
    const render = async () => {
      if (!pdf || !containerRef.current) return;
      setLoading(true);
      try {
        const canvas = await pdfService.renderPage(pdf, page, scale);
        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(canvas);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    render();
  }, [pdf, page, scale]);

  return (
    <div className="relative flex flex-col items-center">
      <AnimatePresence>
        {loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex items-center justify-center bg-white/20 backdrop-blur-sm"
          >
            <Loader2 className="animate-spin text-[#141414]" size={48} />
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="p-4 bg-red-100 border border-red-500 text-red-700 rounded mb-4 font-mono text-xs">
          CRITICAL ERROR: {error}
        </div>
      )}

      <div 
        ref={containerRef} 
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={cn(
          "bg-white shadow-[0_20px_50px_rgba(0,0,0,0.2)] transition-transform duration-300 relative",
          editMode !== 'none' ? "cursor-crosshair" : "cursor-default"
        )}
      />

      {/* Editing Overlay (Visual purely for demo in this turn, real edits in next steps) */}
      {editMode === 'text' && (
        <div className="absolute top-0 right-0 p-4">
          <div className="bg-[#141414] text-white text-[10px] uppercase font-mono px-2 py-1 flex items-center gap-2 rounded">
            <Type size={12} />
            Edit Mode Active
          </div>
        </div>
      )}
    </div>
  );
}

