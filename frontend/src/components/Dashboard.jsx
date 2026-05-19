import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Users, IndianRupee, Calendar as CalendarIcon, Package, Mail, Send, Activity, ArrowUpRight, Clock, Armchair, PenTool, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const timeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " mins ago";
  return "Just now";
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState([
    { title: 'Total Revenue', value: '₹0', icon: IndianRupee, trend: '0%', color: 'text-primary' },
    { title: 'Active Clients', value: '0', icon: Users, trend: '0%', color: 'text-secondary' },
    { title: 'Occupancy Rate', value: '0%', icon: Armchair, trend: '0%', color: 'text-accent' },
    { title: 'Pending Receivable', value: '₹0', icon: IndianRupee, trend: 'To Collect', color: 'text-emerald-400' },
    { title: 'Pending Payable', value: '₹0', icon: IndianRupee, trend: 'To Pay', color: 'text-rose-400' },
  ]);
  const [bookings, setBookings] = useState([]);
  const [conversion, setConversion] = useState({ leads: 0, proposalsSent: 0, awaitingSignature: 0, activeClients: 0 });
  const [utilization, setUtilization] = useState([]);
  const [loading, setLoading] = useState(true);

  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('dworkz_user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('dworkz_token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        
        // Fetch Stats
        const statsRes = await axios.get(`${API_URL}/api/v1/clients/stats`, config);
        const s = statsRes.data.data;
        
        // Fetch Activities
        const actRes = await axios.get(`${API_URL}/api/v1/activities`, config);
        setActivities(actRes.data.data);

        // Fetch Bookings
        const bookRes = await axios.get(`${API_URL}/api/v1/bookings/today`, config);
        setBookings(bookRes.data.data);

        setConversion({
          leads: s?.leads || 0,
          proposalsSent: s?.proposalsSent || 0,
          awaitingSignature: s?.awaitingSignature || 0,
          activeClients: s?.activeClients || 0
        });

        setStats([
          { title: 'Total Revenue', value: `₹${(s?.totalRevenue || 0).toLocaleString()}`, icon: IndianRupee, trend: 'Monthly', color: 'text-primary' },
          { title: 'Active Clients', value: (s?.activeClients || 0).toString(), icon: Users, trend: 'Verified', color: 'text-secondary' },
          { title: 'Occupancy Rate', value: `${s?.occupancyRate || 0}%`, icon: Armchair, trend: 'Live', color: 'text-accent' },
          { title: 'Pending Receivable', value: `₹${(s?.pendingReceivable || 0).toLocaleString()}`, icon: IndianRupee, trend: 'To Collect', color: 'text-emerald-400' },
          { title: 'Pending Payable', value: `₹${(s?.pendingPayable || 0).toLocaleString()}`, icon: IndianRupee, trend: 'To Pay', color: 'text-rose-400' },
        ]);

        // Fetch Utilization
        const utilRes = await axios.get(`${API_URL}/api/v1/utilization`, config);
        setUtilization(utilRes.data.data);
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    // Listen for seamless real-time updates from portal actions
    const socket = io(API_URL);
    socket.on('bookingUpdated', () => {
      fetchData();
    });

    return () => socket.disconnect();
  }, []);

  const [isClearLogsModalOpen, setIsClearLogsModalOpen] = useState(false);
  const [isClearingLogs, setIsClearingLogs] = useState(false);

  const handleSendInvoice = (client) => {
    alert(`Invoice sent to ${client} successfully via email!`);
  };

  const handleClearLogs = async () => {
    setIsClearingLogs(true);
    try {
      const token = localStorage.getItem('dworkz_token');
      await axios.delete(`${API_URL}/api/v1/activities`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActivities([]);
      setIsClearLogsModalOpen(false);
    } catch (err) {
      console.error('Failed to clear logs:', err);
    } finally {
      setIsClearingLogs(false);
    }
  };


  return (
    <div className="p-8 w-full max-w-7xl mx-auto space-y-10">
      <div>
        <h1 className="text-3xl font-black text-textMain uppercase tracking-tight">
          Overview
        </h1>
        <p className="text-textMuted mt-2 font-medium">Welcome back{user ? `, ${user.name}` : ''}. Here's what's happening today in your workspace.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gradient-to-br from-primary/20 to-surface border border-primary/30 rounded-[2.5rem] p-6 shadow-xl relative overflow-hidden group hover:border-primary/50 transition-all hover:scale-[1.02]"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/15 to-transparent rounded-bl-[4rem] -z-10 group-hover:scale-110 transition-transform"></div>
              
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl glass-surface ${stat.color} shadow-sm group-hover:scale-110 transition-transform`}>
                  <Icon size={20} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-textMuted px-2 py-1 rounded-md glass-badge">
                  {stat.trend}
                </span>
              </div>
              
              <h3 className="text-[11px] font-black uppercase tracking-widest text-textMuted mb-1">{stat.title}</h3>
              <p className="text-3xl font-black text-textMain tracking-tight">{loading ? '...' : stat.value}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* Conversion Pipeline */}
        <div className="bg-gradient-to-br from-primary/20 to-surface border border-primary/30 rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden group hover:border-primary/40 transition-all">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-primary/20 transition-all"></div>
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 glass-surface text-primary rounded-2xl flex items-center justify-center border-primary/30 shadow-inner">
               <Activity size={24} />
            </div>
            <div>
               <h2 className="text-xl font-black text-textMain tracking-tight">Lead Pipeline</h2>
               <p className="text-xs text-textMuted font-bold uppercase tracking-widest">Lead conversion status</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="flex justify-between items-end border-b border-primary/20 pb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-textMuted mb-1">Total Leads</p>
                <p className="text-2xl font-black text-textMain">{conversion.leads}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-textMuted mb-1">Active Members</p>
                <p className="text-2xl font-black text-primary">{conversion.activeClients}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center group/item p-3 rounded-2xl hover:bg-primary/5 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl glass-badge flex items-center justify-center text-textMuted group-hover/item:border-primary transition-colors shadow-sm">
                    <Mail size={14} />
                  </div>
                  <span className="text-sm font-bold text-textMain">Proposals Sent</span>
                </div>
                <span className="text-lg font-black text-textMain">{conversion.proposalsSent}</span>
              </div>
              
              <div className="flex justify-between items-center group/item p-3 rounded-2xl hover:bg-primary/5 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl glass-badge flex items-center justify-center text-textMuted group-hover/item:border-orange-500 transition-colors shadow-sm">
                    <PenTool size={14} />
                  </div>
                  <span className="text-sm font-bold text-textMain">Awaiting Signature</span>
                </div>
                <span className="text-lg font-black text-orange-500">{conversion.awaitingSignature}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Meeting Room Timeline */}
        <div className="bg-gradient-to-br from-emerald-500/15 to-surface border border-emerald-500/30 rounded-[2.5rem] p-8 shadow-xl hover:border-emerald-500/40 transition-all group">
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate('/bookings')}>
               <div className="w-12 h-12 glass-surface text-emerald-400 rounded-2xl flex items-center justify-center border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors shadow-inner">
                  <CalendarIcon size={24} />
               </div>
               <div>
                  <h2 className="text-xl font-black text-textMain tracking-tight flex items-center gap-2 group-hover:text-emerald-500 transition-colors">
                    Meeting Room Availability <ArrowUpRight size={16} className="text-textMuted group-hover:text-emerald-500 transition-colors" />
                  </h2>
                  <p className="text-xs text-textMuted font-bold uppercase tracking-widest">Real-time scheduling overview</p>
               </div>
            </div>
            <div 
              className="glass-badge px-4 py-2 rounded-xl cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all"
              onClick={() => navigate('/bookings')}
            >
              <span className="text-[10px] font-black uppercase tracking-widest text-textMain">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>
          
          <div className="mt-8">
            <div className="relative">
              {/* Timeline Header */}
              <div className="flex justify-between text-[10px] font-black text-textMuted uppercase tracking-wider mb-2">
                {[9,10,11,12,1,2,3,4,5,6,7,8,9].map((hour, i) => (
                  <span key={i} className="flex-1 text-center">{hour} {i < 3 || i === 12 ? 'AM' : 'PM'}</span>
                ))}
              </div>
              
              {/* Timeline Track */}
              <div className="h-14 timeline-track border border-emerald-500/15 rounded-2xl relative overflow-hidden flex shadow-inner">
                <div className="absolute inset-0 flex">
                  {[9,10,11,12,13,14,15,16,17,18,19,20].map((h, i) => (
                    <div key={i} className="flex-1 border-r border-emerald-500/15 last:border-r-0"></div>
                  ))}
                </div>
                
                {/* Bookings */}
                <div className="absolute inset-0">
                  {bookings.map((booking, idx) => {
                    const startHour = parseInt(booking.startTime.split(':')[0]);
                    const endHour = parseInt(booking.endTime.split(':')[0]);
                    
                    const leftPercent = ((startHour - 9) / 12) * 100;
                    const widthPercent = ((endHour - startHour) / 12) * 100;
                    
                    if (leftPercent < 0 || leftPercent >= 100) return null;
                    
                    return (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, scaleX: 0 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        className="absolute top-2 bottom-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-center text-[10px] font-black uppercase text-emerald-600 tracking-wider shadow-sm origin-left cursor-help"
                        style={{ 
                          left: `${leftPercent}%`, 
                          width: `${widthPercent}%`,
                          minWidth: '40px'
                        }}
                        title={`${booking.startTime} - ${booking.endTime}`}
                      >
                        <span className="truncate">{booking.client?.companyName || booking.clientName}</span>
                      </motion.div>
                    );
                  })}

                  {/* Availability indicators */}
                  <div className="flex w-full h-full">
                    {[9,10,11,12,13,14,15,16,17,18,19,20].map((h, i) => {
                      const isOccupied = bookings.some(b => {
                        const s = parseInt(b.startTime.split(':')[0]);
                        const e = parseInt(b.endTime.split(':')[0]);
                        return h >= s && h < e;
                      });
                      if (isOccupied) return <div key={i} className="flex-1"></div>;
                      return (
                        <div key={i} className="flex-1 flex items-center justify-center text-[8px] text-textMain/40 font-black uppercase tracking-[0.2em] hover:text-primary transition-colors mt-1.5">
                          Free
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Utilization and Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Utilization Table */}
        <div className="xl:col-span-2 bg-gradient-to-br from-primary/20 to-surface border border-primary/30 rounded-[2.5rem] shadow-xl overflow-hidden flex flex-col group hover:border-primary/40 transition-all">
          <div className="p-8 border-b border-primary/20 flex justify-between items-center glass-surface sticky top-0 z-10">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-secondary/10 border border-secondary/20 rounded-2xl flex items-center justify-center text-secondary shadow-inner">
                  <Activity size={24} />
               </div>
               <div>
                  <h2 className="text-xl font-black text-textMain tracking-tight">Meeting Room Utilization</h2>
                  <p className="text-xs text-textMuted font-bold uppercase tracking-widest">Monthly consumption tracking</p>
               </div>
            </div>
            <div className="text-[10px] text-primary font-black uppercase tracking-[0.2em] glass-badge px-4 py-2 rounded-xl shadow-inner">
              Quota: 12 HRS / MO
            </div>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-textMain/5 border-b border-primary/10 text-textMuted">
                <tr>
                  <th className="px-6 py-4 font-black uppercase tracking-wider text-[10px]">Client Name</th>
                  <th className="px-6 py-4 font-black uppercase tracking-wider text-[10px] text-center">Actual Utilized</th>
                  <th className="px-6 py-4 font-black uppercase tracking-wider text-[10px] text-center">Balance Left</th>
                  <th className="px-6 py-4 font-black uppercase tracking-wider text-[10px] text-right">Overage (₹)</th>
                  <th className="px-6 py-4 font-black uppercase tracking-wider text-[10px] text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/10 text-textMain">
                {utilization.map(data => {
                  const overageHours = Math.max(0, data.utilized - data.allowed);
                  const overageAmount = overageHours * data.rate;
                  const balance = Math.max(0, data.allowed - data.utilized);
                  
                  return (
                    <tr key={data.id} className="hover:bg-primary/5 transition-colors group/row">
                      <td className="px-6 py-4 font-bold text-textMain">{data.client}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-textMain font-bold">{data.utilized}</span> <span className="text-textMuted">/ {data.allowed} hrs</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase border ${balance > 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                          {balance > 0 ? `${balance} hrs free` : 'Exhausted'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold">
                        {overageAmount > 0 ? <span className="text-rose-400">₹{overageAmount.toLocaleString()}</span> : <span className="text-textMuted">-</span>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {overageAmount > 0 ? (
                          <button onClick={() => handleSendInvoice(data.client)} className="bg-primary/10 text-primary hover:bg-primary hover:text-textMain border border-primary/20 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ml-auto shadow-sm">
                            <Send size={14} /> Send Invoice
                          </button>
                        ) : (
                          <span className="text-xs text-textMuted italic pr-4">No overage</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-gradient-to-br from-primary/20 to-surface border border-primary/30 rounded-[2.5rem] p-8 shadow-xl hover:border-primary/40 transition-all flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-black text-textMain uppercase tracking-tight">Recent Logs</h2>
            <div className="flex items-center gap-3">
              {activities.length > 0 && (
                <button 
                  onClick={() => setIsClearLogsModalOpen(true)} 
                  className="text-rose-400 hover:text-rose-500 text-[10px] font-black uppercase tracking-widest hover:underline transition-colors"
                >
                  Clear All
                </button>
              )}
              <button 
                onClick={() => navigate('/logs')}
                className="text-primary text-xs font-black uppercase tracking-widest hover:underline flex items-center gap-1"
              >
                View all <ArrowUpRight size={14} />
              </button>
            </div>
          </div>
          <div className="space-y-6 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
            {loading ? (
               <div className="text-textMuted text-sm font-bold uppercase tracking-widest">Loading...</div>
            ) : activities.length === 0 ? (
               <div className="text-textMuted text-sm font-bold uppercase tracking-widest">Empty</div>
            ) : activities.map((activity, i) => (
              <div key={activity._id} className="flex gap-4 relative group/log">
                {i !== activities.length - 1 && <div className="absolute left-3 top-3 bottom-[-20px] w-0.5 bg-primary/20 group-hover/log:bg-primary/40 transition-colors"></div>}
                <div className={`w-6 h-6 rounded-full ${activity.color} flex-shrink-0 border-4 border-surface z-10 shadow-lg`}></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-black text-textMain tracking-tight">{activity.title}</h4>
                    {activity.performedByName && (
                      <span className="flex-shrink-0 text-[8px] font-black uppercase tracking-widest glass-badge text-primary px-2 py-0.5 rounded-lg shadow-sm">
                        {activity.performedByName}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-textMuted mt-1 mb-1.5 leading-relaxed font-bold">{activity.desc}</p>
                  <span className="text-[10px] text-textMuted/70 font-black uppercase tracking-widest">{timeAgo(activity.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Clear Logs Modal */}
      {isClearLogsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface border border-borderSubtle rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-6"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
                <Activity size={32} />
              </div>
              <h2 className="text-2xl font-black text-textMain uppercase tracking-tight mb-2">Clear Logs?</h2>
              <p className="text-textMuted text-sm">Are you sure you want to clear all system logs? This action cannot be undone.</p>
            </div>
            
            <div className="flex gap-4 pt-4">
              <button
                onClick={() => setIsClearLogsModalOpen(false)}
                className="flex-1 px-6 py-3 bg-background border border-borderSubtle text-textMain rounded-2xl font-bold uppercase tracking-widest text-xs hover:border-primary/50 hover:text-primary transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleClearLogs}
                disabled={isClearingLogs}
                className="flex-1 px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-rose-500/20 transition-all flex items-center justify-center gap-2"
              >
                {isClearingLogs ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  'Clear All'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
