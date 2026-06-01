import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, Clock, Trash2, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

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

const Logs = () => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isClearingLogs, setIsClearingLogs] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const token = localStorage.getItem('dworkz_token');
      const res = await axios.get('http://localhost:5000/api/v1/activities?limit=all', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActivities(res.data.data);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearLogs = async () => {
    setIsClearingLogs(true);
    try {
      const token = localStorage.getItem('dworkz_token');
      await axios.delete('http://localhost:5000/api/v1/activities', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActivities([]);
      setIsClearModalOpen(false);
    } catch (err) {
      console.error('Failed to clear logs:', err);
    } finally {
      setIsClearingLogs(false);
    }
  };

  return (
    <div className="p-8 w-full max-w-5xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <button 
            onClick={() => navigate('/')} 
            className="flex items-center gap-2 text-textMuted hover:text-primary transition-colors text-sm font-bold uppercase tracking-widest mb-4"
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
          <h1 className="text-3xl font-black text-textMain uppercase tracking-tight flex items-center gap-3">
            <Activity className="text-primary" size={32} /> System Logs
          </h1>
          <p className="text-textMuted mt-2 font-medium">Complete audit trail of all workspace actions and events.</p>
        </div>
        
        {activities.length > 0 && (
          <button 
            onClick={() => setIsClearModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all border border-rose-500/20 shadow-sm"
          >
            <Trash2 size={16} /> Clear All Logs
          </button>
        )}
      </div>

      <div className="bg-surface border border-borderSubtle rounded-[2rem] p-8 shadow-xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-textMuted">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="font-bold uppercase tracking-widest text-xs">Loading logs...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center text-borderSubtle border border-borderSubtle mb-4 shadow-inner">
              <Activity size={32} />
            </div>
            <h3 className="text-xl font-black text-textMain mb-2">System is Quiet</h3>
            <p className="text-textMuted max-w-sm">There are no recent activities to display. All caught up!</p>
          </div>
        ) : (
          <div className="space-y-4 relative">
            <div className="absolute left-[27px] top-4 bottom-4 w-px bg-borderSubtle"></div>
            {activities.map((activity, index) => (
              <motion.div 
                key={activity._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="flex gap-6 relative group"
              >
                <div className="w-14 flex flex-col items-center relative">
                  <div className={`w-14 h-14 rounded-2xl bg-background border-4 border-surface shadow-xl flex items-center justify-center z-10 transition-transform group-hover:scale-110`}>
                    <div className={`w-5 h-5 rounded-full ${activity.color}`}></div>
                  </div>
                </div>
                
                <div className="flex-1 bg-background border border-borderSubtle rounded-2xl p-5 group-hover:border-primary/50 transition-colors shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-sm font-black text-textMain">{activity.title}</h3>
                      {/* TYPE BADGE */}
                      <span className="text-[9px] font-black uppercase tracking-widest text-textMuted bg-surface px-2 py-0.5 rounded-md border border-borderSubtle">
                        {activity.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-textMuted bg-surface px-2 py-1 rounded-lg border border-borderSubtle flex-shrink-0">
                      <Clock size={10} />
                      {timeAgo(activity.createdAt)}
                    </div>
                  </div>

                  <p className="text-xs text-textMuted leading-relaxed mb-3">{activity.desc}</p>

                  <div className="flex items-center justify-between flex-wrap gap-2">
                    {/* PERFORMED BY — the key audit field */}
                    {activity.performedByName ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[9px] font-black text-primary">
                          {activity.performedByName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">{activity.performedByName}</span>
                        <span className="text-[10px] text-textMuted/60">performed this action</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-textMuted/50 italic">System generated</span>
                    )}
                    <p className="text-[10px] font-bold text-textMuted/50 uppercase tracking-widest">
                      {new Date(activity.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Clear Modal */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface border border-borderSubtle rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-6"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
                <Trash2 size={32} />
              </div>
              <h2 className="text-2xl font-black text-textMain uppercase tracking-tight mb-2">Clear All Logs?</h2>
              <p className="text-textMuted text-sm">Are you sure you want to permanently delete all system logs? This action cannot be undone.</p>
            </div>
            
            <div className="flex gap-4 pt-4">
              <button
                onClick={() => setIsClearModalOpen(false)}
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
                  'Clear Everything'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Logs;
