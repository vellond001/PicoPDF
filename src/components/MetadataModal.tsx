import React, { useEffect, useState } from 'react';
import { X, Info, FileText, User, Calendar, Tag } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { pdfService, PDFMetadata } from '../services/pdf';

interface MetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: ArrayBuffer | null;
}

export default function MetadataModal({ isOpen, onClose, file }: MetadataModalProps) {
  const [metadata, setMetadata] = useState<PDFMetadata | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && file) {
      setLoading(true);
      pdfService.getMetadata(file)
        .then(data => {
          setMetadata(data);
          setLoading(false);
        })
        .catch(err => {
          console.error("Failed to fetch metadata", err);
          setLoading(false);
        });
    }
  }, [isOpen, file]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="relative bg-panel border-2 border-border-gold p-6 max-w-lg w-full text-white font-sans shadow-2xl"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
          >
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 text-white/50 hover:text-white"
            >
              <X size={20} />
            </button>
            
            <h2 className="text-xl font-bold mb-6 text-gold flex items-center gap-2">
              <Info className="w-6 h-6" />
              PDF Document Properties
            </h2>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
              </div>
            ) : !file ? (
              <div className="text-white/50 text-center py-8">
                No file loaded.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-[120px_1fr] gap-4 items-start border-b border-white/10 pb-3">
                  <div className="text-white/50 text-sm font-bold flex items-center gap-2">
                    <FileText size={16} />
                    Title
                  </div>
                  <div className="text-md">
                    {metadata?.title || <span className="text-white/30 italic">Not specified</span>}
                  </div>
                </div>

                <div className="grid grid-cols-[120px_1fr] gap-4 items-start border-b border-white/10 pb-3">
                  <div className="text-white/50 text-sm font-bold flex items-center gap-2">
                    <User size={16} />
                    Creator
                  </div>
                  <div className="text-md">
                    {metadata?.creator || metadata?.author || <span className="text-white/30 italic">Not specified</span>}
                  </div>
                </div>

                <div className="grid grid-cols-[120px_1fr] gap-4 items-start border-b border-white/10 pb-3">
                  <div className="text-white/50 text-sm font-bold flex items-center gap-2">
                    <Tag size={16} />
                    Keywords
                  </div>
                  <div className="text-md">
                    {metadata?.keywords && metadata.keywords.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {metadata.keywords.map((kw, i) => (
                          <span key={i} className="px-2 py-0.5 bg-black/40 border border-white/10 rounded text-xs">
                            {kw}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-white/30 italic">None</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-[120px_1fr] gap-4 items-start border-b border-white/10 pb-3">
                  <div className="text-white/50 text-sm font-bold flex items-center gap-2">
                    <Calendar size={16} />
                    Creation
                  </div>
                  <div className="text-md">
                    {metadata?.creationDate ? (
                      metadata.creationDate.toLocaleString()
                    ) : (
                      <span className="text-white/30 italic">Unknown</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-[120px_1fr] gap-4 items-start">
                  <div className="text-white/50 text-sm font-bold flex items-center gap-2">
                    <FileText size={16} />
                    Pages
                  </div>
                  <div className="text-md">
                    {metadata?.pageCount || 0}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 text-center flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-black/40 border border-border-gold text-gold font-bold text-sm uppercase hover:bg-gold hover:text-black transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
