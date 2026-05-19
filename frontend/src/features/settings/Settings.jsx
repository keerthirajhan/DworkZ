import React from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, Monitor, Shield, Bell, User, Layout, Palette } from 'lucide-react';

const Settings = ({ theme, setTheme, profileData, setProfileData }) => {
  const [activeTab, setActiveTab] = React.useState('Appearance');
  const [tempTheme, setTempTheme] = React.useState(theme);
  const [alert, setAlert] = React.useState(null);
  const [notifications, setNotifications] = React.useState({
    newLead: true,
    agreements: true,
    payment: false,
    bookings: true
  });

  const toggleNotification = (key) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData(prev => ({ ...prev, logoUrl: reader.result }));
        setAlert({ title: 'Logo Uploaded', message: 'Your company logo has been updated successfully.', type: 'success' });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = () => {
    setAlert({ title: 'Profile Updated', message: 'Your administrative profile has been saved successfully.', type: 'success' });
  };
  const [passwords, setPasswords] = React.useState({ current: '', new: '' });
  const [updatingPass, setUpdatingPass] = React.useState(false);

  const handleUpdatePassword = async () => {
    if (!passwords.current || !passwords.new) {
      return setAlert({ title: 'Error', message: 'Please fill in both password fields.', type: 'error' });
    }
    if (passwords.new.length < 6) {
      return setAlert({ title: 'Error', message: 'New password must be at least 6 characters.', type: 'error' });
    }
    
    setUpdatingPass(true);
    try {
      const api = (await import('../../utils/api')).default;
      await api.put('/api/v1/auth/updatepassword', {
        currentPassword: passwords.current,
        newPassword: passwords.new
      });
      setPasswords({ current: '', new: '' });
      setAlert({ title: 'Password Updated', message: 'Your security credentials have been successfully updated.', type: 'success' });
    } catch (err) {
      setAlert({ title: 'Error', message: err.response?.data?.error || 'Failed to update password.', type: 'error' });
    } finally {
      setUpdatingPass(false);
    }
  };

  const themeOptions = [
    { 
      id: 'dark', 
      name: 'Dark Mode', 
      desc: 'The classic DworkZ experience. Sleek and high-contrast.', 
      icon: Moon,
      color: 'from-slate-800 to-slate-900'
    },
    { 
      id: 'light', 
      name: 'Light Mode', 
      desc: 'Clean, crisp, and professional for bright environments.', 
      icon: Sun,
      color: 'from-slate-50 to-slate-100'
    }
  ];

  return (
    <div className="p-8 w-full max-w-5xl mx-auto space-y-10">
      <div>
        <h1 className="text-3xl font-black text-textMain uppercase tracking-tight">
          Settings
        </h1>
        <p className="text-textMuted mt-2 font-medium">Configure your workspace preferences and appearance.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Nav */}
        <div className="lg:col-span-1 space-y-2">
          {[
            { name: 'Appearance', icon: Palette },
            { name: 'Profile', icon: User },
            { name: 'Notifications', icon: Bell },
            { name: 'Security', icon: Shield },
          ].map((item) => (
            <button 
              key={item.name}
              onClick={() => setActiveTab(item.name)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === item.name 
                  ? 'bg-primary/10 text-primary border border-primary/20' 
                  : 'text-textMuted hover:text-textMain hover:bg-surface'
              }`}
            >
              <item.icon size={18} />
              {item.name}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3 space-y-8">
          
          {/* Appearance Tab */}
          {activeTab === 'Appearance' && (
            <section className="bg-surface border border-borderSubtle rounded-3xl p-8 shadow-xl space-y-8">
              <div className="flex items-center gap-3 border-b border-borderSubtle pb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Palette size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-textMain uppercase tracking-tight">Appearance</h2>
                  <p className="text-xs text-textMuted font-medium">Choose your interface theme and visual style.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {themeOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setTempTheme(option.id)}
                    className={`relative flex flex-col p-6 rounded-2xl border-2 text-left transition-all group overflow-hidden ${
                      tempTheme === option.id 
                        ? 'border-primary bg-primary/5 shadow-lg shadow-primary/5' 
                        : 'border-borderSubtle bg-background/50 hover:border-textMuted hover:bg-background'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center shadow-inner ${
                      tempTheme === option.id ? 'bg-primary text-white' : 'bg-surface text-textMuted'
                    }`}>
                      <option.icon size={24} />
                    </div>
                    
                    <h3 className={`font-black text-base uppercase tracking-wider mb-1 ${
                      tempTheme === option.id ? 'text-primary' : 'text-textMain'
                    }`}>
                      {option.name}
                    </h3>
                    <p className="text-xs text-textMuted leading-relaxed">
                      {option.desc}
                    </p>

                    <div className="mt-6 h-24 rounded-xl border border-borderSubtle overflow-hidden bg-background p-3 flex flex-col gap-2">
                       <div className="h-3 w-1/2 rounded bg-surface"></div>
                       <div className="grid grid-cols-3 gap-2 flex-1">
                          <div className={`rounded border ${tempTheme === 'dark' ? 'bg-primary/20 border-primary/20' : 'bg-slate-200 border-slate-200'}`}></div>
                          <div className="rounded bg-surface"></div>
                          <div className="rounded bg-surface"></div>
                       </div>
                    </div>

                    {tempTheme === option.id && (
                      <motion.div 
                        layoutId="activeTheme"
                        className="absolute top-4 right-4 w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white shadow-lg"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                      >
                        <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                      </motion.div>
                    )}
                  </button>
                ))}
              </div>

              <div className="pt-6 border-t border-borderSubtle">
                <label className="flex items-center gap-4 cursor-pointer group">
                  <div className="relative w-12 h-6 bg-background rounded-full border border-borderSubtle group-hover:border-primary transition-all">
                    <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-primary transition-all ${
                      theme === 'light' ? 'translate-x-6' : 'translate-x-0'
                    }`}></div>
                  </div>
                  <span className="text-sm font-bold text-textMain">Sync with System Preferences</span>
                  <span className="ml-auto text-[10px] font-black text-accent uppercase tracking-widest bg-accent/10 px-2 py-1 rounded">Beta</span>
                </label>
              </div>
            </section>
          )}

          {/* Profile Tab */}
          {activeTab === 'Profile' && (
            <section className="bg-surface border border-borderSubtle rounded-3xl p-8 shadow-xl space-y-8">
              <div className="flex items-center gap-3 border-b border-borderSubtle pb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary overflow-hidden">
                  {profileData.logoUrl ? (
                    <img src={profileData.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <User size={20} />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-black text-textMain uppercase tracking-tight">Admin Profile</h2>
                  <p className="text-xs text-textMuted font-medium">Manage your personal information and branding.</p>
                </div>
              </div>

              <div className="flex items-center gap-8">
                <label className="relative group cursor-pointer">
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  <div className="w-32 h-32 rounded-3xl bg-background border-2 border-dashed border-primary/20 flex flex-col items-center justify-center text-primary hover:border-primary hover:bg-primary/5 transition-all overflow-hidden">
                    {profileData.logoUrl ? (
                      <img src={profileData.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <Palette size={32} className="mb-2" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Upload Logo</span>
                      </>
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Palette size={24} className="text-white" />
                    </div>
                  </div>
                </label>
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-textMuted uppercase tracking-widest">Full Name</label>
                      <input 
                        value={profileData.name} 
                        onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                        className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm text-textMain focus:border-primary focus:outline-none" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-textMuted uppercase tracking-widest">Designation</label>
                      <input 
                        value={profileData.designation} 
                        onChange={(e) => setProfileData({...profileData, designation: e.target.value})}
                        className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm text-textMain focus:border-primary focus:outline-none" 
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-textMuted uppercase tracking-widest">Email Address</label>
                    <input 
                      value={profileData.email} 
                      className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm text-textMain opacity-50 cursor-not-allowed" 
                      readOnly 
                    />
                  </div>
                </div>
              </div>
              <div className="pt-4 flex justify-end">
                 <button onClick={handleUpdateProfile} className="px-8 py-3 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/25 hover:scale-105 active:scale-95 transition-all">Update Profile</button>
              </div>
            </section>
          )}

          {/* Notifications Tab */}
          {activeTab === 'Notifications' && (
            <section className="bg-surface border border-borderSubtle rounded-3xl p-8 shadow-xl space-y-8">
              <div className="flex items-center gap-3 border-b border-borderSubtle pb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Bell size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-textMain uppercase tracking-tight">Notifications</h2>
                  <p className="text-xs text-textMuted font-medium">Control how and when you want to be alerted.</p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { id: 'newLead', title: 'New Lead Inquiries', desc: 'Notify me when a new lead is captured via website or walk-in.' },
                  { id: 'agreements', title: 'Agreement Completions', desc: 'Alert me when a client signs their membership agreement.' },
                  { id: 'payment', title: 'Payment Overdue', desc: 'Daily alerts for any pending or overdue client invoices.' },
                  { id: 'bookings', title: 'Booking Requests', desc: 'Notifications for meeting room bookings and modifications.' },
                ].map((notif) => (
                  <div key={notif.id} className="flex items-center justify-between p-4 bg-background/50 border border-borderSubtle rounded-2xl">
                    <div>
                      <p className="text-sm font-bold text-textMain">{notif.title}</p>
                      <p className="text-xs text-textMuted">{notif.desc}</p>
                    </div>
                    <div 
                      onClick={() => toggleNotification(notif.id)}
                      className={`w-12 h-6 rounded-full relative transition-all duration-300 cursor-pointer ${notifications[notif.id] ? 'bg-primary shadow-[0_0_10px_rgba(20,184,166,0.3)]' : 'bg-slate-300 dark:bg-slate-700'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 shadow-sm ${notifications[notif.id] ? 'left-7' : 'left-1'}`}></div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Security Tab */}
          {activeTab === 'Security' && (
            <section className="bg-surface border border-borderSubtle rounded-3xl p-8 shadow-xl space-y-8">
              <div className="flex items-center gap-3 border-b border-borderSubtle pb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Shield size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-textMain uppercase tracking-tight">Security</h2>
                  <p className="text-xs text-textMuted font-medium">Protect your workspace with advanced security protocols.</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="p-6 bg-background/50 border border-borderSubtle rounded-2xl space-y-4">
                  <h3 className="text-sm font-bold text-textMain uppercase tracking-widest">Change Password</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input 
                      type="password" 
                      placeholder="Current Password" 
                      value={passwords.current}
                      onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                      className="w-full bg-surface border border-borderSubtle rounded-xl px-4 py-3 text-sm text-textMain focus:border-primary focus:outline-none" 
                    />
                    <input 
                      type="password" 
                      placeholder="New Password" 
                      value={passwords.new}
                      onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                      className="w-full bg-surface border border-borderSubtle rounded-xl px-4 py-3 text-sm text-textMain focus:border-primary focus:outline-none" 
                    />
                  </div>
                  <button 
                    onClick={handleUpdatePassword}
                    disabled={updatingPass}
                    className="text-xs font-black text-primary uppercase tracking-widest hover:underline disabled:opacity-50"
                  >
                    {updatingPass ? 'Updating...' : 'Update Password'}
                  </button>
                </div>

                <div className="flex items-center justify-between p-6 bg-primary/5 border border-primary/10 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                       <Monitor size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-textMain">Two-Factor Authentication</p>
                      <p className="text-xs text-textMuted">Add an extra layer of security to your admin account.</p>
                    </div>
                  </div>
                  <button className="px-6 py-2 border border-primary/20 text-primary rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all">Enable</button>
                </div>
              </div>
            </section>
          )}

        </div>
      </div>
      {/* Floating Action Footer */}
      {tempTheme !== theme && (
        <motion.div 
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-surface/80 backdrop-blur-xl border border-primary/20 px-8 py-5 rounded-[2.5rem] shadow-2xl z-50 flex items-center gap-10 min-w-[500px]"
        >
          <div>
            <p className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-1">Unsaved Changes</p>
            <p className="text-sm font-bold text-textMain">Apply the new theme settings?</p>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <button 
              onClick={() => setTempTheme(theme)}
              className="px-6 py-2.5 text-xs font-black uppercase tracking-widest text-textMuted hover:text-textMain transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={() => setTheme(tempTheme)}
              className="px-10 py-3 bg-primary text-white rounded-full text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/25 hover:scale-105 active:scale-95 transition-all"
            >
              Apply Changes
            </button>
          </div>
        </motion.div>
      )}
      {/* Alert Portal */}
      {alert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-surface border border-borderSubtle p-8 rounded-[2rem] shadow-2xl max-w-sm w-full text-center space-y-4">
             <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                <Shield size={32} />
             </div>
             <h3 className="text-xl font-bold text-textMain uppercase tracking-tight">{alert.title}</h3>
             <p className="text-sm text-textMuted leading-relaxed">{alert.message}</p>
             <button onClick={() => setAlert(null)} className="w-full py-4 bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/25">Okay</button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Settings;
