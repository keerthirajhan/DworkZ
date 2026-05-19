import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Paperclip, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../utils/api';

const EmailComposeModal = ({ isOpen, onClose, client, type, initialSubject, initialMessage, pdfHtml, onSuccess }) => {
  const [subject, setSubject] = useState(initialSubject || '');
  const [message, setMessage] = useState(initialMessage || '');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);

  const handleSend = async () => {
    setIsSending(true);
    setError(null);
    try {
      const endpoint = type === 'Proposal' ? '/api/v1/email/send-proposal' : '/api/v1/email/send-invoice';
      
      const payload = {
        clientId: client._id,
        customSubject: subject,
        customMessage: message,
        pdfHtml: pdfHtml // If we have pre-generated HTML for the PDF
      };

      await api.post(endpoint, payload);

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Email Send Error:', err);
      setError(err.response?.data?.error || 'Failed to send email. Please check SendGrid configuration.');
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-surface border border-borderSubtle rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col h-[80vh] teal-glow"
        >
          {/* Header */}
          <div className="px-8 py-6 border-b border-borderSubtle flex justify-between items-center bg-background/50">
            <div>
              <h2 className="text-xl font-bold text-textMain tracking-tight">Compose Enterprise Email</h2>
              <p className="text-xs text-textMuted mt-1">Sending to: <span className="text-primary font-bold">{client?.contactEmail}</span></p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-textMuted hover:text-textMain transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 text-rose-500 text-sm">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-primary uppercase tracking-widest">Subject Line</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter email subject..."
                className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm text-textMain focus:border-primary focus:outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5 flex-1 flex flex-col">
              <label className="text-[10px] font-black text-primary uppercase tracking-widest">Personalized Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write a personalized message to the client..."
                className="flex-1 min-h-[250px] w-full bg-background border border-borderSubtle rounded-xl px-4 py-4 text-sm text-textMain focus:border-primary focus:outline-none resize-none leading-relaxed transition-all"
              />
            </div>

            <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg text-primary">
                  <FileText size={20} />
                </div>
                <div>
                  <p className="text-textMain text-xs font-bold">{type} Document Attachment</p>
                  <p className="text-textMuted text-[10px]">Dynamically generated professional PDF</p>
                </div>
              </div>
              <span className="text-[10px] font-black text-emerald-500 uppercase bg-emerald-500/10 px-2 py-1 rounded">Auto-Generated</span>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-6 border-t border-borderSubtle bg-background/50 flex justify-between items-center">
            <div className="flex items-center gap-2 text-textMuted text-[10px] font-medium italic">
              <CheckCircle size={12} className="text-emerald-500" />
              Powered by SendGrid Enterprise API
            </div>
            <div className="flex gap-4">
              <button
                onClick={onClose}
                className="px-6 py-3 text-sm font-bold text-textMuted hover:text-textMain transition-colors"
              >
                Discard
              </button>
              <button
                onClick={handleSend}
                disabled={isSending || !subject}
                className={`px-8 py-3 rounded-xl text-sm font-black uppercase tracking-widest shadow-lg transition-all flex items-center gap-2 \${
                  isSending || !subject 
                  ? 'bg-primary/50 text-textMain/50 cursor-not-allowed' 
                  : 'bg-primary text-textMain shadow-primary/25 hover:bg-primary/90 hover:scale-[1.02]'
                }`}
              >
                {isSending ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Send Email
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default EmailComposeModal;
