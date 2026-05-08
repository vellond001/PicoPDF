import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Settings, 
  Activity, 
  Layers, 
  Cpu, 
  ShieldCheck, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  Trash2,
  Download,
  Info,
  Maximize2,
  Minus,
  FolderTree,
  Database
} from 'lucide-react';
import { pdfService } from './services/pdf';
import { awareness } from './services/awareness';
import { cascade } from './services/cascade';
import PDFViewer from './components/PDFViewer';
import Sidebar from './components/Sidebar';
import Toolbar from './components/Toolbar';
import AIChat from './components/AIChat';
import MetricsOverlay from './components/MetricsOverlay';
import TokenPanel from './components/TokenPanel';
import OrganiserPanel from './components/OrganiserPanel';
import SettingsOverlay from './components/SettingsOverlay';
import AboutOverlay from './components/AboutOverlay';
import { cn } from './lib/utils';

export default function App() {
  const [file, setFile] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);
  const [showMetrics, setShowMetrics] = useState(false);
  const [showTokenPanel, setShowTokenPanel] = useState(false);
  const [showOrganiser, setShowOrganiser] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [editMode, setEditMode] = useState<'none' | 'text' | 'watermark' | 'draw'>('none');
  const [health, setHealth] = useState(100);
  const [isLiteMode, setIsLiteMode] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      const isMobile = window.innerWidth < 768 || navigator.maxTouchPoints > 0;
      setIsLiteMode(isMobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Monitor health
  useEffect(() => {
    const timer = setInterval(() => {
      setHealth(awareness.getHealthScore('UI'));
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleFileLoad = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const buffer = await file.arrayBuffer();
      setFile(buffer);
      setCurrentPage(1);
      awareness.recordSuccess('UI-file-load');
    }
  }, []);

  const onFileUpdate = useCallback((newBuffer: Uint8Array) => {
    setFile(newBuffer.buffer as ArrayBuffer);
  }, []);

  return (
    <div className={cn(
      "flex h-dvh w-dvw flex-col bg-dark-bg text-[#D1D1D1] font-sans overflow-hidden",
      isLiteMode && "lite-mode"
    )}>
      {/* Header */}
      <header className="h-16 md:h-20 border-b border-border-gold flex items-center justify-between px-4 md:px-10 bg-panel z-20 shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 md:p-2 border border-border-gold text-gold hover:bg-gold hover:text-black rounded-sm transition-all"
          >
            <Layers size={18} className="md:w-5 md:h-5" />
          </button>
          <div className="flex flex-col">
            <span className="text-[8px] md:text-[10px] tracking-[0.3em] uppercase text-gold opacity-60">System Audit Protocol</span>
            <h1 className="serif text-xl md:text-3xl font-semibold tracking-wide text-white flex items-center gap-2 md:gap-3">
              PicoPDF <span className="text-xs md:text-sm italic font-light opacity-50">v1.0.4</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4 md:gap-8">
          <div className="hidden sm:flex text-right items-center gap-3">
            <div>
              <p className="text-[10px] tracking-widest uppercase opacity-40">Health</p>
              <p className="serif text-xl md:text-2xl text-gold">{health}%</p>
            </div>
            <Activity size={20} className={cn(health < 50 ? "status-alert animate-pulse" : "status-check")} />
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={() => {
                if (!file) return;
                const blob = new Blob([file], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName || 'document.pdf';
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="border border-gold px-3 md:px-6 py-1.5 md:py-2 text-gold text-[9px] md:text-[10px] tracking-[0.2em] md:tracking-[0.3em] uppercase hover:bg-gold hover:text-black transition-colors rounded-sm flex items-center gap-2"
              title="Export Current Artifact"
            >
              <Download size={12} className="md:w-3.5 md:h-3.5" />
              <span className="hidden xs:inline">Export</span>
            </button>
            <div className="hidden xs:block h-8 md:h-10 w-[1px] bg-gold opacity-20 mx-1 md:mx-0"></div>
            
            <button 
              onClick={() => setShowOrganiser(true)}
              className="border border-border-gold p-1.5 md:p-2 text-gold hover:bg-gold hover:text-black transition-colors rounded-sm"
              title="Auto-Organiser & Batch"
            >
              <FolderTree size={18} className="md:w-5 md:h-5" />
            </button>

            <button 
              onClick={() => setShowTokenPanel(true)}
              className="border border-border-gold p-1.5 md:p-2 text-gold hover:bg-gold hover:text-black transition-colors rounded-sm"
              title="Token Ledger"
            >
              <Database size={18} className="md:w-5 md:h-5" />
            </button>

            <button 
              onClick={() => setShowMetrics(!showMetrics)}
              className="border border-border-gold p-1.5 md:p-2 text-gold hover:bg-gold hover:text-black transition-colors rounded-sm"
              title="Diagnostics"
            >
              <Cpu size={18} className="md:w-5 md:h-5" />
            </button>
            <button 
              onClick={() => setShowSettings(true)}
              className="border border-border-gold px-2 py-1.5 md:px-3 md:py-2 text-gold hover:bg-gold hover:text-black transition-colors rounded-sm flex items-center gap-2"
              title="API Settings"
            >
              <Settings size={18} className="md:w-5 md:h-5" />
              <span className="hidden sm:inline text-xs uppercase tracking-widest font-bold">Settings</span>
            </button>
            <button 
              onClick={() => setShowAbout(true)}
              className="border border-border-gold px-2 py-1.5 md:px-3 md:py-2 text-gold hover:bg-gold hover:text-black transition-colors rounded-sm flex items-center gap-2"
              title="About & Legal"
            >
              <Info size={18} className="md:w-5 md:h-5" />
              <span className="hidden sm:inline text-xs uppercase tracking-widest font-bold">About</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Sidebar */}
        <Sidebar 
          isOpen={sidebarOpen} 
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          file={file}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onTotalPages={setTotalPages}
        />

        {/* Viewer Area */}
        <div className="flex-1 flex flex-col items-center bg-content-bg overflow-hidden relative">
          <Toolbar 
            file={file}
            currentPage={currentPage}
            totalPages={totalPages}
            scale={scale}
            onPageChange={setCurrentPage}
            onScaleChange={setScale}
            onFileLoad={handleFileLoad}
            editMode={editMode}
            onEditModeChange={setEditMode}
            fileName={fileName}
            onFileUpdate={onFileUpdate}
          />

          <div className="flex-1 w-full overflow-auto p-8 custom-scrollbar">
            {file ? (
              <PDFViewer 
                file={file} 
                page={currentPage} 
                scale={scale}
                editMode={editMode}
                onUpdate={onFileUpdate}
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center p-12 border-2 border-dashed border-border-gold opacity-30 rounded-xl space-y-4">
                  <FileText size={48} className="mx-auto text-gold" />
                  <p className="serif text-xl italic text-white">No PDF Under Assessment</p>
                  <label className="block px-8 py-3 border border-gold text-gold text-[10px] tracking-widest uppercase hover:bg-gold hover:text-black cursor-pointer transition-all">
                    Initialize Protocol
                    <input type="file" className="hidden" accept=".pdf" onChange={handleFileLoad} />
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* AI Chat Drawer */}
        <AIChat file={file} />
      </main>

      {/* Footer Bar */}
      <footer className="h-10 md:h-12 border-t border-border-gold bg-panel flex items-center justify-between px-4 md:px-10 shrink-0">
        <div className="flex gap-4 md:gap-6">
          <span className="text-[8px] md:text-[9px] tracking-widest uppercase opacity-40 truncate max-w-[150px] md:max-w-none">Support: security@omniengine.internal</span>
          <span className="hidden sm:inline text-[9px] tracking-widest uppercase opacity-40">Author: {awareness.getConfidence('UI') > 0.8 ? 'Integrity Orchestrator' : 'Assessment Engine'}</span>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <div className="flex gap-1">
            <div className="w-1 h-1 bg-gold"></div>
            <div className="w-1 h-1 bg-gold"></div>
            <div className={cn("w-1 h-1 bg-gold", health < 90 && "opacity-20")}></div>
          </div>
          <span className="text-[8px] md:text-[9px] tracking-widest uppercase text-gold">Status: {health > 90 ? 'Integrity Verified' : 'Assessment'}</span>
        </div>
      </footer>

      <AnimatePresence>
        {showMetrics && (
          <MetricsOverlay onClose={() => setShowMetrics(false)} />
        )}
        {showTokenPanel && (
          <TokenPanel onClose={() => setShowTokenPanel(false)} />
        )}
        {showOrganiser && (
          <OrganiserPanel onClose={() => setShowOrganiser(false)} />
        )}
        {showSettings && (
          <SettingsOverlay onClose={() => setShowSettings(false)} />
        )}
        {showAbout && (
          <AboutOverlay onClose={() => setShowAbout(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
