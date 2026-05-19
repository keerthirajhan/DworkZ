import React, { useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react';

const ClientPortalLogin = ({ onLogin }) => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/v1/client-portal/login`, form);
      if (res.data.success) {
        localStorage.setItem('dworkz_client_token', res.data.token);
        localStorage.setItem('dworkz_client', JSON.stringify(res.data.client));
        onLogin(res.data.token, res.data.client);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="text-4xl font-bold text-textMain tracking-tighter flex items-baseline justify-center leading-none">
            DworkZ<span className="text-primary text-5xl leading-[0] ml-0.5">.</span>
          </div>
          <div className="text-[0.6rem] tracking-[0.6em] text-primary/60 font-bold mt-2 uppercase">Member Portal</div>
        </div>

        <div className="bg-surface border border-borderSubtle rounded-[2rem] p-8 shadow-2xl">
          <div className="mb-8">
            <h1 className="text-2xl font-black text-textMain uppercase tracking-tight">Welcome Back</h1>
            <p className="text-sm text-textMuted mt-1">Sign in to access your workspace portal</p>
          </div>

          {error && (
            <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl px-4 py-3 mb-6">
              <AlertCircle size={16} className="text-rose-500 shrink-0" />
              <p className="text-xs text-rose-400 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-primary uppercase tracking-widest">Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm text-textMain focus:border-primary focus:outline-none transition-colors"
                placeholder="your@email.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-primary uppercase tracking-widest">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 pr-11 text-sm text-textMain focus:border-primary focus:outline-none transition-colors"
                  placeholder="••••••••"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted hover:text-textMain transition-colors">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-textMain py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-textMain/30 border-t-textMain rounded-full animate-spin" />
              ) : (
                <><LogIn size={16} /> Sign In</>
              )}
            </button>
          </form>

          <p className="text-center text-[10px] text-textMuted mt-6">
            Credentials are provided by your workspace administrator.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default ClientPortalLogin;
