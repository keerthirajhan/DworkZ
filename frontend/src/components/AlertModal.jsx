import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

const AlertModal = ({ isOpen, onClose, title, message, type = 'success', confirmText = 'Continue' }) => {
  if (!isOpen) return null;

  const icons = {
    success: <CheckCircle size={32} className="text-emerald-500" />,
    error: <XCircle size={32} className="text-rose-500" />,
    warning: <AlertCircle size={32} className="text-orange-500" />,
    info: <Info size={32} className="text-blue-500" />
  };

  const colors = {
    success: 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/25',
    error: 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/25',
    warning: 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/25',
    info: 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/25'
  };

  const lightColors = {
    success: 'bg-emerald-500/10',
    error: 'bg-rose-500/10',
    warning: 'bg-orange-500/10',
    info: 'bg-blue-500/10'
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-surface border border-borderSubtle rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl text-center relative teal-glow"
        >
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 text-textMuted hover:text-textMain transition-colors"
          >
            <X size={20} />
          </button>

          <div className={`w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center ${lightColors[type]}`}>
            {icons[type]}
          </div>

          <h3 className="text-xl font-black text-textMain mb-2 uppercase tracking-tight">{title}</h3>
          <p className="text-sm text-textMuted mb-8 leading-relaxed px-4">{message}</p>

          <button 
            onClick={onClose}
            className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg text-white ${colors[type]}`}
          >
            {confirmText}
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AlertModal;
