import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Undo2, Redo2, Circle, CheckCircle2 } from 'lucide-react';

interface HistoryTimelineProps {
  history: {
    past: ArrayBuffer[];
    present: ArrayBuffer | null;
    future: ArrayBuffer[];
  };
  onJump: (index: number) => void;
  onUndo: () => void;
  onRedo: () => void;
}

export function HistoryTimeline({ history, onJump, onUndo, onRedo }: HistoryTimelineProps) {
  if (!history.present && history.past.length === 0 && history.future.length === 0) {
    return null;
  }

  const allStates = [...history.past, history.present, ...history.future];
  const currentIndex = history.past.length;
  
  if (allStates.length <= 1) {
    return null; // Not enough history to show a timeline
  }

  return (
    <div className="w-full bg-background/80 backdrop-blur-md border-b border-border-gold p-2 flex items-center justify-center gap-4 overflow-x-auto">
      <div className="flex items-center gap-2 text-gold">
        <Clock size={16} />
        <span className="text-xs uppercase tracking-widest">History</span>
      </div>
      
      <button 
        onClick={onUndo} 
        disabled={history.past.length === 0}
        className="p-1 text-gold disabled:opacity-30 hover:bg-gold/10 rounded transition-colors"
        title="Undo"
      >
        <Undo2 size={16} />
      </button>

      <div className="flex items-center gap-1 mx-4">
        {allStates.map((state, index) => {
          const isCurrent = index === currentIndex;
          const isPast = index < currentIndex;
          
          return (
            <React.Fragment key={index}>
              <button
                onClick={() => onJump(index)}
                className={`relative flex items-center justify-center w-6 h-6 rounded-full transition-all group ${
                  isCurrent ? 'bg-gold text-black scale-110 shadow-[0_0_10px_rgba(255,215,0,0.5)]' 
                  : isPast ? 'bg-panel-border hover:bg-gold/50 text-gold' 
                  : 'bg-background border border-panel-border text-panel-border hover:border-gold/50'
                }`}
                title={`Jump to state ${index + 1}`}
              >
                {isCurrent ? (
                  <CheckCircle2 size={14} />
                ) : (
                  <Circle size={10} className={isPast ? "fill-current" : ""} />
                )}
                
                {/* Tooltip */}
                <div className="absolute -bottom-8 px-2 py-1 bg-panel text-[10px] text-gold border border-border-gold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                  {isCurrent ? 'Current State' : `State ${index + 1}`}
                </div>
              </button>
              
              {index < allStates.length - 1 && (
                <div className={`h-0.5 w-6 transition-colors ${
                  index < currentIndex ? 'bg-gold/50' : 'bg-panel-border'
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <button 
        onClick={onRedo} 
        disabled={history.future.length === 0}
        className="p-1 text-gold disabled:opacity-30 hover:bg-gold/10 rounded transition-colors"
        title="Redo"
      >
        <Redo2 size={16} />
      </button>
    </div>
  );
}
