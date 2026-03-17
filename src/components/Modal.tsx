import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertTriangle } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  type?: 'danger' | 'info';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, type = 'info' }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-white dark:bg-stone-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-black/5 dark:border-white/5"
          >
            <div className="px-8 pt-8 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {type === 'danger' && (
                  <div className="p-2 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl">
                    <AlertTriangle size={20} />
                  </div>
                )}
                <h3 className="text-xl font-display font-bold text-stone-900 dark:text-stone-50">{title}</h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-stone-400 dark:text-stone-500 hover:text-stone-900 dark:hover:text-stone-50 hover:bg-stone-50 dark:hover:bg-stone-800 rounded-full transition-all"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="px-8 py-4 text-stone-600 dark:text-stone-400 leading-relaxed font-medium">
              {children}
            </div>
            
            {footer && (
              <div className="px-8 pb-8 pt-4 flex gap-3 justify-end">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
