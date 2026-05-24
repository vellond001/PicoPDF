import React, { useState, useCallback, useEffect } from 'react';
import { Joyride, Step } from 'react-joyride';
import { motion, AnimatePresence } from 'motion/react';
import { get, set } from 'idb-keyval';
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
import SearchOverlay from './components/SearchOverlay';
import MetadataModal from './components/MetadataModal';
import { cn } from './lib/utils';
import { AccessGate } from './components/AccessGate';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  const [hasAccess, setHasAccess] = useState(true);
  const [history, setHistory] = useState<{ past: ArrayBuffer[], present: ArrayBuffer | null, future: ArrayBuffer[] }>({
    past: [],
    present: null,
    future: []
  });
  const file = history.present;
  const [fileName, setFileName] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);
  const [showMetrics, setShowMetrics] = useState(false);
  const [showTokenPanel, setShowTokenPanel] = useState(false);
  const [showOrganiser, setShowOrganiser] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [highlightBBox, setHighlightBBox] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editMode, setEditMode] = useState<'none' | 'text' | 'watermark' | 'draw'>('none');
  const [health, setHealth] = useState(100);
  const [isLiteMode, setIsLiteMode] = useState(false);
  const [tourSteps, setTourSteps] = useState<Step[]>([]);
  const [runTour, setRunTour] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Auto-Save feature
  useEffect(() => {
    // Attempt to load from IndexedDB on initial mount
    const loadSavedDoc = async () => {
      try {
        const savedBuffer = await get('saved-pdf');
        if (savedBuffer && !file) {
          setHistory({ past: [], present: savedBuffer, future: [] });
          setFileName('Restored_Document.pdf');
        }
      } catch (err) {
        console.error('Failed to restore document', err);
      }
    };
    loadSavedDoc();
  }, []); // Only on mount

  useEffect(() => {
    // Save to IndexedDB at regular intervals if file exists
    const saveObj = async () => {
      if (file) {
        try {
          await set('saved-pdf', file);
          setLastSaved(new Date());
        } catch (err) {
          console.error('Failed to auto-save', err);
        }
      }
    };

    // Save immediately when file updates
    saveObj();

    // And also save on an interval
    const interval = setInterval(() => {
      saveObj();
    }, 15000); // 15 seconds

    return () => clearInterval(interval);
  }, [file]);

  useEffect(() => {
    (window as any).triggerTour = (steps: any[]) => {
       // Validate that elements for each step exist in the DOM before setting the tour.
       const validSteps = steps.filter(step => {
         try {
           return step.target && document.querySelector(step.target) !== null;
         } catch(e) {
           return false;
         }
       });

       if (validSteps.length > 0) {
         setTourSteps(validSteps);
         setRunTour(true);
       } else {
         if (typeof (window as any).sendAIFeedback === 'function') {
           (window as any).sendAIFeedback("Failed to start tutorial: I couldn't find the UI elements I tried to highlight. I might need to try different selectors.");
         }
       }
    };
  }, []);

  const handleJoyrideCallback = (data: any) => {
    const { status, action } = data;
    if (['finished', 'skipped'].includes(status)) {
      setRunTour(false);
      setTourSteps([]);
      
      if (typeof (window as any).sendAIFeedback === 'function') {
         if (status === 'skipped') {
           (window as any).sendAIFeedback("The user skipped or closed the tutorial prematurely.");
         } else {
           (window as any).sendAIFeedback("The user successfully completed the interactive tutorial.");
         }
      }
    }
  };

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
    const fileLoad = e.target.files?.[0];
    if (fileLoad) {
      setFileName(fileLoad.name);
      const buffer = await fileLoad.arrayBuffer();
      setHistory({ past: [], present: buffer, future: [] });
      setCurrentPage(1);
      awareness.recordSuccess('UI-file-load');
    }
    // Clear input so the same file can be selected again
    e.target.value = '';
  }, []);

  const onFileUpdate = useCallback((newBuffer: Uint8Array) => {
    setHistory(prev => ({
      past: prev.present ? [...prev.past, prev.present].slice(-20) : prev.past,
      present: newBuffer.buffer as ArrayBuffer,
      future: []
    }));
  }, []);

  const undo = useCallback(() => {
    setHistory(prev => {
      if (prev.past.length === 0 || !prev.present) return prev;
      const newPast = [...prev.past];
      const previous = newPast.pop()!;
      return {
        past: newPast,
        present: previous,
        future: [prev.present, ...prev.future]
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory(prev => {
      if (prev.future.length === 0 || !prev.present) return prev;
      const newFuture = [...prev.future];
      const next = newFuture.shift()!;
      return {
        past: [...prev.past, prev.present],
        present: next,
        future: newFuture
      };
    });
  }, []);

  useEffect(() => {
    const handleGlobalPaste = async (e: ClipboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const pasteFile = e.clipboardData?.files?.[0];
      if (pasteFile && pasteFile.type === 'application/pdf') {
        setFileName(pasteFile.name);
        const buffer = await pasteFile.arrayBuffer();
        setHistory({ past: [], present: buffer, future: [] });
        setCurrentPage(1);
        awareness.recordSuccess('UI-file-paste');
      }
    };
    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, []);

  const handleExport = useCallback(() => {
    if (!file) return;
    const blob = new Blob([file], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'document.pdf';
    a.click();
    URL.revokeObjectURL(url);
  }, [file, fileName]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Escape') {
          e.target.blur();
        }
        return;
      }

      const cmdOrCtrl = e.metaKey || e.ctrlKey;

      if (e.key === 'Escape') {
        setShowSettings(false);
        setShowAbout(false);
        setShowMetadata(false);
        setShowOrganiser(false);
        setShowTokenPanel(false);
        setShowMetrics(false);
      }

      if (e.key === 'ArrowLeft') {
        setCurrentPage(prev => Math.max(1, prev - 1));
        return;
      }
      if (e.key === 'ArrowRight') {
        setCurrentPage(prev => Math.min(totalPages, prev + 1));
        return;
      }

      if (cmdOrCtrl) {
        switch (e.key.toLowerCase()) {
          case 'c':
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if (file) {
              e.preventDefault();
              try {
                const blob = new Blob([file], { type: 'application/pdf' });
                // Some browsers support this:
                const item = new ClipboardItem({ 'application/pdf': blob });
                navigator.clipboard.write([item]).catch(() => {
                  console.log('PDF copy via ClipboardItem not supported in this browser context.');
                });
                awareness.recordSuccess('UI-file-copy');
              } catch (err) {
                console.log('Failed to copy PDF');
              }
            }
            break;
          case 'r':
            e.preventDefault();
            setRefreshKey(prev => prev + 1);
            break;
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
            break;
          case 'y':
            e.preventDefault();
            redo();
            break;
          case 'o':
            e.preventDefault();
            document.getElementById('global-file-upload')?.click();
            break;
          case 'b':
            e.preventDefault();
            setSidebarOpen(prev => !prev);
            break;
          case 'i':
            e.preventDefault();
            setShowMetadata(true);
            break;
          case 's':
            e.preventDefault();
            handleExport();
            break;
          case ',':
            e.preventDefault();
            setShowSettings(true);
            break;
          case '/':
            e.preventDefault();
            setShowAbout(true);
            break;
          case '=':
          case '+':
            e.preventDefault();
            setScale(prev => Math.min(4, prev + 0.25));
            break;
          case '-':
            e.preventDefault();
            setScale(prev => Math.max(0.25, prev - 0.25));
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleExport]);

  return (
    <ErrorBoundary onResetSession={() => setHasAccess(false)}>
      {!hasAccess ? (
        <AccessGate onAccessGranted={() => setHasAccess(true)} />
      ) : (
        <>
          <Joyride 
            steps={tourSteps} 
            run={runTour} 
        onEvent={handleJoyrideCallback} 
        continuous
        options={{
          arrowColor: '#ffffff',
          backgroundColor: '#ffffff',
          overlayColor: 'rgba(0, 0, 0, 0.75)',
          primaryColor: '#D4AF37',
          textColor: '#1a1a1a',
          zIndex: 10000,
          showProgress: true,
          buttons: ['back', 'close', 'primary', 'skip'] as any[]
        }}
        styles={{
          buttonPrimary: {
            backgroundColor: '#1a1a1a',
            color: '#D4AF37',
            fontFamily: 'monospace',
            borderRadius: '4px',
            padding: '8px 16px',
            fontWeight: 'bold',
          },
          buttonBack: {
            color: '#666',
            fontFamily: 'monospace',
            marginRight: '8px',
          },
          buttonSkip: {
            color: '#999',
            fontFamily: 'monospace',
            fontSize: '12px',
          },
          tooltip: {
            borderRadius: '8px',
            padding: '24px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)',
            textAlign: 'left',
          },
          tooltipContainer: {
            textAlign: 'left',
          },
          tooltipTitle: {
            fontSize: '18px',
            fontWeight: 'bold',
            marginBottom: '8px',
            color: '#1a1a1a',
          },
          tooltipContent: {
            fontSize: '14px',
            lineHeight: '1.5',
            color: '#333',
            textAlign: 'left',
          }
        }}
      />
      <div className={cn(
        "flex h-dvh w-dvw flex-col bg-dark-bg text-[#D1D1D1] font-sans overflow-hidden",
      isLiteMode && "lite-mode"
    )} onKeyDown={(e) => {
      // Basic keyboard shortcuts hook if needed, but useEffect is better for global
    }}>
      {/* Global File Input */}
      <input id="global-file-upload" type="file" className="hidden" accept=".pdf" onChange={handleFileLoad} />
      
      {/* Header */}
      <header className="h-16 md:h-20 border-b border-border-gold flex items-center justify-between px-4 md:px-10 bg-panel z-20 shrink-0 w-full max-w-full">
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="step-sidebar-toggle p-1.5 md:p-2 border border-border-gold text-gold hover:bg-gold hover:text-black rounded-sm transition-all shrink-0"
            title="Toggle Sidebar (Cmd/Ctrl + B)"
          >
            <Layers size={18} className="md:w-5 md:h-5" />
          </button>
          <div className="flex flex-col truncate">
            <span className="text-[8px] md:text-[10px] tracking-[0.3em] uppercase text-gold opacity-60 truncate block">System Audit Protocol</span>
            <h1 className="serif text-lg md:text-3xl font-semibold tracking-wide text-white flex items-center gap-1 md:gap-3 truncate">
              PicoPDF <span className="text-xs md:text-sm italic font-light opacity-50 shrink-0">v1.0.4</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4 md:gap-8 min-w-0 flex-1 justify-end ml-4">
          <div className="hidden sm:flex text-right items-center gap-3 shrink-0">
            <div>
              <p className="text-[10px] tracking-widest uppercase opacity-40">Health</p>
              <p className="serif text-xl md:text-2xl text-gold">{health}%</p>
            </div>
            <Activity size={20} className={cn(health < 50 ? "status-alert animate-pulse" : "status-check")} />
          </div>
          
          <div className="flex items-center gap-2 md:gap-4 overflow-x-auto custom-scrollbar md:overflow-visible py-1 pr-1">
            <button 
              onClick={handleExport}
              className="shrink-0 border border-gold px-3 md:px-6 py-1.5 md:py-2 text-gold text-[9px] md:text-[10px] tracking-[0.2em] md:tracking-[0.3em] uppercase hover:bg-gold hover:text-black transition-colors rounded-sm flex items-center gap-2"
              title="Export Current Artifact (Cmd/Ctrl + S)"
            >
              <Download size={12} className="md:w-3.5 md:h-3.5" />
              <span className="hidden xs:inline">Export</span>
            </button>
            <div className="hidden xs:block h-8 md:h-10 w-[1px] bg-gold opacity-20 mx-1 md:mx-0"></div>
            
            <button 
              onClick={() => setShowOrganiser(true)}
              className="shrink-0 border border-border-gold p-1.5 md:p-2 text-gold hover:bg-gold hover:text-black transition-colors rounded-sm"
              title="Auto-Organiser & Batch"
            >
              <FolderTree size={18} className="md:w-5 md:h-5" />
            </button>

            <button 
              onClick={() => setShowTokenPanel(true)}
              className="shrink-0 border border-border-gold p-1.5 md:p-2 text-gold hover:bg-gold hover:text-black transition-colors rounded-sm"
              title="Token Ledger"
            >
              <Database size={18} className="md:w-5 md:h-5" />
            </button>

            <button 
              onClick={() => setShowMetrics(!showMetrics)}
              className="step-metrics shrink-0 border border-border-gold p-1.5 md:p-2 text-gold hover:bg-gold hover:text-black transition-colors rounded-sm"
              title="Diagnostics"
            >
              <Cpu size={18} className="md:w-5 md:h-5" />
            </button>
            <button 
              onClick={() => setShowSettings(true)}
              className="step-settings shrink-0 border border-border-gold px-2 py-1.5 md:px-3 md:py-2 text-gold hover:bg-gold hover:text-black transition-colors rounded-sm flex items-center gap-2"
              title="API Settings (Cmd/Ctrl + ,)"
            >
              <Settings size={18} className="md:w-5 md:h-5" />
              <span className="hidden sm:inline text-xs uppercase tracking-widest font-bold">Settings</span>
            </button>
            <button 
              onClick={() => setShowAbout(true)}
              className="shrink-0 border border-border-gold px-2 py-1.5 md:px-3 md:py-2 text-gold hover:bg-gold hover:text-black transition-colors rounded-sm flex items-center gap-2"
              title="About & Legal (Cmd/Ctrl + /)"
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
          onOpenPanel={(panel) => {
            if (panel === 'settings') setShowSettings(true);
            if (panel === 'organiser') setShowOrganiser(true);
            if (panel === 'token') setShowTokenPanel(true);
            if (panel === 'metrics') setShowMetrics(true);
            if (panel === 'about') setShowAbout(true);
            // On mobile, close sidebar after opening panel
            if (window.innerWidth < 768) setSidebarOpen(false);
          }}
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
            onToggleSearch={() => setShowSearch(!showSearch)}
            onShowMetadata={() => setShowMetadata(true)}
          />

          <div className="flex-1 w-full overflow-auto p-8 custom-scrollbar relative">
            {file ? (
              <PDFViewer 
                file={file} 
                page={currentPage} 
                scale={scale}
                editMode={editMode}
                onUpdate={onFileUpdate}
                highlightBBox={highlightBBox}
                refreshKey={refreshKey}
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center p-12 border-2 border-dashed border-border-gold opacity-30 rounded-xl space-y-4">
                  <FileText size={48} className="mx-auto text-gold" />
                  <p className="serif text-xl italic text-white">No PDF Under Assessment</p>
                  <label className="block px-8 py-3 border border-gold text-gold text-[10px] tracking-widest uppercase hover:bg-gold hover:text-black cursor-pointer transition-all" title="Initialize Protocol (Cmd/Ctrl + O)">
                    Initialize Protocol
                    <input type="file" className="hidden" accept=".pdf" onChange={handleFileLoad} />
                  </label>
                </div>
              </div>
            )}
            <AnimatePresence>
              {showSearch && (
                <SearchOverlay 
                  file={file} 
                  onClose={() => {
                    setShowSearch(false);
                    setHighlightBBox(null);
                  }}
                  onResultClick={(page, res) => {
                    setCurrentPage(page);
                    setHighlightBBox(res);
                  }}
                />
              )}
            </AnimatePresence>
            <MetadataModal 
              isOpen={showMetadata}
              onClose={() => setShowMetadata(false)}
              file={file}
            />
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
          {lastSaved && (
             <span className="hidden sm:inline text-[9px] tracking-widest uppercase text-gold opacity-60">
               Auto-Saved: {lastSaved.toLocaleTimeString()}
             </span>
          )}
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
    </>
    )}
    </ErrorBoundary>
  );
}
