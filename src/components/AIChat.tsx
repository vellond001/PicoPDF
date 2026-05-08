import React, { useState, useRef, useEffect } from 'react';
import Draggable from 'react-draggable';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, Bot, User, Sparkles, X, Maximize2, Minimize2, Minus, ChevronDown, Cpu } from 'lucide-react';
import { llmService } from '../services/llm';
import { pdfService } from '../services/pdf';
import { cn } from '../lib/utils';

interface AIChatProps {
  file: ArrayBuffer | null;
}

export default function AIChat({ file }: AIChatProps) {
  const [messages, setMessages] = useState<{ role: 'ai' | 'user'; content: string }[]>([
    { role: 'ai', content: 'Greeting. I am PicoAI. How may I assist you with this artifact?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [fullText, setFullText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [chain, setChain] = useState<any[]>([]);
  const [tokenStats, setTokenStats] = useState<any>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const draggableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      setChain(llmService.getChain());
      setTokenStats(llmService.getUsageStats());
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Extract text for context
  useEffect(() => {
    const extract = async () => {
      if (!file) return;
      try {
        const pdf = await pdfService.loadPDF(file);
        let text = '';
        for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map((it: any) => it.str).join(' ') + '\n';
        }
        setFullText(text);
      } catch (e) {
        console.error('Context extraction failed', e);
      }
    };
    extract();
  }, [file]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const currentHistory = [...messages, { role: 'user', content: userMsg } as const];
      setMessages(prev => [...prev, { role: 'ai', content: '' }]);
      let streamedContent = '';
      
      const stream = llmService.queryStream(fullText || 'No document loaded.', currentHistory, selectedModelId);
      for await (const chunk of stream) {
        streamedContent += chunk;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          return [...prev.slice(0, -1), { role: 'ai', content: streamedContent }];
        });
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', content: 'Critical Error: LLM interface failure.' }]);
    } finally {
      setLoading(false);
    }
  };

  const getActiveModelStats = () => {
    const activeId = selectedModelId || (chain.length > 0 ? chain[0].id : null);
    if (!activeId) return { tokens: 0, name: 'None' };
    const stat = tokenStats[activeId];
    const modelItem = chain.find(c => c.id === activeId);
    return {
      tokens: stat ? stat.prompt + stat.completion : 0,
      name: modelItem ? modelItem.model : 'Unknown'
    };
  };

  const activeStats = getActiveModelStats();

  return (
    <Draggable 
      nodeRef={draggableRef} 
      handle=".chat-handle"
      onStart={() => setIsDragging(false)}
      onDrag={() => setIsDragging(true)}
      onStop={(e, data) => {
        if (!isDragging && minimized) {
          setMinimized(false);
        }
        setTimeout(() => setIsDragging(false), 50);
      }}
    >
      <div 
        ref={draggableRef} 
        className="fixed bottom-6 right-6 z-50 flex flex-col items-end justify-end pointer-events-auto"
        style={{ touchAction: 'none' }}
      >
        <div 
          className={cn(
            "overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-300 ease-in-out relative",
            minimized 
              ? "w-14 h-14 rounded-full border-2 border-gold bg-panel chat-handle cursor-pointer flex items-center justify-center group" 
              : maximized 
                ? "w-[95vw] h-[85vh] md:w-[80vw] md:h-[80vh] min-w-[300px] rounded-sm border border-gold/40 bg-[#0A0A0B] flex flex-col"
                : "w-[90vw] h-[65vh] sm:w-80 sm:h-[500px] max-w-full rounded-sm border border-gold/40 bg-[#0A0A0B] flex flex-col"
          )}
        >
          {minimized ? (
            <div className="flex flex-col items-center justify-center w-full h-full relative">
              <Bot size={24} className="text-gold animate-pulse group-hover:scale-110 transition-transform pointer-events-none" />
            </div>
          ) : (
            <>
              {/* Header/Handle */}
              <div className="h-12 bg-panel border-b border-gold/30 text-white flex items-center justify-between px-4 shrink-0 relative">
                <div className="chat-handle absolute inset-0 cursor-grab active:cursor-grabbing mr-40" />
                
                <div className="flex flex-col relative z-10 pointer-events-none">
                  <span className="text-[8px] tracking-[0.2em] uppercase text-gold opacity-50">Intel / Link</span>
                  <div className="flex items-center gap-2">
                    <Bot size={14} className="text-gold" />
                    <span className="serif italic text-sm tracking-wide">PicoAI</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 relative z-20">
                  <div className="flex items-center gap-2 mr-2">
                    <div className="flex flex-col items-end">
                      <select 
                        value={selectedModelId} 
                        onChange={(e) => setSelectedModelId(e.target.value)}
                        className="bg-transparent text-[10px] text-gold/80 font-mono outline-none cursor-pointer max-w-[100px] truncate"
                      >
                        <option value="">Auto (Chain)</option>
                        {chain.map(c => (
                          <option key={c.id} value={c.id}>{c.model}</option>
                        ))}
                      </select>
                      <div className="text-[8px] text-blue-400 font-mono tracking-wider">
                        {activeStats.tokens} TKNS
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setMaximized(!maximized);
                    }} 
                    className="p-1.5 border border-gold/20 text-gold hover:bg-gold hover:text-black rounded-sm transition-all bg-panel"
                    title={maximized ? "Restore" : "Maximize"}
                  >
                    {maximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                  </button>
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setMinimized(true);
                      setMaximized(false);
                    }} 
                    className="p-1.5 border border-gold/20 text-gold hover:bg-gold hover:text-black rounded-sm transition-all bg-panel ml-1"
                    title="Minimize"
                  >
                    <Minus size={12} />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-auto p-4 space-y-4 bg-[#0C0C0E] custom-scrollbar">
                {messages.map((m, i) => (
                  <div key={i} className={cn(
                    "flex flex-col max-w-[90%]",
                    m.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                  )}>
                    <div className={cn(
                      "p-3 text-[11px] leading-relaxed border font-light tracking-wide",
                      m.role === 'user' 
                        ? "bg-gold/10 text-gold border-gold/40 rounded-sm" 
                        : "bg-panel text-white border-white/5 rounded-sm serif italic"
                    )}>
                      {m.content || (loading && i === messages.length - 1 ? "Analyzing..." : "")}
                    </div>
                  </div>
                ))}
              </div>

              {/* Input */}
              <div className="p-4 border-t border-gold/20 flex items-center gap-3 bg-panel">
                <input 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Request analysis..."
                  className="flex-1 bg-black/40 border border-gold/20 rounded-sm px-3 py-2 text-[10px] font-mono text-gold outline-none focus:border-gold transition-all"
                />
                <button 
                  onClick={handleSend}
                  disabled={loading}
                  className="p-2 border border-gold text-gold hover:bg-gold hover:text-black rounded-sm transition-all disabled:opacity-20"
                >
                  <Send size={14} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </Draggable>
  );
}
