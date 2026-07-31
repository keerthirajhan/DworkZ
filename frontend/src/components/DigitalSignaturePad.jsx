import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PenLine, Type, Trash2, CheckCircle, ShieldCheck, 
  X, Info, Lock, Clock, Monitor, FileSignature
} from 'lucide-react';
import axios from 'axios';
import api from '../utils/api';

const DigitalSignaturePad = ({ clientId, agreementId, clientName, companyName, onSuccess, onClose }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [mode, setMode] = useState('draw'); // 'draw' | 'type'
  const [typedName, setTypedName] = useState('');
  const [signerFullName, setSignerFullName] = useState('');
  const [hasSignature, setHasSignature] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1); // 1: Sign, 2: Confirm, 3: Done
  const [agreed, setAgreed] = useState(false);
  const [timestamp] = useState(new Date());
  const [notification, setNotification] = useState(null);

  // --- Canvas Setup ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [mode]);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDraw = useCallback((e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  }, []);

  const draw = useCallback((e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasSignature(true);
  }, [isDrawing]);

  const stopDraw = useCallback(() => setIsDrawing(false), []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const getSignatureDataUrl = () => {
    if (mode === 'draw') {
      return canvasRef.current?.toDataURL('image/png');
    }
    // Typed mode: render to canvas
    const canvas = document.createElement('canvas');
    canvas.width = 600; canvas.height = 150;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'italic 52px "Dancing Script", Georgia, serif';
    ctx.fillStyle = '#1a1a2e';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(typedName, canvas.width / 2, canvas.height / 2);
    return canvas.toDataURL('image/png');
  };

  const handleSubmit = async () => {
    if (!signerFullName.trim()) {
      setNotification({ message: 'Please enter your full name.', type: 'error' });
      return;
    }
    if (!agreed) {
      setNotification({ message: 'Please accept the legal declaration.', type: 'error' });
      return;
    }
    if (mode === 'draw' && !hasSignature) {
      setNotification({ message: 'Please draw your signature.', type: 'error' });
      return;
    }
    if (mode === 'type' && !typedName.trim()) {
      setNotification({ message: 'Please type your name as signature.', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const signatureImageUrl = getSignatureDataUrl();
      const deviceInfo = `${navigator.userAgent.slice(0, 80)}`;

      await api.post(
        `/api/v1/clients/${clientId}/agreements/${agreementId}/sign`,
        { signatureImageUrl, signedBy: signerFullName, deviceInfo }
      );

      setStep(3);
      setTimeout(() => onSuccess && onSuccess(), 2500);
    } catch (err) {
      setNotification({ message: err.response?.data?.error || 'Signature submission failed.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const isReadyToConfirm = signerFullName.trim().length > 2 && (hasSignature || typedName.trim().length > 1) && agreed;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-2xl flex items-center justify-center border border-emerald-500/30">
              <FileSignature size={20} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="font-black text-white uppercase tracking-widest text-xs">Digital Signature Portal</h2>
              <p className="text-slate-400 text-[10px] font-bold mt-0.5">DworkZ Workspace Agreement — {companyName}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-all">
            <X size={16} className="text-white" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="flex border-b border-gray-100">
          {[{ n: 1, label: 'Sign' }, { n: 2, label: 'Confirm' }, { n: 3, label: 'Complete' }].map((s) => (
            <div key={s.n} className={`flex-1 py-3 text-center text-[10px] font-black uppercase tracking-widest transition-all ${step === s.n ? 'text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50' : step > s.n ? 'text-emerald-400 bg-white' : 'text-gray-300 bg-white'}`}>
              {step > s.n ? <CheckCircle size={14} className="inline mr-1" /> : null}{s.label}
            </div>
          ))}
        </div>

        {/* Notification */}
        <AnimatePresence>
          {notification && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className={`px-6 py-3 flex items-center gap-2 text-sm font-bold ${notification.type === 'error' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
              <Info size={14} /> {notification.message}
              <button onClick={() => setNotification(null)} className="ml-auto"><X size={14} /></button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-8 space-y-6 max-h-[65vh] overflow-y-auto">

          {/* STEP 1: SIGN */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Signer Name */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Full Name (as per records)</label>
                <input
                  type="text"
                  placeholder={`e.g. ${clientName}`}
                  value={signerFullName}
                  onChange={(e) => setSignerFullName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-800 focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>

              {/* Mode Toggle */}
              <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
                <button onClick={() => { setMode('draw'); setHasSignature(false); }} className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${mode === 'draw' ? 'bg-white shadow text-gray-800' : 'text-gray-400'}`}>
                  <PenLine size={14} /> Draw Signature
                </button>
                <button onClick={() => setMode('type')} className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${mode === 'type' ? 'bg-white shadow text-gray-800' : 'text-gray-400'}`}>
                  <Type size={14} /> Type Signature
                </button>
              </div>

              {/* Draw Mode */}
              {mode === 'draw' && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Draw your signature below</p>
                    <button onClick={clearCanvas} className="text-[10px] font-black uppercase text-rose-400 hover:text-rose-600 flex items-center gap-1 transition-all"><Trash2 size={12} /> Clear</button>
                  </div>
                  <div className="border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden bg-gray-50 relative">
                    <canvas
                      ref={canvasRef}
                      width={600}
                      height={160}
                      className="w-full cursor-crosshair touch-none"
                      onMouseDown={startDraw}
                      onMouseMove={draw}
                      onMouseUp={stopDraw}
                      onMouseLeave={stopDraw}
                      onTouchStart={startDraw}
                      onTouchMove={draw}
                      onTouchEnd={stopDraw}
                    />
                    {!hasSignature && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <p className="text-gray-300 font-bold text-sm">Sign here ✍</p>
                      </div>
                    )}
                    <div className="absolute bottom-3 left-4 right-4 border-t border-gray-300 pointer-events-none"></div>
                  </div>
                </div>
              )}

              {/* Type Mode */}
              {mode === 'type' && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Type your name as signature</p>
                  <input
                    type="text"
                    placeholder="Your full signature name..."
                    value={typedName}
                    onChange={(e) => { setTypedName(e.target.value); setHasSignature(e.target.value.length > 0); }}
                    className="w-full border-2 border-dashed border-gray-200 rounded-2xl px-6 py-5 text-4xl bg-gray-50 focus:outline-none focus:border-emerald-400 transition-all text-center"
                    style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', color: '#1a1a2e' }}
                  />
                </div>
              )}

              {/* Legal Declaration */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <button onClick={() => setAgreed(!agreed)} className={`w-5 h-5 rounded-md border-2 mt-0.5 shrink-0 flex items-center justify-center transition-all ${agreed ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'}`}>
                    {agreed && <CheckCircle size={12} className="text-white" />}
                  </button>
                  <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                    I, <span className="font-black text-gray-800">{signerFullName || '_______________'}</span>, agree that this digital signature is legally binding and has the same force as a handwritten signature. I accept all terms and conditions in the DworkZ Workspace Agreement dated <span className="font-bold">{timestamp.toLocaleDateString('en-IN')}</span>.
                  </p>
                </div>
              </div>

              <button
                onClick={() => isReadyToConfirm && setStep(2)}
                disabled={!isReadyToConfirm}
                className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${isReadyToConfirm ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-xl' : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}
              >
                <ShieldCheck size={16} /> Continue to Confirmation
              </button>
            </div>
          )}

          {/* STEP 2: CONFIRM */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto border border-emerald-100">
                  <ShieldCheck size={32} className="text-emerald-500" />
                </div>
                <h3 className="font-black text-gray-800 text-xl uppercase">Review & Confirm</h3>
                <p className="text-gray-400 text-sm font-medium">Please review your signature before final submission</p>
              </div>

              {/* Signature Preview */}
              <div className="border border-gray-200 rounded-2xl p-6 bg-gray-50 space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Signature Preview</p>
                {mode === 'draw' ? (
                  <img src={canvasRef.current?.toDataURL()} alt="Signature" className="max-h-24 mx-auto" />
                ) : (
                  <p className="text-4xl text-center py-2" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', color: '#1a1a2e' }}>{typedName}</p>
                )}
                <div className="pt-4 border-t border-gray-200 grid grid-cols-2 gap-4">
                  <div><p className="text-[9px] font-black uppercase text-gray-400 mb-1">Signed By</p><p className="font-bold text-gray-800 text-sm">{signerFullName}</p></div>
                  <div><p className="text-[9px] font-black uppercase text-gray-400 mb-1">Agreement For</p><p className="font-bold text-gray-800 text-sm">{companyName}</p></div>
                  <div className="flex items-center gap-2"><Clock size={12} className="text-gray-400" /><p className="text-[10px] font-bold text-gray-500">{timestamp.toLocaleString()}</p></div>
                  <div className="flex items-center gap-2"><Monitor size={12} className="text-gray-400" /><p className="text-[10px] font-bold text-gray-500 truncate">{navigator.platform}</p></div>
                </div>
              </div>

              {/* Security Notice */}
              <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-4">
                <Lock size={16} className="text-blue-400 mt-0.5 shrink-0" />
                <p className="text-[11px] text-blue-600 font-medium leading-relaxed">Your signature is encrypted and stored securely with a unique audit hash. This signature is legally valid under the <span className="font-black">IT Act, 2000 (India)</span> and ESIGN standards.</p>
              </div>

              <div className="flex gap-4">
                <button onClick={() => setStep(1)} className="flex-1 py-4 rounded-2xl border border-gray-200 text-gray-500 font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all">Go Back</button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {submitting ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <><CheckCircle size={16} /> Confirm & Sign</>}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: DONE */}
          {step === 3 && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-6 py-8">
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }}
                className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/40"
              >
                <CheckCircle size={48} className="text-white" />
              </motion.div>
              <div className="space-y-2">
                <h3 className="font-black text-gray-800 text-2xl uppercase">Agreement Signed!</h3>
                <p className="text-gray-400 font-medium">Your digital signature has been securely recorded.</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">{companyName} → Awaiting Activation</p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-gray-100 bg-gray-50 flex items-center gap-2">
          <Lock size={12} className="text-gray-300" />
          <p className="text-[9px] font-black uppercase tracking-widest text-gray-300">Secured by DworkZ Digital Signature Engine · IT Act 2000 Compliant</p>
        </div>
      </motion.div>
    </div>
  );
};

export default DigitalSignaturePad;
