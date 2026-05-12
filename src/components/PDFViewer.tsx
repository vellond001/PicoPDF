import React, { useEffect, useRef, useState, useMemo } from 'react';
import { pdfService } from '../services/pdf';
import { ocrService } from '../services/ocr';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Type, Move, Bold, Italic, Underline, Palette, PaintBucket, List, GripHorizontal } from 'lucide-react';
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
  
  // Text editing states
  const [textItems, setTextItems] = useState<any[]>([]);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [textInputValue, setTextInputValue] = useState("");
  const [showFormattingToolbar, setShowFormattingToolbar] = useState(false);
  
  const [activeFormatting, setActiveFormatting] = useState({
    bold: false,
    italic: false,
    underline: false,
    fontFamily: 'sans-serif',
    color: { r: 0, g: 0, b: 0 },
    bgColor: { r: 255, g: 255, b: 255, a: 1 }
  });

  useEffect(() => {
    if (editMode !== 'text') {
      setEditingItem(null);
      setTextInputValue("");
      setShowFormattingToolbar(false);
    }
  }, [editMode]);

  const handleTextCommit = async () => {
    if (editingItem && textInputValue !== "") {
      // Calculate drawing box for whiteout rectangle
      const box = {
        x: editingItem.pdfX - 1, // small padding
        y: editingItem.pdfY - (editingItem.pdfHeight * 0.2) - 1, // cover descenders
        w: editingItem.pdfWidth + (textInputValue.length > editingItem.str.length ? 50 : 2), 
        h: editingItem.pdfHeight + 2
      };
      
      const updated = await pdfService.replaceText(
        file, 
        page, 
        textInputValue, 
        box, 
        editingItem.pdfFontSize,
        activeFormatting.color,
        activeFormatting.fontFamily,
        {
          bold: activeFormatting.bold,
          italic: activeFormatting.italic,
          underline: activeFormatting.underline,
          bgColor: activeFormatting.bgColor
        }
      );
      onUpdate(updated);
    }
    setEditingItem(null);
    setTextInputValue("");
  };

  const handleClick = async (e: React.MouseEvent) => {
    if (editMode === 'none' || !containerRef.current) return;

    const canvas = containerRef.current.querySelector('canvas');
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (editMode === 'text') {
      // Find the closest text item that we tapped near/on
      let closestItem = null;
      let minDistance = Infinity;

      for (const item of textItems) {
        const itemCenterX = item.left + (item.width / 2);
        const itemCenterY = item.top + (item.height / 2);
        
        // Expand bounding box slightly for mobile taps
        if (
          x >= item.left - 10 && x <= item.left + item.width + 10 &&
          y >= item.top - 10 && y <= item.top + item.height + 10
        ) {
          const dist = Math.pow(x - itemCenterX, 2) + Math.pow(y - itemCenterY, 2);
          if (dist < minDistance) {
            minDistance = dist;
            closestItem = item;
          }
        }
      }

      if (closestItem) {
        setEditingItem(closestItem);
        setTextInputValue(closestItem.str);
        
        const fontName = (closestItem.fontName || '').toLowerCase();
        setActiveFormatting({
          bold: fontName.includes('bold'),
          italic: fontName.includes('italic') || fontName.includes('oblique'),
          underline: false,
          fontFamily: closestItem.fontFamily || 'sans-serif',
          color: closestItem.color || { r: 0, g: 0, b: 0 },
          bgColor: closestItem.bgColor || { r: 255, g: 255, b: 255, a: 1 }
        });
      }
      return;
    }

    const pdfX = (x / scale);
    const pdfY = (canvas.height / (window.devicePixelRatio || 1) / scale) - (y / scale);

    if (editMode === 'watermark') {
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
        const pageObj = await pdf.getPage(page);
        const viewport = pageObj.getViewport({ scale });
        
        const canvas = await pdfService.renderPage(pdf, page, scale);
        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(canvas);
        
        // Extract text items for edit overlay
        const textContent = await pageObj.getTextContent();
        
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        const mappedItems = textContent.items
          .filter((item: any) => item.str.trim() !== '')
          .map((item: any, index: number) => {
            const tx = item.transform[4];
            const ty = item.transform[5];
            
            // Approximate font size using the transform matrix
            const fontSize = Math.sqrt(
              item.transform[2] * item.transform[2] + item.transform[3] * item.transform[3]
            ) || item.height;
            
            const [viewportX, viewportY] = viewport.convertToViewportPoint(tx, ty);
            const styleObj = textContent.styles[item.fontName];
            
            // Cascading Font Family Detection
            let fontFamily = 'sans-serif'; // Fallback
            if (styleObj && styleObj.fontFamily) {
              fontFamily = styleObj.fontFamily;
            } else {
              const fontName = (item.fontName || '').toLowerCase();
              if (fontName.includes('serif') && !fontName.includes('sans')) fontFamily = 'serif';
              else if (fontName.includes('courier') || fontName.includes('mono')) fontFamily = 'monospace';
            }
            
            // Cascading Color Detection
            let rgb = { r: 0, g: 0, b: 0 }; // Default black
            let bgColor = { r: 255, g: 255, b: 255, a: 1 }; // Default white background
            let colorFound = false;
            
            if (item.color) {
              rgb = {
                r: item.color[0] !== undefined ? item.color[0] : 0,
                g: item.color[1] !== undefined ? item.color[1] : 0,
                b: item.color[2] !== undefined ? item.color[2] : 0,
              };
              colorFound = true;
            } 
            
            if (ctx && fontSize > 0) {
              // Read exact pixels from the rendered canvas layer using device coordinates
              const pixelRatio = window.devicePixelRatio || 1;
              const boxX = Math.max(0, Math.floor(viewportX * pixelRatio));
              const boxY = Math.max(0, Math.floor((viewportY - (fontSize * scale)) * pixelRatio));
              const boxW = Math.max(1, Math.floor(item.width * scale * pixelRatio));
              const boxH = Math.max(1, Math.floor(fontSize * scale * 1.2 * pixelRatio));
              
              const scanW = Math.min(boxW, canvas.width - boxX);
              const scanH = Math.min(boxH, canvas.height - boxY);
              
              if (scanW > 0 && scanH > 0) {
                try {
                  const imgData = ctx.getImageData(boxX, boxY, scanW, scanH).data;
                  let colorCounts: Record<string, { r: number, g: number, b: number, count: number }> = {};
                  
                  for (let i = 0; i < imgData.length; i += 4) {
                    const r = imgData[i], g = imgData[i+1], b = imgData[i+2], a = imgData[i+3];
                    if (a > 50) {
                      const key = `${Math.floor(r/10)},${Math.floor(g/10)},${Math.floor(b/10)}`;
                      if (!colorCounts[key]) colorCounts[key] = { r, g, b, count: 0 };
                      colorCounts[key].count++;
                    }
                  }
                  
                  // Sort colors by frequency
                  const sortedColors = Object.values(colorCounts).sort((a, b) => b.count - a.count);
                  if (sortedColors.length > 0) {
                    // Most dominant color is typically the background
                    bgColor = { r: sortedColors[0].r, g: sortedColors[0].g, b: sortedColors[0].b, a: 1 };
                    
                    if (!colorFound) {
                      // Look for contrasting color for text
                      for (let i = 1; i < sortedColors.length; i++) {
                        const bg = sortedColors[0];
                        const textC = sortedColors[i];
                        const contrast = Math.abs(bg.r - textC.r) + Math.abs(bg.g - textC.g) + Math.abs(bg.b - textC.b);
                        if (contrast > 60) { // Enough difference
                          rgb = { r: textC.r, g: textC.g, b: textC.b };
                          break;
                        }
                      }
                    }
                  }
                } catch(e) { } // Ignore cross-origin canvas errors if any
              }
            }
            
            return {
              id: index,
              str: item.str,
              pdfX: tx,
              pdfY: ty,
              width: item.width * scale,
              height: Math.max(item.height * scale, fontSize * scale),
              fontSize: fontSize * scale,
              left: viewportX,
              // Move box slightly above baseline
              top: viewportY - (fontSize * scale * 0.8),
              pdfFontSize: fontSize,
              pdfWidth: item.width,
              pdfHeight: item.height,
              color: rgb,
              bgColor: bgColor,
              fontFamily,
              fontName: item.fontName || '',
            };
          });
          
        setTextItems(mappedItems);
        
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

      <div className="relative shadow-[0_20px_50px_rgba(0,0,0,0.2)] inline-block">
        <div 
          ref={containerRef} 
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={cn(
            "bg-white transition-transform duration-300 relative",
            editMode !== 'none' ? "cursor-crosshair" : "cursor-default"
          )}
        />
        
        {/* Text Items Overlay */}
        {editMode === 'text' && !loading && (
          <div className="absolute inset-0 pointer-events-none">
            {textItems.map(item => (
              <div
                key={item.id}
                className="absolute border border-transparent hover:border-gold/50 transition-colors bg-white/0 hover:bg-gold/10"
                style={{
                  left: item.left,
                  top: item.top,
                  width: item.width + 10,
                  height: item.height + 4,
                }}
              />
            ))}
          </div>
        )}

        {/* Active Edit Input Overlay */}
        {editingItem && editMode === 'text' && (
          <form 
            className="absolute z-10 m-0 p-0"
            style={{ 
              left: editingItem.left, 
              // align text input perfectly
              top: editingItem.top
            }}
            onSubmit={(e) => { e.preventDefault(); handleTextCommit(); }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <input
              autoFocus
              type="text"
              className="bg-white text-black outline-none m-0 p-0 shadow-[0_0_0_2px_rgba(255,215,0,0.5)] focus:shadow-[0_0_0_2px_rgba(255,215,0,0.8)] focus:border-gold border border-transparent"
              style={{
                width: Math.max(editingItem.width + 50, 150),
                height: editingItem.height,
                lineHeight: `${editingItem.height}px`,
                fontSize: editingItem.fontSize,
                fontFamily: (activeFormatting.fontFamily.toLowerCase().includes('serif') && !activeFormatting.fontFamily.toLowerCase().includes('sans')) || activeFormatting.fontFamily.toLowerCase().includes('times') ? 'serif' : activeFormatting.fontFamily.toLowerCase().includes('mono') || activeFormatting.fontFamily.toLowerCase().includes('courier') ? 'monospace' : 'sans-serif',
                fontWeight: activeFormatting.bold ? 'bold' : 'normal',
                fontStyle: activeFormatting.italic ? 'italic' : 'normal',
                textDecoration: activeFormatting.underline ? 'underline' : 'none',
                color: `rgb(${activeFormatting.color.r}, ${activeFormatting.color.g}, ${activeFormatting.color.b})`,
                backgroundColor: `rgba(${activeFormatting.bgColor.r}, ${activeFormatting.bgColor.g}, ${activeFormatting.bgColor.b}, ${activeFormatting.bgColor.a})`
              }}
              value={textInputValue}
              onChange={e => setTextInputValue(e.target.value)}
              placeholder=" "
              onBlur={handleTextCommit} // save on focus loss
            />
          </form>
        )}
      </div>

      {/* Editing Overlay (Visual purely for demo in this turn, real edits in next steps) */}
      {editMode === 'text' && (
        <div className="absolute top-0 right-[-140px] p-4 hidden lg:block pointer-events-none">
          <div className="bg-[#141414] text-white text-[10px] uppercase font-mono px-2 py-1 flex items-center gap-2 rounded shadow-md border border-white/10">
            <Type size={12} />
            Text Edit Mode Active
          </div>
        </div>
      )}

      {/* Draggable Formatting Toolbar */}
      <AnimatePresence>
        {editMode === 'text' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            drag
            dragMomentum={false}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-white border border-gray-200 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] flex items-center p-1.5 gap-1 cursor-move"
          >
            <div className="px-2 text-gray-400 cursor-grab active:cursor-grabbing hover:text-gray-600 transition-colors">
              <GripHorizontal size={16} />
            </div>
            
            <button
               onClick={(e) => { e.stopPropagation(); setShowFormattingToolbar(prev => !prev); }}
               className={cn("p-1.5 px-3 rounded-md hover:bg-gray-100 transition-colors text-xs font-semibold uppercase flex items-center gap-2", showFormattingToolbar ? "bg-gray-100 text-black shadow-sm" : "text-gray-500")}
               title="Toggle Advanced Text Tools"
            >
              <Type size={14} />
              {showFormattingToolbar ? "Hide Tools" : "Tools"}
            </button>
            
            {showFormattingToolbar && (
              <>
                <div className="h-6 w-px bg-gray-200 mx-1" />
                
                <button
                   onClick={(e) => { e.stopPropagation(); setActiveFormatting(prev => ({...prev, bold: !prev.bold})) }}
                   className={cn("p-2 rounded hover:bg-gray-100 transition-colors", activeFormatting.bold && "bg-gray-200 shadow-inner")}
                   title="Bold"
                >
                  <Bold size={16} className={activeFormatting.bold ? "text-black" : "text-gray-600"} />
                </button>
                <button
                   onClick={(e) => { e.stopPropagation(); setActiveFormatting(prev => ({...prev, italic: !prev.italic})) }}
                   className={cn("p-2 rounded hover:bg-gray-100 transition-colors", activeFormatting.italic && "bg-gray-200 shadow-inner")}
                   title="Italic"
                >
                  <Italic size={16} className={activeFormatting.italic ? "text-black" : "text-gray-600"} />
                </button>
                <button
                   onClick={(e) => { e.stopPropagation(); setActiveFormatting(prev => ({...prev, underline: !prev.underline})) }}
                   className={cn("p-2 rounded hover:bg-gray-100 transition-colors", activeFormatting.underline && "bg-gray-200 shadow-inner")}
                   title="Underline"
                >
                  <Underline size={16} className={activeFormatting.underline ? "text-black" : "text-gray-600"} />
                </button>

                <div className="h-6 w-px bg-gray-200 mx-1" />

                <div className="flex items-center gap-1 bg-gray-50 rounded-md border border-gray-100 px-1">
                  <Type size={14} className="text-gray-400 ml-1" />
                  <select 
                    value={
                      (activeFormatting.fontFamily.toLowerCase().includes('serif') && !activeFormatting.fontFamily.toLowerCase().includes('sans')) || activeFormatting.fontFamily.toLowerCase().includes('times') ? 'serif' : 
                      activeFormatting.fontFamily.toLowerCase().includes('mono') || activeFormatting.fontFamily.toLowerCase().includes('courier') ? 'monospace' : 'sans-serif'
                    }
                    onChange={(e) => { e.stopPropagation(); setActiveFormatting(prev => ({...prev, fontFamily: e.target.value})) }}
                    className="p-1.5 text-sm font-medium text-gray-700 border-none bg-transparent hover:bg-gray-100 rounded cursor-pointer outline-none w-28 appearance-none"
                  >
                    <option value="sans-serif">Sans Serif</option>
                    <option value="serif">Serif (Times)</option>
                    <option value="monospace">Monospace</option>
                  </select>
                </div>

                <div className="h-6 w-px bg-gray-200 mx-1" />

                <div className="relative group flex items-center">
                  <button className="p-2 rounded hover:bg-gray-100 transition-colors relative" title="Text Color">
                    <Palette size={16} className="text-gray-600" />
                    <div className="absolute bottom-1 left-2 right-2 h-[3px] rounded-full" style={{ backgroundColor: `rgb(${activeFormatting.color.r}, ${activeFormatting.color.g}, ${activeFormatting.color.b})` }} />
                  </button>
                  <input 
                    type="color" 
                    value={`#${activeFormatting.color.r.toString(16).padStart(2, '0')}${activeFormatting.color.g.toString(16).padStart(2, '0')}${activeFormatting.color.b.toString(16).padStart(2, '0')}`}
                    onChange={(e) => {
                      e.stopPropagation();
                      const hex = e.target.value;
                      const r = parseInt(hex.slice(1, 3), 16);
                      const g = parseInt(hex.slice(3, 5), 16);
                      const b = parseInt(hex.slice(5, 7), 16);
                      setActiveFormatting(prev => ({...prev, color: { r, g, b }}));
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </div>

                <div className="relative group flex items-center">
                  <button className="p-2 rounded hover:bg-gray-100 transition-colors relative" title="Background Fill">
                    <PaintBucket size={16} className="text-gray-600" />
                    <div className="absolute bottom-1 left-2 right-2 h-[3px] rounded-full" style={{ backgroundColor: activeFormatting.bgColor.a > 0 ? `rgb(${activeFormatting.bgColor.r}, ${activeFormatting.bgColor.g}, ${activeFormatting.bgColor.b})` : 'transparent', border: activeFormatting.bgColor.a > 0 ? 'none' : '1px solid #ccc' }} />
                  </button>
                  <input 
                    type="color" 
                    value={`#${activeFormatting.bgColor.r.toString(16).padStart(2, '0')}${activeFormatting.bgColor.g.toString(16).padStart(2, '0')}${activeFormatting.bgColor.b.toString(16).padStart(2, '0')}`}
                    onChange={(e) => {
                      e.stopPropagation();
                      const hex = e.target.value;
                      const r = parseInt(hex.slice(1, 3), 16);
                      const g = parseInt(hex.slice(3, 5), 16);
                      const b = parseInt(hex.slice(5, 7), 16);
                      setActiveFormatting(prev => ({...prev, bgColor: { r, g, b, a: 1 }}));
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </div>

                <div className="h-6 w-px bg-gray-200 mx-1" />

                <div className="flex bg-gray-50 rounded-lg p-0.5 border border-gray-100">
                  <button
                    onClick={(e) => { e.stopPropagation(); setActiveFormatting(prev => ({...prev, bgColor: { r: 255, g: 255, b: 255, a: 0 }})) }}
                    className={cn("text-[10px] uppercase font-bold px-2 py-1.5 transition-colors rounded-md", activeFormatting.bgColor.a === 0 ? "bg-white shadow-sm text-black" : "text-gray-500 hover:text-gray-700")}
                    title="Transparent Fill (No Background)"
                  >
                    Clear
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setActiveFormatting(prev => ({...prev, bgColor: { r: 255, g: 255, b: 255, a: 1 }})) }}
                    className={cn("text-[10px] uppercase font-bold px-2 py-1.5 transition-colors rounded-md", activeFormatting.bgColor.a === 1 && activeFormatting.bgColor.r === 255 && activeFormatting.bgColor.g === 255 && activeFormatting.bgColor.b === 255 ? "bg-white shadow-sm text-black" : "text-gray-500 hover:text-gray-700")}
                    title="Whiteout Fill (Erase behind)"
                  >
                    Whiteout
                  </button>
                </div>
                
                <div className="h-6 w-px bg-gray-200 mx-1" />
                
                <button
                   onClick={(e) => { 
                     e.stopPropagation(); 
                     setTextInputValue(prev => prev.startsWith('• ') ? prev.substring(2) : `• ${prev}`);
                   }}
                   className={cn("p-2 rounded hover:bg-gray-100 transition-colors", textInputValue.startsWith('• ') ? "bg-gray-200 shadow-inner" : "")}
                   title="Bullet List"
                >
                  <List size={16} className={textInputValue.startsWith('• ') ? "text-black" : "text-gray-600"} />
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

