import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import api, { API_URL } from './utils/api';
import Dashboard from './components/Dashboard';
import Clients from './features/clients/Clients';
import ClientDetail from './features/clients/ClientDetail';
import Visitors from './features/visitors/Visitors';
import Inventory from './features/inventory/Inventory';
import Billing from './features/billing/Billing';
import Bookings from './features/bookings/Bookings';
import LeadsTracker from './features/leads/LeadsTracker';
import Services from './features/services/Services';
import Login from './features/auth/Login';
import SettingsView from './features/settings/Settings';
import Archives from './features/archives/Archives';
import Logs from './features/logs/Logs';
import ProposalView from './features/leads/ProposalView';
import ClientPortalLogin from './features/client-portal/ClientPortalLogin';
import ClientPortalDashboard from './features/client-portal/ClientPortalDashboard';
// import Reports from './features/reports/Reports';
import { Home, Users, Briefcase, Box, FileText, Settings, Bell, Search, UserCircle, Calendar, TrendingUp, Archive, BarChart2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { io } from 'socket.io-client';

const Sidebar = ({ onLogout, profileData }) => {
  const location = useLocation();
  const navItems = [
    { name: 'Dashboard', path: '/', icon: Home },
    { name: 'Leads Management', path: '/leads', icon: TrendingUp },
    { name: 'Clients', path: '/clients', icon: Users },
    { name: 'Visitors', path: '/visitors', icon: UserCircle },
    { name: 'Bookings', path: '/bookings', icon: Calendar },
    { name: 'Inventory', path: '/inventory', icon: Box },
    { name: 'Billing', path: '/billing', icon: FileText },
    // { name: 'Reports', path: '/reports', icon: BarChart2 },
    { name: 'Archives', path: '/archives', icon: Archive },
    { name: 'Settings', path: '/settings', icon: Settings }
  ];

  return (
    <div className="w-72 border-r border-borderSubtle bg-background hidden md:flex flex-col relative z-20 transition-all duration-500">
      <div className="h-24 flex flex-col justify-center px-8">
        <div className="text-3xl font-bold text-textMain tracking-tighter flex items-baseline leading-none">
          DworkZ<span className="text-primary text-4xl leading-[0] ml-0.5">.</span>
        </div>
        <div className="text-[0.6rem] tracking-[0.6em] text-primary/60 ml-0.5 font-bold mt-2 uppercase">
          Workspace
        </div>
      </div>
      <nav className="flex-1 px-4 space-y-1.5 mt-4">
        {navItems.map((item, i) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link 
              key={i} 
              to={item.path} 
              className={`flex items-center gap-3.5 px-5 py-3.5 rounded-2xl transition-all duration-300 group ${
                isActive 
                  ? 'bg-primary/10 text-primary shadow-[inset_0_0_20px_rgba(20,184,166,0.05)]' 
                  : 'text-textMuted hover:text-white hover:bg-white/[0.03]'
              }`}
            >
              <Icon size={20} className={`transition-colors duration-300 ${isActive ? 'text-primary' : 'text-textMuted group-hover:text-textMain'}`} />
              <span className={`text-sm font-semibold tracking-tight ${isActive ? 'text-textMain' : 'text-textMuted group-hover:text-textMain'}`}>
                {item.name}
              </span>
              {isActive && <motion.div layoutId="activeNav" className="absolute left-0 w-1.5 h-8 bg-primary rounded-r-full shadow-[0_0_15px_rgba(20,184,166,0.5)]" />}
            </Link>
          )
        })}
      </nav>
      <div className="p-6 border-t border-borderSubtle/50">
        <div 
          onClick={(e) => { e.preventDefault(); onLogout(); }} 
          className="flex items-center gap-3.5 px-5 py-4 rounded-2xl bg-surface/50 border border-borderSubtle/50 cursor-pointer hover:bg-rose-500/10 hover:border-rose-500/20 group transition-all duration-300"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-primary/20 border border-primary/20 flex items-center justify-center text-primary font-bold shadow-sm group-hover:scale-105 transition-transform overflow-hidden">
            {profileData?.logoUrl ? (
              <img src={profileData.logoUrl} alt="A" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm">A</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-textMain group-hover:text-primary transition-colors truncate">{profileData?.name || 'Admin User'}</p>
            <p className="text-[10px] text-textMuted font-bold uppercase tracking-widest group-hover:text-primary/70 transition-colors">Logout</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const Layout = ({ children, onLogout, profileData }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const pageName = location.pathname === '/' ? 'Dashboard' : location.pathname.split('/')[1];
  const capitalizedPageName = pageName.charAt(0).toUpperCase() + pageName.slice(1);
  const [alerts, setAlerts] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [lastViewedTime, setLastViewedTime] = useState(() => {
    const saved = localStorage.getItem('dworkz_last_viewed_alerts');
    const parsed = parseInt(saved);
    return isNaN(parsed) ? 0 : parsed;
  });

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await api.get('/api/v1/alerts');
        setAlerts(Array.isArray(res.data.data) ? res.data.data : []);
      } catch (err) {
        console.error("Failed to fetch alerts", err);
        setAlerts([]);
      }
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 15000); // Check every 15 seconds
    window.addEventListener('refreshAlerts', fetchAlerts);
    
    // Real-time notification updates
    const socket = io(API_URL);
    socket.on('bookingUpdated', fetchAlerts);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('refreshAlerts', fetchAlerts);
      socket.disconnect();
    };
  }, [location.pathname]); // Refetch on route change

  return (
    <div className="min-h-screen flex bg-background font-sans text-textMain">
      <Sidebar onLogout={onLogout} profileData={profileData} />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-20 flex items-center justify-between px-8 sticky top-0 z-30 pt-4">
          <div className="flex-1 bg-surface/80 backdrop-blur-md border border-borderSubtle h-14 rounded-2xl flex items-center justify-between px-6 shadow-sm">
            <div className="text-textMuted text-xs font-bold uppercase tracking-widest">Pages / <span className="text-textMain">{capitalizedPageName}</span></div>
            <div className="flex items-center gap-6">
              
              {/* Notification Bell Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => {
                    if (showNotifications) {
                      const now = Date.now();
                      setLastViewedTime(now);
                      localStorage.setItem('dworkz_last_viewed_alerts', now.toString());
                    }
                    setShowNotifications(!showNotifications);
                  }}
                  className={`transition-colors relative p-2 rounded-full ${showNotifications ? 'bg-primary/10 text-primary' : 'text-textMuted hover:text-textMain'}`}
                >
                  <Bell size={18} />
                  {Array.isArray(alerts) && alerts.some(a => a && a.createdAt && new Date(a.createdAt).getTime() > lastViewedTime) && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-primary rounded-full border-2 border-surface animate-pulse"></span>
                  )}
                </button>
                
                {showNotifications && (
                  <div className="absolute right-0 mt-3 w-80 bg-surface border border-borderSubtle rounded-2xl shadow-2xl overflow-hidden z-50">
                    <div className="p-4 border-b border-borderSubtle bg-background/50 flex justify-between items-center">
                      <h3 className="text-sm font-black text-textMain uppercase tracking-widest">Smart Alerts</h3>
                      <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                        {Array.isArray(alerts) ? alerts.filter(a => a && a.createdAt && new Date(a.createdAt).getTime() > lastViewedTime).length : 0} New
                      </span>
                    </div>
                    <div className="max-h-96 overflow-y-auto custom-scrollbar">
                      {alerts.length === 0 ? (
                        <div className="p-8 text-center text-textMuted text-xs font-bold uppercase tracking-widest">No pending actions</div>
                      ) : (
                        <div className="divide-y divide-borderSubtle/50">
                          {Array.isArray(alerts) && alerts.filter(a => a).map(alert => (
                            <div 
                              key={alert.id || Math.random()} 
                              onClick={() => { 
                                const now = Date.now();
                                setLastViewedTime(now);
                                localStorage.setItem('dworkz_last_viewed_alerts', now.toString());
                                navigate(alert.actionLink); 
                                setShowNotifications(false); 
                              }}
                              className="p-4 hover:bg-background/80 transition-colors cursor-pointer group"
                            >
                              <div className="flex justify-between items-start mb-1">
                                <h4 className={`text-xs font-black uppercase tracking-wider ${alert.color}`}>
                                  {alert.title}
                                  {alert.createdAt && new Date(alert.createdAt).getTime() > lastViewedTime && (
                                    <span className="ml-2 w-1.5 h-1.5 bg-primary rounded-full inline-block"></span>
                                  )}
                                </h4>
                                <span className="text-[9px] font-bold text-textMuted uppercase tracking-widest">
                                  {(alert.displayDate || alert.createdAt) ? new Date(alert.displayDate || alert.createdAt).toLocaleDateString() : ''}
                                </span>
                              </div>
                              <p className="text-xs text-textMain font-medium">{alert.desc}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="h-6 w-px bg-borderSubtle"></div>
              <button onClick={(e) => { e.preventDefault(); onLogout(); }} className="text-primary hover:text-primary/80 text-xs font-black uppercase tracking-widest transition-colors">
                Logout
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto pb-10 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>
          {children}
        </main>
      </div>
    </div>
  );
};

function App() {
  const [token, setToken] = useState(localStorage.getItem('dworkz_token') || '');
  const [clientPortalToken, setClientPortalToken] = useState(localStorage.getItem('dworkz_client_token') || '');
  const [clientPortalUser, setClientPortalUser] = useState(() => {
    const saved = localStorage.getItem('dworkz_client');
    return saved ? JSON.parse(saved) : null;
  });
  const [theme, setTheme] = useState(localStorage.getItem('dworkz_theme') || 'dark');
  const [profileData, setProfileData] = useState(() => {
    const saved = localStorage.getItem('dworkz_profile');
    const loggedInUser = localStorage.getItem('dworkz_user');
    
    if (loggedInUser) {
      const user = JSON.parse(loggedInUser);
      return {
        name: user.name,
        designation: user.role.charAt(0).toUpperCase() + user.role.slice(1),
        email: user.email,
        logoUrl: null
      };
    }
    
    return saved ? JSON.parse(saved) : {
      name: 'Admin User',
      designation: 'Workspace Manager',
      email: 'admin@dworkz.com',
      logoUrl: null
    };
  });

  useEffect(() => {
    localStorage.setItem('dworkz_profile', JSON.stringify(profileData));
  }, [profileData]);

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('dworkz_theme', theme);
  }, [theme]);

  // Sync profile when token changes (login/logout)
  useEffect(() => {
    if (token) {
      const loggedInUser = localStorage.getItem('dworkz_user');
      if (loggedInUser) {
        const user = JSON.parse(loggedInUser);
        setProfileData({
          name: user.name,
          designation: user.role.charAt(0).toUpperCase() + user.role.slice(1),
          email: user.email,
          logoUrl: null
        });
      }
    }
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem('dworkz_token');
    setToken('');
    window.location.href = '/';
  };

  return (
    <Router>
      <Routes>
        {/* PUBLIC ROUTES (No Token Needed) */}
        <Route path="/proposal/:id" element={<ProposalView />} />

        {/* ── CLIENT PORTAL (Separate Auth Tree) ── */}
        <Route path="/client-portal/*" element={
          clientPortalToken && clientPortalUser ? (
            <ClientPortalDashboard
              client={clientPortalUser}
              token={clientPortalToken}
              onLogout={() => {
                localStorage.removeItem('dworkz_client_token');
                localStorage.removeItem('dworkz_client');
                setClientPortalToken('');
                setClientPortalUser(null);
              }}
            />
          ) : (
            <ClientPortalLogin onLogin={(t, c) => { setClientPortalToken(t); setClientPortalUser(c); }} />
          )
        } />
        
        {/* PROTECTED ROUTES FLOW */}
        {!token ? (
          <Route path="*" element={<Login setToken={setToken} />} />
        ) : (
          <Route path="*" element={
            <Layout onLogout={handleLogout} profileData={profileData}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/leads" element={<LeadsTracker />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/clients/:id" element={<ClientDetail />} />
                <Route path="/visitors" element={<Visitors />} />
                <Route path="/bookings" element={<Bookings />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/billing" element={<Billing />} />
                {/* <Route path="/reports" element={<Reports />} /> */}
                <Route path="/archives" element={<Archives />} />
                <Route path="/logs" element={<Logs />} />
                <Route path="/settings" element={<SettingsView theme={theme} setTheme={setTheme} profileData={profileData} setProfileData={setProfileData} />} />
                <Route path="*" element={<div className="p-8"><h1 className="text-2xl font-bold text-white">Coming Soon</h1><p className="text-textMuted mt-2">This module is under development.</p></div>} />
              </Routes>
            </Layout>
          } />
        )}
      </Routes>
    </Router>
  );
}

export default App;
