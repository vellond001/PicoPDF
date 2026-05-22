import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { UploadCloud, FileText, Send, Loader2 } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function Workspace({ hasCredits, hasKey }: { hasCredits: boolean; hasKey: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setMessages([
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'I have successfully processed your PDF. What would you like to know about it?',
        }
      ]);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;

    const newMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, newMsg]);
    setInput('');
    setIsGenerating(true);

    // Simulate streaming response
    setTimeout(() => {
      const responseMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: '' };
      setMessages(prev => [...prev, responseMsg]);
      
      const fullText = hasKey 
        ? "Using your local BYOK api key to process your request... Everything looks secure and isolated." 
        : "Using your premium credits via our secure cloud servers. Everything looks good.";
      
      let index = 0;
      const interval = setInterval(() => {
        if (index < fullText.length) {
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1].content += fullText.charAt(index);
            return updated;
          });
          index++;
        } else {
          clearInterval(interval);
          setIsGenerating(false);
        }
      }, 30);
    }, 600);
  };

  if (!file) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-neutral-50/50">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white border border-neutral-200 border-dashed rounded-2xl p-12 text-center"
        >
          <div className="w-16 h-16 bg-neutral-100 text-neutral-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-medium text-neutral-900 mb-2">Upload a PDF document</h3>
          <p className="text-sm text-neutral-500 mb-8">
            Click to upload or drag and drop a PDF file here. We'll securely process it for analysis.
          </p>
          <label className="cursor-pointer bg-neutral-900 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors">
            Select PDF File
            <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} />
          </label>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 border-t border-neutral-200 bg-white flex flex-col lg:flex-row h-full overflow-hidden">
      {/* Sidebar with PDF preview stub */}
      <div className="w-full lg:w-1/3 border-b lg:border-b-0 lg:border-r border-neutral-200 bg-neutral-50 p-6 flex flex-col hidden sm:block">
         <div className="flex items-center text-neutral-900 font-medium mb-4">
           <FileText className="w-5 h-5 mr-2 text-indigo-500" />
           {file.name}
         </div>
         <div className="flex-1 bg-white border border-neutral-200 rounded-lg shadow-inner flex items-center justify-center text-neutral-400 text-sm p-4 text-center">
           [PDF Preview Sandbox]
         </div>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 flex flex-col overflow-hidden relative bg-white">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-neutral-900 text-white rounded-br-none' 
                    : 'bg-neutral-100 text-neutral-800 rounded-bl-none'
                }`}
              >
                {msg.content}
                {msg.role === 'assistant' && msg.content === '' && (
                   <Loader2 className="w-4 h-4 animate-spin text-neutral-500" />
                )}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="p-4 bg-white border-t border-neutral-100">
          <form onSubmit={handleSend} className="relative max-w-4xl mx-auto">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about the PDF..."
              className="w-full bg-neutral-100 border-transparent rounded-xl pl-4 pr-12 py-3.5 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
            />
            <button
              type="submit"
              disabled={isGenerating || !input.trim()}
              className="absolute right-2 top-2 p-1.5 text-neutral-400 hover:text-indigo-600 disabled:opacity-50 transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
          <div className="text-center mt-2 text-xs text-neutral-400">
            {hasKey ? 'Processing locally via provided API key.' : 'Processing securely via cloud credits.'}
          </div>
        </div>
      </div>
    </div>
  );
}
