import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import { motion } from 'framer-motion';
import { BarChart2, Users, TrendingUp, Package, Calendar, Download, RefreshCw, AlertTriangle, PieChart, Activity, Zap } from 'lucide-react';
import { RevenueBarChart, TrendLineChart, DonutChart, FunnelBars, StatCard } from './ReportCharts';

import api from '../../utils/api';

const TABS = [
  { id: 'financials', label: 'Financials', icon: BarChart2, description: 'Revenue, Billing & Cash Flow' },
  { id: 'operations', label: 'Operations', icon: Activity, description: 'Usage, Bookings & Visitors' },
  { id: 'growth', label: 'Growth & Leads', icon: TrendingUp, description: 'Sales Pipeline & Onboarding' },
];

export default function Reports() {
  const [tab, setTab] = useState('financials');
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);

  const fetchAllReports = async () => {
    setLoading(true);
    try {
      const [rev, clients, pipe, inv, book] = await Promise.all([
        api.get('/api/v1/reports/revenue'),
        api.get('/api/v1/reports/clients'),
        api.get('/api/v1/reports/pipeline'),
        api.get('/api/v1/reports/inventory'),
        api.get('/api/v1/reports/bookings')
      ]);

      setData({
        financials: { ...rev.data.data, inventory: inv.data.data },
        operations: { ...book.data.data },
        growth: { ...pipe.data.data, onboarding: clients.data.data }
      });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAllReports(); }, []);

  const exportPDF = (title, text) => {
    const doc = new jsPDF(); 
    doc.setFontSize(22); doc.setTextColor(20,184,166);
    doc.text(`DworkZ — ${title}`, 14, 25); 
    doc.setFontSize(10); doc.setTextColor(150,150,150);
    doc.text(`REPORTING PERIOD: LAST 12 MONTHS | GENERATED: ${new Date().toLocaleString()}`, 14, 33);
    
    doc.setDrawColor(20,184,166); doc.setLineWidth(0.5); doc.line(14, 38, 196, 38);
    
    doc.setFontSize(11); doc.setTextColor(40,40,40); 
    doc.text(text, 14, 50, { maxWidth: 180, lineHeightFactor: 1.5 });
    
    doc.setFontSize(9); doc.setTextColor(180,180,180);
    doc.text("CONFIDENTIAL — DworkZ Business Intelligence System", 14, 285);
    doc.save(`${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`);
  };

  const d = data[tab];

  return (
    <div className="p-8 w-full max-w-7xl mx-auto space-y-10">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-textMain uppercase tracking-tighter leading-none">Intelligence</h1>
          <p className="text-textMuted mt-2 font-medium flex items-center gap-2">
            <Zap size={14} className="text-primary" /> Simplified business reporting and actionable analytics.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={fetchAllReports} 
            disabled={loading}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-surface border border-primary/20 rounded-2xl text-xs font-black uppercase tracking-widest text-textMuted hover:text-primary hover:border-primary transition-all shadow-sm"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync Data
          </button>
          <button 
             onClick={() => {
               if (tab === 'financials') exportPDF('Financial Performance Report', `Summary:\nTotal Revenue: ₹${d.totalRevenue.toLocaleString()}\nPending Receivable: ₹${d.pending.toLocaleString()}\nTotal Invoices: ${d.totalInvoices}\nInventory Value: ₹${d.inventory.totalValue.toLocaleString()}\n\nStatus Breakdown:\nPaid: ${d.statusBreakdown.Paid}\nPending: ${d.statusBreakdown.Pending}\nOverdue: ${d.statusBreakdown.Overdue}`);
               if (tab === 'operations') exportPDF('Operational Efficiency Report', `Usage Summary:\nTotal Bookings: ${d.bookings.total}\nConfirmed: ${d.bookings.confirmed}\nCancelled: ${d.bookings.cancelled}\n\nVisitor Engagement:\nTotal Visitors: ${d.visitors.total}\nChecked In: ${d.visitors.checkedIn}\nChecked Out: ${d.visitors.checkedOut}`);
               if (tab === 'growth') exportPDF('Growth & Sales Pipeline Report', `Performance:\nTotal Leads: ${d.totalLeads}\nConversion Rate: ${d.conversionRate}%\nActive Clients: ${d.onboarding.totals.active}\n\nPriority Breakdown:\nHot: ${d.priorityMap.Hot}\nWarm: ${d.priorityMap.Warm}\nCold: ${d.priorityMap.Cold}`);
             }}
             className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-primary text-textMain rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            <Download size={14} /> Download PDF
          </button>
        </div>
      </div>

      {/* Panoramic Tab Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TABS.map(t => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button 
              key={t.id} 
              onClick={() => setTab(t.id)}
              className={`text-left p-6 rounded-[2rem] border transition-all relative overflow-hidden group ${
                isActive 
                  ? 'bg-gradient-to-br from-primary/10 to-surface border-primary shadow-xl' 
                  : 'bg-surface border-primary/10 hover:border-primary/40 text-textMuted'
              }`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-all ${isActive ? 'bg-primary text-textMain shadow-lg' : 'bg-primary/5 text-primary'}`}>
                <Icon size={24} />
              </div>
              <h3 className={`text-sm font-black uppercase tracking-widest ${isActive ? 'text-textMain' : 'text-textMuted'}`}>{t.label}</h3>
              <p className="text-xs font-medium mt-1 opacity-70">{t.description}</p>
              {isActive && (
                <motion.div layoutId="tabActive" className="absolute bottom-0 left-0 right-0 h-1 bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="h-96 glass-surface rounded-[2.5rem] flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-textMuted text-xs font-black uppercase tracking-[0.2em]">Aggregating Intelligence...</p>
        </div>
      ) : d ? (
        <motion.div key={tab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
          
          {/* CONTENT: FINANCIALS */}
          {tab === 'financials' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard label="Total Revenue" value={`₹${Number(d.totalRevenue||0).toLocaleString()}`} icon={<BarChart2 size={24}/>} color="primary" />
                <StatCard label="Pending Receivable" value={`₹${Number(d.pending||0).toLocaleString()}`} icon={<PieChart size={24}/>} color="blue-400" />
                <StatCard label="Inventory Value" value={`₹${Number(d.inventory?.totalValue||0).toLocaleString()}`} icon={<Package size={24}/>} color="emerald-500" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gradient-to-br from-primary/5 to-surface border border-primary/20 rounded-[2.5rem] p-8 shadow-xl">
                  <h3 className="font-black text-textMain uppercase text-xs tracking-widest mb-8 flex items-center gap-2">
                    <TrendingUp size={16} className="text-primary" /> Monthly Revenue Performance
                  </h3>
                  <RevenueBarChart data={d.monthlyData||[]} />
                </div>
                <div className="bg-gradient-to-br from-primary/5 to-surface border border-primary/20 rounded-[2.5rem] p-8 shadow-xl">
                  <h3 className="font-black text-textMain uppercase text-xs tracking-widest mb-8 flex items-center gap-2">
                    <PieChart size={16} className="text-primary" /> Invoice Status Distribution
                  </h3>
                  <DonutChart data={Object.entries(d.statusBreakdown||{}).map(([name,value])=>({name,value}))} nameKey="name" valueKey="value"/>
                </div>
              </div>

              <div className="bg-gradient-to-br from-primary/5 to-surface border border-primary/20 rounded-[2.5rem] p-8 shadow-xl">
                <h3 className="font-black text-textMain uppercase text-xs tracking-widest mb-6">Top Revenue Contributing Clients</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(d.topClients||[]).map((c,i) => (
                    <div key={i} className="flex items-center gap-4 p-5 glass-surface rounded-2xl border border-primary/10 hover:border-primary/30 transition-all group">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm font-black group-hover:bg-primary group-hover:text-textMain transition-all">{i+1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-textMain truncate">{c.name}</p>
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-0.5">₹{Number(c.amount).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* CONTENT: OPERATIONS */}
          {tab === 'operations' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard label="Total Bookings" value={d.bookings?.total||0} icon={<Calendar size={24}/>} color="primary" />
                <StatCard label="Utilization Rate" value={`${Math.round((d.bookings?.confirmed/d.bookings?.total)*100)||0}%`} icon={<Activity size={24}/>} color="emerald-500" />
                <StatCard label="Visitor Flow" value={d.visitors?.total||0} icon={<Users size={24}/>} color="blue-400" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gradient-to-br from-primary/5 to-surface border border-primary/20 rounded-[2.5rem] p-8 shadow-xl">
                  <h3 className="font-black text-textMain uppercase text-xs tracking-widest mb-8">Booking & Reservations Trend</h3>
                  <TrendLineChart data={d.bookings?.trend||[]} dataKey="count" label="Bookings" color="#14B8A6"/>
                </div>
                <div className="bg-gradient-to-br from-primary/5 to-surface border border-primary/20 rounded-[2.5rem] p-8 shadow-xl">
                  <h3 className="font-black text-textMain uppercase text-xs tracking-widest mb-8">Room Availability vs Usage</h3>
                  <div className="space-y-4">
                    {(d.bookings?.roomUsage||[]).map((r,i)=>(
                      <div key={i} className="flex items-center justify-between p-4 glass-surface rounded-2xl border border-primary/10">
                        <span className="font-bold text-sm text-textMain">{r.room}</span>
                        <div className="flex items-center gap-3">
                           <div className="w-24 h-1.5 bg-background rounded-full overflow-hidden border border-borderSubtle">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, (r.count/20)*100)}%` }} />
                           </div>
                           <span className="text-[10px] font-black text-primary uppercase">{r.count} Bookings</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* CONTENT: GROWTH */}
          {tab === 'growth' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard label="New Leads" value={d.totalLeads||0} icon={<TrendingUp size={24}/>} color="primary" />
                <StatCard label="Conversion Rate" value={`${d.conversionRate||0}%`} icon={<Zap size={24}/>} color="orange-400" />
                <StatCard label="Active Portfolio" value={d.onboarding.totals?.active||0} icon={<Users size={24}/>} color="emerald-500" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gradient-to-br from-primary/5 to-surface border border-primary/20 rounded-[2.5rem] p-8 shadow-xl text-center">
                  <h3 className="font-black text-textMain uppercase text-xs tracking-widest mb-10">Sales Pipeline Funnel</h3>
                  <FunnelBars data={d.funnel||[]} />
                </div>
                <div className="bg-gradient-to-br from-primary/5 to-surface border border-primary/20 rounded-[2.5rem] p-8 shadow-xl">
                  <h3 className="font-black text-textMain uppercase text-xs tracking-widest mb-8">Lead Priority Breakdown</h3>
                  <DonutChart data={Object.entries(d.priorityMap||{}).map(([name,value])=>({name,value}))} nameKey="name" valueKey="value"/>
                </div>
              </div>

              <div className="bg-gradient-to-br from-primary/5 to-surface border border-primary/20 rounded-[2.5rem] p-8 shadow-xl">
                 <h3 className="font-black text-textMain uppercase text-xs tracking-widest mb-6">Recent Onboarding Performance</h3>
                 <TrendLineChart data={d.onboarding.onboardingTrend||[]} dataKey="count" label="Onboarded" color="#4F46E5" />
              </div>
            </>
          )}

        </motion.div>
      ) : (
        <div className="h-96 flex flex-col items-center justify-center space-y-4">
           <AlertTriangle size={48} className="text-rose-400" />
           <p className="text-textMuted font-medium">Failed to load intelligence data. Please try again.</p>
        </div>
      )}
    </div>
  );
}
