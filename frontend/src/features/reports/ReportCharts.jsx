import React from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#14b8a6', '#0ea5e9', '#a78bfa', '#fb923c', '#f472b6', '#34d399'];

const tooltipStyle = { 
  backgroundColor: 'rgba(15, 23, 42, 0.9)', 
  border: '1px solid rgba(20, 184, 166, 0.2)', 
  borderRadius: '16px', 
  color: '#FFFFFF', 
  fontSize: '12px',
  backdropFilter: 'blur(10px)',
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
};

export const RevenueBarChart = ({ data }) => (
  <ResponsiveContainer width="100%" height={260}>
    <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
      <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
      <YAxis tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
      <Tooltip cursor={{fill: 'rgba(20, 184, 166, 0.05)'}} contentStyle={tooltipStyle} formatter={v => [`₹${Number(v).toLocaleString()}`, 'Revenue']} />
      <Bar dataKey="amount" fill="#14b8a6" radius={[6, 6, 0, 0]} barSize={30} />
    </BarChart>
  </ResponsiveContainer>
);

export const TrendLineChart = ({ data, dataKey, color = '#14b8a6', label = 'Count' }) => (
  <ResponsiveContainer width="100%" height={240}>
    <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
      <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
      <YAxis tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
      <Tooltip contentStyle={tooltipStyle} formatter={v => [v, label]} />
      <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={3} dot={{ fill: color, r: 5, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8, strokeWidth: 0 }} />
    </LineChart>
  </ResponsiveContainer>
);

export const DonutChart = ({ data, nameKey, valueKey }) => (
  <ResponsiveContainer width="100%" height={240}>
    <PieChart>
      <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey={valueKey} nameKey={nameKey} paddingAngle={5}>
        {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />)}
      </Pie>
      <Tooltip contentStyle={tooltipStyle} />
      <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{v}</span>} />
    </PieChart>
  </ResponsiveContainer>
);

export const FunnelBars = ({ data }) => {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="space-y-5 py-4">
      {data.map((d, i) => (
        <div key={i}>
          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
            <span className="text-textMuted">{d.stage}</span>
            <span className="text-textMain">{d.count} Leads</span>
          </div>
          <div className="h-3 bg-background rounded-full overflow-hidden border border-borderSubtle shadow-inner">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${(d.count / max) * 100}%` }}
              transition={{ duration: 1, delay: i * 0.1 }}
              className="h-full rounded-full shadow-lg" 
              style={{ background: `linear-gradient(90deg, #14b8a6, hsl(${170 - i * 20}, 70%, 50%))` }} 
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export const StatCard = ({ label, value, sub, color = 'primary', icon }) => (
  <div className="bg-gradient-to-br from-primary/10 to-surface border border-primary/20 rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden group transition-all hover:scale-[1.02]">
    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-[4rem] -z-10 group-hover:scale-110 transition-transform"></div>
    <div className="flex justify-between items-start mb-4">
      <div className="p-3 rounded-2xl glass-surface text-primary shadow-sm group-hover:scale-110 transition-transform">{icon}</div>
      {sub && <span className="text-[10px] font-black uppercase tracking-widest text-textMuted px-2 py-1 rounded-md glass-badge">{sub}</span>}
    </div>
    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-textMuted mb-1">{label}</p>
    <p className="text-3xl font-black text-textMain tracking-tight">{value}</p>
  </div>
);
