import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search, Plus, MoreVertical, Filter, Mail, CheckCircle, Clock, Users, Trash2, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Clients = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [alert, setAlert] = useState({ show: false, title: '', message: '', type: 'success' });
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    contactEmail: '',
    contactPhone: '',
    planType: 'Yearly',
    workspaceType: 'Virtual Office',
    workspaceDetails: 'Virtual Office Session',
    rentAmount: '',
    status: 'Active',
    billingDetails: {
      gstNumber: '',
      billingAddress: ''
    },
    pricingDetails: {
      meetingRoomRate: 500
    }
  });

  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [proposalData, setProposalData] = useState({
    proposedPlan: 'Monthly',
    proposedRent: '',
    workspaceType: 'Desk',
    workspaceDetails: '',
  });

  const [stats, setStats] = useState({ totalClients: 0, activeClients: 0, leads: 0, proposals: 0 });

  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('dworkz_token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      const res = await axios.get('http://localhost:5000/api/v1/clients', config);
      setClients(res.data.data);

      const statsRes = await axios.get('http://localhost:5000/api/v1/clients/stats', config);
      setStats(statsRes.data.data);
    } catch (err) {
      console.error('Failed to fetch clients', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Special handling for GST Number: Only numbers, max 12 digits
    if (name === 'billingDetails.gstNumber') {
      const alphanumericValue = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 15);
      setFormData(prev => ({
        ...prev,
        billingDetails: { ...prev.billingDetails, gstNumber: alphanumericValue }
      }));
      return;
    }

    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.billingDetails.gstNumber && formData.billingDetails.gstNumber.length !== 15) {
      alert('GST Number must be exactly 15 alphanumeric characters (e.g., 33AAZFD3031H1ZG)');
      return;
    }
    try {
      const token = localStorage.getItem('dworkz_token');
      await axios.post('http://localhost:5000/api/v1/clients', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsAddModalOpen(false);
      fetchClients();
      setFormData({
        name: '', companyName: '', contactEmail: '', contactPhone: '',
        planType: 'Yearly', workspaceType: 'Virtual Office', workspaceDetails: 'Virtual Office Session',
        rentAmount: '', status: 'Active',
        billingDetails: { gstNumber: '', billingAddress: '' },
        pricingDetails: { meetingRoomRate: 500 }
      });
    } catch (err) {
      alert('Error creating client: ' + (err.response?.data?.error || err.message));
    }
  };

  const filteredClients = clients.filter(c => {
    const isSearchMatch = (c.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
                          (c.companyName?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    // ONLY show active members / converted clients / awaiting activation / agreement pending (Exclude CRM Lead stages)
    const activeStatuses = ['Active', 'Converted', 'Inactive', 'Expired', 'Awaiting Activation', 'Agreement Pending'];
    const isMember = activeStatuses.includes(c.status);
    
    return isSearchMatch && isMember;
  });

  const confirmDelete = (client) => {
    setClientToDelete(client);
    setIsDeleteModalOpen(true);
  };

  const handleSoftDelete = async () => {
    if (!clientToDelete) return;
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('dworkz_token');
      // Call the DELETE endpoint (refactored to archive on backend)
      await axios.delete(`http://localhost:5000/api/v1/clients/${clientToDelete._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsDeleteModalOpen(false);
      fetchClients();
      showAlert('Client Archived', `${clientToDelete.companyName} has been moved to archives for analytical tracking.`, 'success');
    } catch (err) {
      showAlert('Error', 'Failed to archive client: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setIsDeleting(false);
      setClientToDelete(null);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      Active: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      Inactive: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
      Hold: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      Expired: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
      Archived: 'bg-slate-700/10 text-slate-400 border-slate-700/20',
      'Awaiting Activation': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      'Agreement Pending': 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
      Converted: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
    };
    return (
      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border whitespace-nowrap inline-block ${styles[status] || styles.Expired}`}>
        {status}
      </span>
    );
  };

  const showAlert = (title, message, type = 'success') => {
    setAlert({ show: true, title, message, type });
    if (type === 'success') {
      setTimeout(() => setAlert({ ...alert, show: false }), 5000);
    }
  };

  const handleOpenProposal = (client) => {
    setSelectedClient(client);
    setProposalData({
      proposedPlan: client.planType || 'Monthly',
      proposedRent: client.rentAmount || '',
      workspaceType: client.workspaceType || 'Desk',
      workspaceDetails: client.workspaceDetails || '',
    });
    setIsProposalModalOpen(true);
  };

  const handleSendProposal = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('dworkz_token');
      await axios.post('http://localhost:5000/api/v1/proposals', {
        client: selectedClient._id,
        ...proposalData
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsProposalModalOpen(false);
      fetchClients();
      alert('Professional Proposal sent successfully!');
    } catch (err) {
      alert('Error sending proposal: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleActivateClient = async (id, name) => {
    try {
      const token = localStorage.getItem('dworkz_token');
      await axios.post(`http://localhost:5000/api/v1/clients/${id}/activate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchClients();
      showAlert('Activation Successful', `${name} is now an Active Member. Revenue generation has started.`, 'success');
    } catch (err) {
      showAlert('Activation Error', err.response?.data?.error || err.message, 'error');
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      const token = localStorage.getItem('dworkz_token');
      await axios.patch(`http://localhost:5000/api/v1/clients/${id}`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchClients();
    } catch (err) {
      alert('Error updating status: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="p-8 w-full max-w-7xl mx-auto space-y-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-textMain uppercase tracking-tight">
            Client Management
          </h1>
          <p className="text-textMuted mt-2 font-medium">Manage your converted leads, active members, and workspace agreements.</p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-surface border border-borderSubtle rounded-2xl p-6 shadow-xl">
          <p className="text-[10px] font-bold text-textMuted uppercase tracking-widest mb-1">Total Members</p>
          <p className="text-3xl font-black text-textMain tracking-tighter">{stats.activeClients || 0}</p>
        </div>
        <div className="bg-surface border border-borderSubtle rounded-2xl p-6 shadow-xl">
          <p className="text-[10px] font-bold text-textMuted uppercase tracking-widest mb-1">Occupancy</p>
          <p className="text-3xl font-black text-primary tracking-tighter">{stats.occupancyRate || 0}%</p>
        </div>
        <div className="bg-surface border border-borderSubtle rounded-2xl p-6 shadow-xl">
          <p className="text-[10px] font-bold text-textMuted uppercase tracking-widest mb-1">Monthly Revenue</p>
          <p className="text-3xl font-black text-emerald-400 tracking-tighter">₹{(stats.totalRevenue || 0).toLocaleString()}</p>
        </div>
        <div className="bg-surface border border-borderSubtle rounded-2xl p-6 shadow-xl">
          <p className="text-[10px] font-bold text-textMuted uppercase tracking-widest mb-1">Pending Dues</p>
          <p className="text-3xl font-black text-rose-400 tracking-tighter">₹{(stats.pendingReceivable || 0).toLocaleString()}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex justify-between items-center gap-4">
        <div className="relative flex-1 max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted group-focus-within:text-primary transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search clients or companies..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-surface border border-borderSubtle text-sm rounded-2xl pl-12 pr-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all shadow-inner" 
          />
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-textMain px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/25 flex items-center gap-2"
        >
          <Plus size={16} /> Add Client
        </button>
      </div>

      {/* Clients Table */}
      <div className="bg-surface border border-borderSubtle rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-textMain">
            <thead className="bg-background/50 border-b border-borderSubtle text-textMuted">
              <tr>
                <th className="px-6 py-4 font-medium">Client / Company</th>
                <th className="px-6 py-4 font-medium">Membership</th>
                <th className="px-6 py-4 font-medium">Workspace</th>
                <th className="px-6 py-4 font-medium">Rent</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderSubtle">
            {isLoading ? (
              <tr><td colSpan="7" className="px-6 py-8 text-center text-textMuted">Loading clients...</td></tr>
            ) : filteredClients.length === 0 ? (
              <tr><td colSpan="7" className="px-6 py-8 text-center text-textMuted">No clients found.</td></tr>
            ) : (
              filteredClients.map(client => (
                  <tr 
                    key={client._id} 
                    onClick={() => navigate(`/clients/${client._id}`)}
                    className="hover:bg-white/[0.03] transition-all group cursor-pointer border-b border-borderSubtle/50 last:border-0"
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-sm font-black text-textMain border border-primary/20 group-hover:scale-110 transition-transform overflow-hidden">
                          {client.profilePhotoUrl ? (
                            <img src={client.profilePhotoUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            client.companyName ? client.companyName.charAt(0) : (client.name ? client.name.charAt(0) : '?')
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-textMain tracking-tight text-base">{client.companyName || 'Private Client'}</span>
                          <span className="text-xs text-textMuted mt-0.5">{client.name} • {client.contactEmail}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="bg-primary/5 text-primary border border-primary/10 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">
                        {client.planType || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        {client.workspaceType === 'Virtual Office' ? (
                          <span className="bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest w-max shadow-sm">
                            🌐 Virtual Office
                          </span>
                        ) : (
                          <span className="text-textMain font-medium text-sm">{client.workspaceType}</span>
                        )}
                        <span className="text-[10px] text-textMuted uppercase font-bold tracking-tighter mt-1">{client.workspaceDetails || 'Unassigned'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="font-bold text-textMain text-base">₹{client.rentAmount?.toLocaleString() || 0}</span>
                    </td>
                    <td className="px-6 py-5">
                      {client.status === 'Active' ? (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
                          <span className="text-emerald-400 text-xs font-black uppercase tracking-widest">Active</span>
                        </div>
                      ) : (
                        getStatusBadge(client.status)
                      )}
                    </td>
                                      <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/clients/${client._id}`);
                          }}
                          className="text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                        >
                          VIEW DETAIL
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmDelete(client);
                          }}
                          className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                          title="Archive Client"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
              ))
            )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Client Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-borderSubtle rounded-2xl p-6 w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-textMain">Add New Client</h2>
                  <p className="text-xs text-textMuted">Create a new lead or active member profile.</p>
                </div>
                <button onClick={() => setIsAddModalOpen(false)} className="text-textMuted hover:text-textMain p-2 hover:bg-white/5 rounded-full transition-colors">✕</button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs text-textMuted font-bold uppercase tracking-wider">Contact Person Name *</label>
                    <input name="name" value={formData.name} onChange={handleInputChange} required type="text" className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-2.5 text-sm focus:border-primary focus:outline-none transition-all" placeholder="John Doe" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-textMuted font-bold uppercase tracking-wider">Company Name *</label>
                    <input name="companyName" value={formData.companyName} onChange={handleInputChange} required type="text" className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-2.5 text-sm focus:border-primary focus:outline-none transition-all" placeholder="TechNova Solutions" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-textMuted font-bold uppercase tracking-wider">Email Address *</label>
                    <input name="contactEmail" value={formData.contactEmail} onChange={handleInputChange} required type="email" className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-2.5 text-sm focus:border-primary focus:outline-none transition-all" placeholder="john@company.com" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-textMuted font-bold uppercase tracking-wider">Phone Number *</label>
                    <input name="contactPhone" value={formData.contactPhone} onChange={handleInputChange} required type="text" className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-2.5 text-sm focus:border-primary focus:outline-none transition-all" placeholder="+91 98765 43210" />
                  </div>
                </div>

                <div className="p-4 bg-background/50 rounded-2xl border border-borderSubtle space-y-4">
                  <h3 className="text-xs font-bold text-primary uppercase tracking-widest">Membership & Workspace</h3>
                  
                  {/* Fixed Virtual Office Plan Details Card */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-surface/50 border border-borderSubtle p-4 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-textMuted uppercase tracking-widest block mb-0.5">Workspace Type</span>
                        <span className="text-sm font-black text-violet-400 uppercase tracking-wide">🌐 Virtual Office</span>
                      </div>
                      <span className="text-[9px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded">Locked Option</span>
                    </div>
                    
                    <div className="bg-surface/50 border border-borderSubtle p-4 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-textMuted uppercase tracking-widest block mb-0.5">Plan Type</span>
                        <span className="text-sm font-black text-primary uppercase tracking-wide">📆 Yearly Billing</span>
                      </div>
                      <span className="text-[9px] font-bold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded">Locked Option</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div className="space-y-1.5">
                      <label className="text-xs text-textMuted font-bold uppercase tracking-wider">Annual Rent Amount (₹) *</label>
                      <input 
                        name="rentAmount" 
                        value={formData.rentAmount} 
                        onChange={handleInputChange} 
                        required 
                        type="number" 
                        onWheel={(e) => e.target.blur()} 
                        className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-2.5 text-sm focus:border-primary focus:outline-none transition-all placeholder:text-textMuted/30" 
                        placeholder="e.g. 25000" 
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs text-textMuted font-bold uppercase tracking-wider">Meeting Room Overage Rate (₹/hr) *</label>
                      <input 
                        name="pricingDetails.meetingRoomRate" 
                        value={formData.pricingDetails?.meetingRoomRate ?? ''} 
                        onChange={handleInputChange} 
                        type="number" 
                        onWheel={(e) => e.target.blur()} 
                        className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-2.5 text-sm focus:border-primary focus:outline-none transition-all placeholder:text-textMuted/30" 
                        placeholder="e.g. 500" 
                      />
                      <p className="text-[9px] text-emerald-400 font-bold tracking-tight mt-1">
                        🎁 Includes 5 Free Hours per Month. Overages charged at this rate.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-background/50 rounded-2xl border border-borderSubtle space-y-4">
                  <h3 className="text-xs font-bold text-accent uppercase tracking-widest">Billing & Compliance</h3>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-textMuted font-medium">GST Number *</label>
                    <input name="billingDetails.gstNumber" value={formData.billingDetails.gstNumber} onChange={handleInputChange} required type="text" maxLength={15} className="w-full bg-background border border-borderSubtle rounded-lg px-3 py-2 text-sm focus:border-primary focus:outline-none" placeholder="Enter 15-character GSTIN" />
                  </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-textMuted font-medium">Billing Address</label>
                      <textarea name="billingDetails.billingAddress" value={formData.billingDetails.billingAddress} onChange={handleInputChange} className="w-full bg-background border border-borderSubtle rounded-lg px-3 py-2 text-sm focus:border-primary focus:outline-none min-h-[80px]" placeholder="Full company billing address..." />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-borderSubtle">
                  <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-6 py-2.5 text-sm font-medium text-textMuted hover:text-textMain transition-colors">Cancel</button>
                  <button type="submit" className="bg-primary hover:bg-primary/90 text-textMain px-8 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-primary/25">
                    Create Client Profile
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Proposal Modal */}
      <AnimatePresence>
        {isProposalModalOpen && selectedClient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="bg-surface border border-borderSubtle rounded-[2.5rem] p-0 w-full max-w-4xl shadow-2xl overflow-hidden flex h-[85vh] teal-glow"
            >
              {/* Left Side: Editor */}
              <div className="w-[400px] border-r border-borderSubtle p-8 flex flex-col bg-background/50">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-textMain tracking-tight">Create Proposal</h2>
                  <p className="text-xs text-textMuted mt-1">Customize the offer for {selectedClient.companyName}</p>
                </div>
                
                <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Workspace Detail</label>
                    <input 
                      value={proposalData.workspaceDetails} 
                      onChange={(e) => setProposalData({...proposalData, workspaceDetails: e.target.value})}
                      className="w-full bg-surface border border-borderSubtle rounded-xl px-4 py-3 text-sm text-textMain focus:border-primary focus:outline-none" 
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Plan</label>
                      <select 
                        value={proposalData.proposedPlan}
                        onChange={(e) => setProposalData({...proposalData, proposedPlan: e.target.value})}
                        className="w-full bg-surface border border-borderSubtle rounded-xl px-4 py-3 text-sm text-textMain focus:border-primary focus:outline-none"
                      >
                        <option>Monthly</option>
                        <option>Daily</option>
                        <option>Hourly</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Rent (₹)</label>
                      <input 
                        type="number"
                        onWheel={(e) => e.target.blur()}
                        value={proposalData.proposedRent}
                        onChange={(e) => setProposalData({...proposalData, proposedRent: e.target.value})}
                        className="w-full bg-surface border border-borderSubtle rounded-xl px-4 py-3 text-sm text-textMain focus:border-primary focus:outline-none" 
                      />
                    </div>
                  </div>


                  <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl space-y-3">
                    <p className="text-[10px] font-bold text-textMuted uppercase tracking-widest">Included Amenities</p>
                    <div className="grid grid-cols-2 gap-2">
                      {['High Speed WiFi', 'Free Coffee', 'AC Office', 'Print/Scan', 'Meeting Room', 'Reception'].map(a => (
                        <div key={a} className="flex items-center gap-2 text-[10px] text-textMain/70">
                          <CheckCircle size={10} className="text-primary" /> {a}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-borderSubtle flex gap-4">
                  <button onClick={() => setIsProposalModalOpen(false)} className="flex-1 py-3 text-sm font-bold text-textMuted hover:text-textMain transition-colors">Cancel</button>
                  <button 
                    onClick={handleSendProposal}
                    className="flex-[2] bg-primary hover:bg-primary/90 text-textMain py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/25"
                  >
                    Send Proposal
                  </button>
                </div>
              </div>

              {/* Right Side: Preview */}
              <div className="flex-1 bg-white p-12 overflow-y-auto custom-scrollbar text-gray-900 font-serif">
                <div className="flex justify-between items-start border-b-2 border-teal-600 pb-8 mb-10">
                  <div>
                    <h1 className="text-4xl font-black text-teal-800 tracking-tighter mb-1">DworkZ</h1>
                    <p className="text-sm text-teal-600 font-sans font-bold uppercase tracking-widest">Workspace Solutions</p>
                  </div>
                  <div className="text-right font-sans">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Proposal For</p>
                    <p className="text-xl font-black text-gray-800">{selectedClient.companyName}</p>
                    <p className="text-sm text-gray-500">{selectedClient.name}</p>
                  </div>
                </div>

                <div className="space-y-10">
                  <div>
                    <h3 className="text-xl font-black text-teal-700 mb-4 font-sans">1. Overview</h3>
                    <p className="text-gray-600 leading-relaxed italic">"We are excited to propose a premium workspace solution tailored for {selectedClient.companyName}. Our environment is designed to foster productivity and growth."</p>
                  </div>

                  <div>
                    <h3 className="text-xl font-black text-teal-700 mb-4 font-sans">2. Workspace Details</h3>
                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                      <div className="grid grid-cols-2 gap-8">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Type</p>
                          <p className="text-lg font-bold text-gray-800">{proposalData.workspaceType}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Details</p>
                          <p className="text-lg font-bold text-gray-800">{proposalData.workspaceDetails}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Plan</p>
                          <p className="text-lg font-bold text-gray-800">{proposalData.proposedPlan} Billing</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Investment</p>
                          <p className="text-2xl font-black text-teal-600">₹{proposalData.proposedRent.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-black text-teal-700 mb-4 font-sans">3. Terms & Validity</h3>
                    <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600 font-sans">
                      <li>One month security deposit required.</li>
                      <li>Standard 30-day notice period for termination.</li>
                      <li>Includes all utilities, high-speed fiber internet, and daily cleaning.</li>
                      <li>Includes all utilities, high-speed fiber internet, and daily cleaning.</li>
                    </ul>
                  </div>
                </div>

                <div className="mt-16 pt-8 border-t border-gray-100 flex flex-col items-center gap-2 italic text-gray-400 text-[10px]">
                  <p className="font-bold text-gray-500">This is system generated document & does not require signature.</p>
                  <div className="flex justify-between w-full mt-4">
                    <p>Electronically generated by DworkZ Workspace Management System</p>
                    <p>© 2026 DworkZ</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-surface border border-borderSubtle rounded-[2.5rem] p-10 w-full max-w-lg shadow-2xl space-y-8 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5 text-rose-500">
                <Trash2 size={120} />
              </div>
              
              <div className="text-center relative z-10">
                <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <AlertCircle size={40} />
                </div>
                <h2 className="text-3xl font-black text-textMain uppercase tracking-tight mb-3">Archive Client?</h2>
                <p className="text-textMuted font-medium leading-relaxed">
                  You are about to archive <span className="text-textMain font-bold">{clientToDelete?.companyName || clientToDelete?.name || 'this client'}</span>. 
                  This will remove them from active views but <span className="text-primary font-bold">preserve all data</span> for your historical analytics and reports.
                </p>
              </div>

              <div className="flex gap-4 pt-4 relative z-10">
                <button 
                  onClick={() => setIsDeleteModalOpen(false)} 
                  className="flex-1 px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-widest text-textMuted hover:text-textMain transition-all border border-transparent hover:border-borderSubtle"
                  disabled={isDeleting}
                >
                  Keep Active
                </button>
                <button 
                  onClick={handleSoftDelete}
                  disabled={isDeleting}
                  className="flex-1 bg-rose-500 hover:bg-rose-400 text-white px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-xl shadow-rose-500/25 flex items-center justify-center gap-2"
                >
                  {isDeleting ? 'Archiving...' : 'Confirm Archive'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Alert Portal */}
      <AnimatePresence>
        {alert.show && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className={`fixed top-8 left-1/2 z-[110] px-8 py-4 rounded-2xl shadow-2xl border flex items-center gap-4 ${
              alert.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
            }`}
          >
            {alert.type === 'error' ? <AlertCircle size={24} /> : <CheckCircle size={24} />}
            <div>
              <p className="font-black text-xs uppercase tracking-widest">{alert.title}</p>
              <p className="text-sm font-medium opacity-80">{alert.message}</p>
            </div>
            <button onClick={() => setAlert({ ...alert, show: false })} className="ml-4 opacity-50 hover:opacity-100">
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Clients;
