import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, FolderTree, Play, Pause, Trash2, Plus, Terminal } from 'lucide-react';
import { cn } from '../lib/utils';

interface OrganiserPanelProps {
  onClose: () => void;
}

export default function OrganiserPanel({ onClose }: OrganiserPanelProps) {
  const [rules, setRules] = useState([
    { id: 1, folder: './Invoices/', pattern: 'INVOICE', template: '{Category}_{Date}.pdf' },
    { id: 2, folder: './Receipts/', pattern: 'RECEIPT', template: '{Category}_{Date}_{Index}.pdf' }
  ]);
  const [folder, setFolder] = useState('');
  const [pattern, setPattern] = useState('');
  const [template, setTemplate] = useState('');
  
  const addRule = () => {
    if (!pattern) return;
    setRules([...rules, { id: Date.now(), folder: folder || './Sorted/', pattern, template: template || '{Category}_{Date}.pdf' }]);
    setFolder(''); setPattern(''); setTemplate('');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
      animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
      exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60"
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="w-full max-w-4xl bg-dark-bg border border-gold/40 shadow-[0_40px_100px_rgba(0,0,0,0.8)] flex flex-col max-h-[85vh] rounded-sm"
      >
        <div className="h-16 bg-panel border-b border-gold/30 text-white flex items-center justify-between px-6 shrink-0">
          <div className="flex flex-col">
            <span className="text-[9px] tracking-[0.3em] uppercase text-gold opacity-50">Subsystem</span>
            <div className="flex items-center gap-3">
              <FolderTree size={18} className="text-gold" />
              <span className="serif text-xl italic font-semibold tracking-wide">Auto-Organiser & Batch Matrix</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 border border-gold/20 text-gold hover:bg-gold hover:text-black rounded-sm transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 md:p-8 space-y-8 custom-scrollbar">

          <div className="space-y-4">
             <h4 className="serif italic text-lg text-white border-b border-white/5 pb-2">Routing Ruleset</h4>
             
             <div className="flex flex-col md:flex-row gap-2">
               <input placeholder="Target Folder e.g. ./Invoices/" value={folder} onChange={e=>setFolder(e.target.value)} className="flex-1 bg-black/40 border border-white/10 rounded-sm px-3 py-2 text-[10px] font-mono text-white outline-none focus:border-gold transition-all" />
               <input placeholder="Match Pattern e.g. INVOICE" value={pattern} onChange={e=>setPattern(e.target.value)} className="flex-1 bg-black/40 border border-white/10 rounded-sm px-3 py-2 text-[10px] font-mono text-white outline-none focus:border-gold transition-all" />
               <input placeholder="Rename Template" value={template} onChange={e=>setTemplate(e.target.value)} className="flex-1 bg-black/40 border border-white/10 rounded-sm px-3 py-2 text-[10px] font-mono text-white outline-none focus:border-gold transition-all" />
               <button onClick={addRule} className="px-6 py-2 md:py-0 bg-panel border border-gold/40 text-gold hover:bg-gold hover:text-black rounded-sm transition-all flex items-center justify-center gap-2 text-[10px] uppercase font-bold tracking-widest">
                 <Plus size={14} /> Add
               </button>
             </div>

             <div className="bg-[#0C0C0E] border border-white/5 rounded-sm overflow-x-auto">
               <table className="w-full text-left border-collapse min-w-[500px]">
                 <thead>
                   <tr className="bg-white/5 text-[9px] uppercase tracking-widest text-gold opacity-60 font-mono">
                     <th className="p-3 border-b border-white/5">Folder Target</th>
                     <th className="p-3 border-b border-white/5">Pattern Match</th>
                     <th className="p-3 border-b border-white/5">Name Template</th>
                     <th className="p-3 border-b border-white/5 text-right w-16">Action</th>
                   </tr>
                 </thead>
                 <tbody className="text-[11px] font-mono opacity-80 font-light">
                   {rules.map(r => (
                     <tr key={r.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                       <td className="p-3 text-gold/80">{r.folder}</td>
                       <td className="p-3 text-white">{r.pattern}</td>
                       <td className="p-3 text-white/50 truncate max-w-[200px]">{r.template}</td>
                       <td className="p-3 text-right">
                         <button onClick={() => setRules(rules.filter(x => x.id !== r.id))} className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-white/5 transition-colors" title="Remove">
                           <Trash2 size={14} />
                         </button>
                       </td>
                     </tr>
                   ))}
                   {rules.length === 0 && (
                     <tr>
                       <td colSpan={4} className="p-6 text-center opacity-40 italic">No routing rules defined...</td>
                     </tr>
                   )}
                 </tbody>
               </table>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
               <h4 className="serif italic text-lg text-white border-b border-white/5 pb-2">Execution Protocol</h4>
               <div className="flex gap-2">
                 <button className="flex-1 py-3 bg-panel border border-gold/40 text-gold text-[10px] uppercase tracking-[0.2em] hover:bg-gold hover:text-black transition-all flex justify-center items-center gap-2 rounded-sm group">
                   <Play size={14} className="group-hover:opacity-100 opacity-60"/> Execute Batch
                 </button>
                 <button className="px-5 bg-panel border border-white/10 text-white/40 hover:text-gold hover:border-gold/40 transition-all flex justify-center items-center rounded-sm" title="Pause Batch">
                   <Pause size={14}/>
                 </button>
               </div>
               
               <div className="space-y-2 mt-6 p-4 border border-gold/10 rounded-sm bg-panel relative overflow-hidden">
                 <div className="flex justify-between text-[10px] font-mono text-gold opacity-60 uppercase tracking-widest relative z-10">
                   <span>Progress Array</span>
                   <span>0 / 0</span>
                 </div>
                 <div className="h-1 bg-black rounded-full overflow-hidden border border-white/5 relative z-10 mt-3">
                    <div className="h-full bg-gold w-0 transition-all"></div>
                 </div>
               </div>
            </div>

            <div className="bg-black/40 border border-gold/20 text-white p-4 rounded-sm font-mono text-[9px] relative overflow-hidden h-48 flex flex-col">
              <div className="flex items-center gap-2 border-b border-gold/20 pb-2 mb-2 shrink-0">
                <Terminal size={14} className="text-gold" />
                <span className="uppercase font-bold tracking-widest text-gold opacity-80">Terminal Output</span>
              </div>
              <div className="flex-1 overflow-auto space-y-1 opacity-60 font-light custom-scrollbar">
                <p>&gt; Engine initialized...</p>
                <p>&gt; Loaded 2 routing rules.</p>
                <p>&gt; Awaiting batch array.</p>
              </div>
            </div>
          </div>

        </div>

        <div className="p-4 md:p-6 bg-panel border-t border-gold/20 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="w-full md:w-auto px-10 py-3 border border-gold text-gold text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-gold hover:text-black transition-all active:scale-95 text-center"
          >
            Acknowledge & Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
