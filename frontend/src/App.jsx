import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import api, { API_URL } from './utils/api';
import ErrorToast from './components/ErrorToast';
// Each page below is loaded as its own chunk on first visit instead of being
// bundled into one large upfront download — previously every user downloaded
// the entire app (Dashboard + Leads + Clients + Billing + ... ~700KB+ of
// source) just to see the login screen, regardless of which single page they
// actually needed. Login/ClientPortalLogin stay as regular imports since
// they're small and are the very first thing an unauthenticated user sees —
// lazy-loading those would just add an extra loading flash for no benefit.
import Login from './features/auth/Login';
import ClientPortalLogin from './features/client-portal/ClientPortalLogin';
const Dashboard = lazy(() => import('./components/Dashboard'));
const Clients = lazy(() => import('./features/clients/Clients'));
const ClientDetail = lazy(() => import('./features/clients/ClientDetail'));
const Visitors = lazy(() => import('./features/visitors/Visitors'));
const Passes = lazy(() => import('./features/passes/Passes'));
const Inventory = lazy(() => import('./features/inventory/Inventory'));
const Billing = lazy(() => import('./features/billing/Billing'));
const Bookings = lazy(() => import('./features/bookings/Bookings'));
const LeadsTracker = lazy(() => import('./features/leads/LeadsTracker'));
const Services = lazy(() => import('./features/services/Services'));
const SettingsView = lazy(() => import('./features/settings/Settings'));
const Archives = lazy(() => import('./features/archives/Archives'));
const Logs = lazy(() => import('./features/logs/Logs'));
const ProposalView = lazy(() => import('./features/leads/ProposalView'));
const ClientPortalDashboard = lazy(() => import('./features/client-portal/ClientPortalDashboard'));
import { Home, Users, Briefcase, Box, FileText, Settings, Bell, Search, UserCircle, Calendar, TrendingUp, Archive, BarChart2, Ticket, Menu, X, LogOut, MoreHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';

// A minimal, brand-consistent loading state shown briefly while a page
// chunk downloads (only happens once per page per session — the browser
// caches each chunk after that).
const PageLoadingFallback = () => (
  <div className="flex items-center justify-center h-full w-full min-h-[60vh]">
    <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
  </div>
);

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const Sidebar = ({ onLogout, profileData, isOpen, onClose }) => {
  const location = useLocation();
  const navItems = [
    { name: 'Dashboard', path: '/', icon: Home },
    { name: 'Leads Management', path: '/leads', icon: TrendingUp },
    { name: 'Clients', path: '/clients', icon: Users },
    { name: 'Passes', path: '/passes', icon: Ticket },
    { name: 'Visitors', path: '/visitors', icon: UserCircle },
    { name: 'Bookings', path: '/bookings', icon: Calendar },
    { name: 'Inventory', path: '/inventory', icon: Box },
    { name: 'Billing', path: '/billing', icon: FileText },
    { name: 'Archives', path: '/archives', icon: Archive },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Panel */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 w-72 border-r border-borderSubtle bg-background flex flex-col
          transition-transform duration-300 ease-in-out
          lg:static lg:translate-x-0 lg:z-20
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo + Close button on mobile */}
        <div className="h-20 flex items-center justify-between px-6 md:h-24 md:flex-col md:items-start md:justify-center md:px-8">
          <div>
            <div className="text-2xl md:text-3xl font-bold text-textMain tracking-tighter flex items-baseline leading-none">
              DworkZ<span className="text-primary text-3xl md:text-4xl leading-[0] ml-0.5">.</span>
            </div>
            <div className="text-[0.55rem] tracking-[0.5em] text-primary/60 ml-0.5 font-bold mt-1.5 uppercase">
              Workspace
            </div>
          </div>
          {/* Close button — mobile only */}
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-xl text-textMuted hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-2 overflow-y-auto">
          {navItems.map((item, i) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={i}
                to={item.path}
                onClick={onClose}
                className={`flex items-center gap-3.5 px-5 py-3.5 rounded-2xl transition-all duration-300 group relative ${
                  isActive
                    ? 'bg-primary/10 text-primary shadow-[inset_0_0_20px_rgba(20,184,166,0.05)]'
                    : 'text-textMuted hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                <Icon size={20} className={`transition-colors duration-300 flex-shrink-0 ${isActive ? 'text-primary' : 'text-textMuted group-hover:text-textMain'}`} />
                <span className={`text-sm font-semibold tracking-tight ${isActive ? 'text-textMain' : 'text-textMuted group-hover:text-textMain'}`}>
                  {item.name}
                </span>
                {isActive && (
                  <motion.div layoutId="activeNav" className="absolute left-0 w-1.5 h-8 bg-primary rounded-r-full shadow-[0_0_15px_rgba(20,184,166,0.5)]" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-borderSubtle/50">
          <div
            onClick={(e) => { e.preventDefault(); onLogout(); }}
            className="flex items-center gap-3.5 px-5 py-4 rounded-2xl bg-surface/50 border border-borderSubtle/50 cursor-pointer hover:bg-rose-500/10 hover:border-rose-500/20 group transition-all duration-300"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/10 to-primary/20 border border-primary/20 flex items-center justify-center text-primary font-bold shadow-sm group-hover:scale-105 transition-transform overflow-hidden flex-shrink-0">
              {profileData?.logoUrl ? (
                <img src={profileData.logoUrl} alt="A" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm">{(profileData?.name || 'A').charAt(0)}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-textMain group-hover:text-primary transition-colors truncate">{profileData?.name || 'Admin User'}</p>
              <p className="text-[10px] text-textMuted font-bold uppercase tracking-widest group-hover:text-rose-400 transition-colors">Logout</p>
            </div>
            <LogOut size={16} className="text-textMuted group-hover:text-rose-400 transition-colors flex-shrink-0" />
          </div>
        </div>
      </div>
    </>
  );
};

// ─── Mobile Bottom Navigation Bar ────────────────────────────────────────────
const MobileBottomNav = ({ onMenuOpen }) => {
  const location = useLocation();
  const quickNav = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Clients', path: '/clients', icon: Users },
    { name: 'Bookings', path: '/bookings', icon: Calendar },
    { name: 'Billing', path: '/billing', icon: FileText },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-background/95 backdrop-blur-xl border-t border-borderSubtle pb-safe">
      <div className="flex items-center justify-around px-2 py-2">
        {quickNav.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all duration-200 min-w-[56px]"
            >
              <Icon
                size={22}
                className={`transition-colors ${isActive ? 'text-primary' : 'text-textMuted'}`}
              />
              <span className={`text-[9px] font-bold uppercase tracking-wider ${isActive ? 'text-primary' : 'text-textMuted'}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
        {/* More / Hamburger */}
        <button
          onClick={onMenuOpen}
          className="flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all duration-200 min-w-[56px]"
        >
          <Menu size={22} className="text-textMuted" />
          <span className="text-[9px] font-bold uppercase tracking-wider text-textMuted">More</span>
        </button>
      </div>
    </div>
  );
};

// ─── Layout ──────────────────────────────────────────────────────────────────
const Layout = ({ children, onLogout, profileData }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pageName = location.pathname === '/' ? 'Dashboard' : location.pathname.split('/')[1];
  const capitalizedPageName = pageName.charAt(0).toUpperCase() + pageName.slice(1);
  const [alerts, setAlerts] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [lastViewedTime, setLastViewedTime] = useState(() => {
    const saved = localStorage.getItem('dworkz_last_viewed_alerts');
    const parsed = parseInt(saved);
    return isNaN(parsed) ? 0 : parsed;
  });

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const fetchAlerts = React.useCallback(async () => {
    try {
      const res = await api.get('/api/v1/alerts');
      setAlerts(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (err) {
      console.error('Failed to fetch alerts', err);
      setAlerts([]);
    }
  }, []);

  // Fetch alerts on path change (lightweight API call, no socket recreation)
  useEffect(() => {
    fetchAlerts();
  }, [location.pathname, fetchAlerts]);

  // Persistent Socket & Polling Setup (runs once on layout mount)
  useEffect(() => {
    // Poll at a much lower frequency (was every 15s = 240+ calls/hour per open tab)
    // and skip the tick entirely while the tab isn't visible, since bookingUpdated
    // socket events + the route-change fetch already keep alerts fresh in the common case.
    const interval = setInterval(() => {
      if (!document.hidden) fetchAlerts();
    }, 60000);
    window.addEventListener('refreshAlerts', fetchAlerts);
    const handleVisibility = () => { if (!document.hidden) fetchAlerts(); };
    document.addEventListener('visibilitychange', handleVisibility);
    const socket = io(API_URL);
    socket.on('bookingUpdated', fetchAlerts);
    return () => {
      clearInterval(interval);
      window.removeEventListener('refreshAlerts', fetchAlerts);
      document.removeEventListener('visibilitychange', handleVisibility);
      socket.disconnect();
    };
  }, [fetchAlerts]);

  const unreadCount = Array.isArray(alerts)
    ? alerts.filter(a => a && a.createdAt && new Date(a.createdAt).getTime() > lastViewedTime).length
    : 0;

  return (
    <div className="min-h-screen flex bg-background font-sans text-textMain">
      <Sidebar
        onLogout={onLogout}
        profileData={profileData}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col overflow-hidden relative min-w-0">
        {/* ── Header ── */}
        <header className="h-16 lg:h-20 flex items-center justify-between px-3 lg:px-8 sticky top-0 z-30 pt-2 lg:pt-4 pt-safe">
          <div className="flex-1 bg-surface/80 backdrop-blur-md border border-borderSubtle h-12 lg:h-14 rounded-2xl flex items-center justify-between px-3 lg:px-6 shadow-sm gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-xl text-textMuted hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
            >
              <Menu size={20} />
            </button>

            {/* Breadcrumb — hidden on very small, visible md+ */}
            <div className="hidden lg:block text-textMuted text-xs font-bold uppercase tracking-widest">
              Pages / <span className="text-textMain">{capitalizedPageName}</span>
            </div>

            {/* Mobile: show page name centered */}
            <div className="lg:hidden text-textMain text-xs font-black uppercase tracking-widest">
              {capitalizedPageName}
            </div>

            <div className="flex items-center gap-3 lg:gap-6 flex-shrink-0">
              {/* Notification Bell */}
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
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-primary rounded-full border-2 border-surface animate-pulse" />
                  )}
                </button>

                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-3 w-72 md:w-80 bg-surface border border-borderSubtle rounded-2xl shadow-2xl overflow-hidden z-50"
                    >
                      <div className="p-4 border-b border-borderSubtle bg-background/50 flex justify-between items-center">
                        <h3 className="text-sm font-black text-textMain uppercase tracking-widest">Smart Alerts</h3>
                        <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                          {unreadCount} New
                        </span>
                      </div>
                      <div className="max-h-72 md:max-h-96 overflow-y-auto custom-scrollbar">
                        {alerts.length === 0 ? (
                          <div className="p-8 text-center text-textMuted text-xs font-bold uppercase tracking-widest">No pending actions</div>
                        ) : (
                          <div className="divide-y divide-borderSubtle/50">
                            {alerts.filter(a => a).map(alert => (
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
                                      <span className="ml-2 w-1.5 h-1.5 bg-primary rounded-full inline-block" />
                                    )}
                                  </h4>
                                  <span className="text-[9px] font-bold text-textMuted uppercase tracking-widest flex-shrink-0 ml-2">
                                    {(alert.displayDate || alert.createdAt) ? new Date(alert.displayDate || alert.createdAt).toLocaleDateString('en-IN') : ''}
                                  </span>
                                </div>
                                <p className="text-xs text-textMain font-medium">{alert.desc}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="hidden lg:block h-6 w-px bg-borderSubtle" />
              <button
                onClick={(e) => { e.preventDefault(); onLogout(); }}
                className="hidden lg:block text-primary hover:text-primary/80 text-xs font-black uppercase tracking-widest transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* ── Main Content ── */}
        <main className="flex-1 overflow-y-auto pb-24 md:pb-10 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
          {children}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <MobileBottomNav onMenuOpen={() => setSidebarOpen(true)} />
    </div>
  );
};

// ─── App ─────────────────────────────────────────────────────────────────────
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
        logoUrl: null,
      };
    }
    return saved ? JSON.parse(saved) : {
      name: 'Admin User',
      designation: 'Workspace Manager',
      email: 'admin@dworkz.com',
      logoUrl: null,
    };
  });

  // Validate token on app startup — force login if token is expired/invalid
  useEffect(() => {
    const validateToken = async () => {
      const storedToken = localStorage.getItem('dworkz_token');
      if (!storedToken) return;
      try {
        // Use the shared `api` instance (not raw axios) so an expired access token
        // goes through the response interceptor and gets silently refreshed instead
        // of immediately forcing a logout on every page reload.
        await api.get('/api/v1/auth/me');
      } catch (err) {
        // Refresh (attempted by the api interceptor) also failed — force logout
        localStorage.removeItem('dworkz_token');
        localStorage.removeItem('dworkz_user');
        localStorage.removeItem('dworkz_profile');
        setToken('');
      }
    };
    validateToken();
  }, []);

  useEffect(() => {
    localStorage.setItem('dworkz_profile', JSON.stringify(profileData));
  }, [profileData]);

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('dworkz_theme', theme);
  }, [theme]);

  useEffect(() => {
    if (token) {
      const loggedInUser = localStorage.getItem('dworkz_user');
      if (loggedInUser) {
        const user = JSON.parse(loggedInUser);
        setProfileData({
          name: user.name,
          designation: user.role.charAt(0).toUpperCase() + user.role.slice(1),
          email: user.email,
          logoUrl: null,
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
      <ErrorToast />
      <Suspense fallback={<PageLoadingFallback />}>
      <Routes>
        <Route path="/proposal/:id" element={<ProposalView />} />

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
                <Route path="/passes" element={<Passes />} />
                <Route path="/visitors" element={<Visitors />} />
                <Route path="/bookings" element={<Bookings />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/billing" element={<Billing />} />
                <Route path="/archives" element={<Archives />} />
                <Route path="/logs" element={<Logs />} />
                <Route path="/settings" element={<SettingsView theme={theme} setTheme={setTheme} profileData={profileData} setProfileData={setProfileData} />} />
                <Route path="*" element={<div className="p-6"><h1 className="text-2xl font-bold text-white">Coming Soon</h1><p className="text-textMuted mt-2">This module is under development.</p></div>} />
              </Routes>
            </Layout>
          } />
        )}
      </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
