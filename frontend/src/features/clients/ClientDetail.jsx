import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { API_URL } from '../../utils/api';
import { 
  ArrowLeft, Edit3, Mail, Phone, MapPin, Calendar, CreditCard, 
  FileText, PenTool, CheckCircle, XCircle, AlertCircle, Download, FileSignature, Briefcase, Plus, Send, Users, Printer, Camera, Trash2, Pause, Eye, Check, RefreshCw, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from "jspdf";
import DigitalSignaturePad from '../../components/DigitalSignaturePad';
import "jspdf-autotable";

const ClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSigningModalOpen, setIsSigningModalOpen] = useState(false);
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const agreementFileInputRef = React.useRef(null);
  const [activeAgreementId, setActiveAgreementId] = useState(null);
  const [signatureName, setSignatureName] = useState('');
  const [isSigned, setIsSigned] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [tempDate, setTempDate] = useState('');
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [isRenewing, setIsRenewing] = useState(false);
  const [isEditingRent, setIsEditingRent] = useState(false);
  const [tempRent, setTempRent] = useState('');
  const [proposalFormData, setProposalFormData] = useState({
    proposedPlan: 'Monthly',
    proposedRent: ''
  });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAgreementModalOpen, setIsAgreementModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [holidayFile, setHolidayFile] = useState(null);
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '', type: 'success' });
  const [isDeleteAgrModalOpen, setIsDeleteAgrModalOpen] = useState(false);
  const [agrToDelete, setAgrToDelete] = useState(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeForm, setUpgradeForm] = useState({ newRentAmount: '', planType: 'Monthly', workspaceDetails: '', generateInvoice: false, invoiceAmount: '' });
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isPortalModalOpen, setIsPortalModalOpen] = useState(false);
  const [portalPassword, setPortalPassword] = useState('');
  const [isSettingPortal, setIsSettingPortal] = useState(false);
  const [isMarkingProposalSent, setIsMarkingProposalSent] = useState(false);
  const [markingAgreementSentId, setMarkingAgreementSentId] = useState(null);

  const showAlert = (title, message, type = 'success') => {
    setAlertConfig({ isOpen: true, title, message, type });
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const clientRes = await api.get(`/api/v1/clients/${id}`);
      setClient(clientRes.data.data);
      setEditFormData(clientRes.data.data);
      
      const proposalsRes = await api.get(`/api/v1/clients/${id}/proposals`);
      setProposals(proposalsRes.data.data);
      
      const agreementsRes = await api.get(`/api/v1/clients/${id}/agreements`);
      setAgreements(agreementsRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleGenerateProposal = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/api/v1/clients/${id}/proposals`, proposalFormData);
      setIsProposalModalOpen(false);
      fetchData();
      showAlert('Success', 'Proposal Generated & Sent via Email successfully!');
    } catch (err) {
      showAlert('Error', 'Error generating proposal', 'error');
    }
  };

  const handleAcceptProposal = async (propId) => {
    try {
      await api.put(`/api/v1/clients/${id}/proposals/${propId}/status`, {
        status: 'Accepted'
      });
      fetchData();
    } catch (err) {
      showAlert('Error', 'Error accepting proposal', 'error');
    }
  };

  const handleUploadAgreement = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = ''; // reset so same file can be re-selected

    const isActiveClient = client.status === 'Active';

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target.result;
      try {
        const res = await api.post(`/api/v1/clients/${id}/agreements`, {
          draftPDFUrl: base64
        });
        
        if (res.data.success) {
          // Fix: Backend resets Active clients to 'Agreement Pending' — restore immediately
          // Also save the URL directly on the Client model for permanent access
          if (isActiveClient) {
            await api.put(`/api/v1/clients/${id}`, { 
              status: 'Active',
              agreementPDFUrl: base64
            });
            setClient(prev => ({ ...prev, status: 'Active', agreementPDFUrl: base64 }));
          }

          await fetchData();

          showAlert('Success', 'Agreement uploaded successfully!', 'success');
        }
      } catch (err) {
        showAlert('Error', 'Error uploading agreement: ' + err.message, 'error');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateAgreement = () => {
    agreementFileInputRef.current.click();
  };

  const handleStartSigning = (agrId) => {
    setActiveAgreementId(agrId);
    setIsSigningModalOpen(true);
  };

  // New: Digital Signature Pad success handler
  const handleDigitalSignSuccess = async () => {
    setIsSigningModalOpen(false);
    setActiveAgreementId(null);
    await fetchData();
    showAlert('Agreement Signed!', 'The agreement has been digitally signed and archived with a unique audit trail. Client status updated to Awaiting Activation.', 'success');
  };

  const handleConfirmSignature = async () => {
    if (!isSigned || !signatureName) return showAlert('Information Needed', 'Please sign and provide your name.', 'error');
    try {
      const token = localStorage.getItem('dworkz_token');
      
      // Generate Agreement PDF
      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.setTextColor(20, 184, 166);
      doc.text("MASTER SERVICE AGREEMENT", 105, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Ref: MSA-${client._id.slice(-6).toUpperCase()}`, 105, 28, { align: 'center' });
      
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text("Between:", 20, 45);
      doc.setFontSize(12);
      doc.text("DworkZ Workspace Solutions (Provider)", 20, 55);
      doc.text("And", 20, 65);
      doc.text(`${client.companyName} (Client)`, 20, 75);
      
      doc.setFontSize(14);
      doc.text("1. Scope of Services", 20, 95);
      doc.setFontSize(10);
      doc.text(`The Provider agrees to provide ${client.workspaceType} facilities at ${client.workspaceDetails} for the use of the Client.`, 20, 105);
      
      doc.setFontSize(14);
      doc.text("2. Commercial Terms", 20, 125);
      doc.setFontSize(10);
      doc.text(`- Monthly Rent: INR ${client.rentAmount}`, 20, 135);
      doc.text(`- Plan Type: ${client.planType}`, 20, 142);
      doc.text(`- Start Date: ${new Date().toLocaleDateString()}`, 20, 149);
      
      doc.setFontSize(14);
      doc.text("3. Termination", 20, 170);
      doc.setFontSize(10);
      doc.text("Standard 30-day notice period applies for either party to terminate this agreement.", 20, 180);
      
      doc.setDrawColor(20, 184, 166);
      doc.line(20, 210, 190, 210);
      
      doc.setFontSize(14);
      doc.text("Signatures", 20, 225);
      doc.setFontSize(12);
      doc.setFont("courier", "italic");
      doc.text(signatureName, 20, 240);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(`Digitally signed via DworkZ Portal • IP: MOCK-IP • Time: ${new Date().toLocaleString()}`, 20, 245);
      
      const pdfBase64 = doc.output('datauristring');

      await api.post(`/api/v1/clients/${id}/agreements/${activeAgreementId}/sign`, {
        signatureName,
        agreementPDFUrl: pdfBase64
      });

      setIsSigningModalOpen(false);
      await fetchData();
      showAlert('Success', 'Agreement signed! Awaiting final administrative activation.', 'success');
    } catch (err) {
      showAlert('Error', 'Failed to sign agreement: ' + err.message, 'error');
    }
  };

  const handleMarkProposalSent = async () => {
    try {
      setIsMarkingProposalSent(true);
      await api.post(`/api/v1/clients/${id}/proposal/mark-sent`, {});
      await fetchData();
      showAlert('Success', 'Proposal marked as manually sent successfully!', 'success');
    } catch (err) {
      showAlert('Error', 'Failed to mark proposal as sent: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setIsMarkingProposalSent(false);
    }
  };

  const handleMarkAgreementSent = async (agrId) => {
    try {
      setMarkingAgreementSentId(agrId);
      await api.post(`/api/v1/clients/${id}/agreements/${agrId}/mark-sent`, {});
      // Optimistic update for immediate UI feedback
      setAgreements(prev => prev.map(a => a._id === agrId ? { ...a, isSentToClient: true } : a));
      setClient(prev => ({ ...prev, status: 'Awaiting Activation' }));
      await fetchData();
      showAlert('Success', 'Agreement marked as manually sent. Client moved to Awaiting Activation.', 'success');
    } catch (err) {
      showAlert('Error', 'Failed to mark agreement as sent: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setMarkingAgreementSentId(null);
    }
  };

  const handleSendAgreementEmail = async (agrId) => {
    try {
      await api.post(`/api/v1/clients/${id}/agreements/${agrId}/send`, {});
      // Optimistic Update: Force the UI to show the activation button immediately
      setAgreements(prev => prev.map(a => a._id === agrId ? { ...a, isSentToClient: true } : a));
      setClient(prev => ({ ...prev, status: 'Awaiting Activation' }));
      
      showAlert('Success', `Agreement sent to ${client.contactEmail} successfully!`, 'success');
      fetchData();
    } catch (err) {
      showAlert('Error', 'Failed to send agreement email', 'error');
    }
  };

  const [isActivating, setIsActivating] = useState(false);

  const handleActivateMembership = async () => {
    try {
      setIsActivating(true);
      const token = localStorage.getItem('dworkz_token');
      
      // 1. HARD OPTIMISTIC UPDATE
      const updatedClient = { ...client, status: 'Active' };
      setClient(updatedClient);
      
      // 2. FIND BEST AGREEMENT URL TO PERMANENTLY STORE ON CLIENT
      const signedAgr = agreements.find(a => a.status === 'Signed') || agreements[0];
      const agreementUrl = signedAgr?.agreementPDFUrl || signedAgr?.draftPDFUrl || null;
      
      // 3. BACKEND PERSISTENCE — also save URL directly on Client for permanent access
      await api.put(`/api/v1/clients/${id}`, { 
        status: 'Active',
        onboardingDate: client.onboardingDate || new Date(),
        ...(agreementUrl ? { agreementPDFUrl: agreementUrl } : {})
      });

      // Update local client state with URL too
      if (agreementUrl) setClient(prev => ({ ...prev, status: 'Active', agreementPDFUrl: agreementUrl }));

      // 4. SUCCESS FEEDBACK & HARD RELOAD
      showAlert('Membership Activated', 'The client is now officially ACTIVE. Reloading...', 'success');
      setShowConfetti(true);
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      console.error('Activation Error:', err);
      showAlert('Error', 'Activation failed. Please check your connection.', 'error');
    } finally {
      setIsActivating(false);
    }
  };

  const handleCancelPlan = async () => {
    if (!cancellationReason.trim()) return showAlert('Required', 'Please provide a reason for cancellation.', 'error');
    try {
      setIsCancelling(true);
      await api.post(`/api/v1/clients/${id}/cancel`, { reason: cancellationReason });
      setClient(prev => ({ ...prev, status: 'Inactive', cancellationReason, cancelledAt: new Date() }));
      setIsCancelModalOpen(false);
      setCancellationReason('');
      showAlert('Plan Cancelled', `${client.companyName} membership has been cancelled. They are now marked as Inactive.`, 'success');
    } catch (err) {
      showAlert('Error', 'Failed to cancel plan: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleUpgradePlan = async (e) => {
    e.preventDefault();
    if (!upgradeForm.newRentAmount) return showAlert('Required', 'Please enter the new rent amount.', 'error');
    try {
      setIsUpgrading(true);
      const token = localStorage.getItem('dworkz_token');
      const payload = {
        newRentAmount: Number(upgradeForm.newRentAmount),
        planType: upgradeForm.planType,
        workspaceDetails: upgradeForm.workspaceDetails || client.workspaceDetails,
        generateInvoice: upgradeForm.generateInvoice,
        invoiceAmount: upgradeForm.generateInvoice ? Number(upgradeForm.invoiceAmount || upgradeForm.newRentAmount) : 0
      };
      const res = await api.post(`/api/v1/clients/${id}/upgrade`, payload);
      setClient(res.data.data);
      setIsUpgradeModalOpen(false);
      setUpgradeForm({ newRentAmount: '', planType: 'Monthly', workspaceDetails: '', generateInvoice: false, invoiceAmount: '' });
      showAlert('Plan Updated', `${client.companyName} plan successfully updated to ₹${payload.newRentAmount}/mo.${payload.generateInvoice ? ' A prorated invoice has been generated.' : ''}`, 'success');
    } catch (err) {
      showAlert('Error', 'Failed to update plan: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleSetPortalCredentials = async (e) => {
    e.preventDefault();
    if (portalPassword.length < 6) return showAlert('Error', 'Password must be at least 6 characters.', 'error');
    try {
      setIsSettingPortal(true);
      const res = await api.post(`/api/v1/client-portal/admin/setup/${id}`, { password: portalPassword });
      setPortalPassword('');
      setIsPortalModalOpen(false);
      setClient(prev => ({ ...prev, portalEnabled: true }));
      showAlert('Portal Access Enabled', res.data.message);
    } catch (err) {
      showAlert('Error', err.response?.data?.error || 'Failed to set credentials.', 'error');
    } finally {
      setIsSettingPortal(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (editFormData.contactPhone && editFormData.contactPhone.length !== 10) {
      return showAlert('Validation Error', 'Phone Number must be exactly 10 digits.', 'error');
    }
    if (editFormData.alternatePhone && editFormData.alternatePhone.length !== 10) {
      return showAlert('Validation Error', 'Alternate Phone Number must be exactly 10 digits.', 'error');
    }
    if (editFormData.billingDetails?.gstNumber && editFormData.billingDetails.gstNumber.length !== 15) {
      return showAlert('Validation Error', 'GST Number must be exactly 15 alphanumeric characters', 'error');
    }
    try {
      await api.put(`/api/v1/clients/${id}`, editFormData);
      setIsEditModalOpen(false);
      fetchData();
      showAlert('Success', 'Client Profile Updated successfully!');
    } catch (err) {
      showAlert('Error', 'Error updating profile', 'error');
    }
  };

  const handleHolidayUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Simulate upload - for real app, use FormData and a backend endpoint
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target.result;
      try {
        await api.put(`/api/v1/clients/${id}`, {
          holidayPDFUrl: base64
        });
        fetchData();
        showAlert('Success', 'Holiday List PDF uploaded successfully!');
      } catch (err) {
        showAlert('Error', 'Error uploading holiday list', 'error');
      }
    };
    reader.readAsDataURL(file);
  };

  const viewPDF = (base64OrUrl) => {
    if (!base64OrUrl) return showAlert('Error', 'No document found to preview.', 'error');
    try {
      // If it's a plain URL (http/https), open directly
      if (base64OrUrl.startsWith('http')) {
        window.open(base64OrUrl, '_blank');
        return;
      }
      // Otherwise treat as base64
      const base64WithoutPrefix = base64OrUrl.includes(',') ? base64OrUrl.split(',')[1] : base64OrUrl;
      const byteCharacters = atob(base64WithoutPrefix);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      showAlert('Error', 'Failed to open PDF viewer', 'error');
    }
  };

  const downloadPDF = (base64, filename) => {
    const link = document.createElement('a');
    link.href = base64;
    link.download = filename;
    link.click();
  };



  const handleDeleteAgreement = (agrId) => {
    setAgrToDelete(agrId);
    setIsDeleteAgrModalOpen(true);
  };

  const confirmDeleteAgreement = async () => {
    try {
      const token = localStorage.getItem('dworkz_token');
      // Optimistic Update: Remove from UI immediately
      setAgreements(prev => prev.filter(a => a._id !== agrToDelete));
      setClient(prev => ({ ...prev, agreementPDFUrl: '' })); // Clear the permanent backup
      
      await api.delete(`/api/v1/clients/${id}/agreements/${agrToDelete}`);

      // Also update the client model on backend to clear the backup URL
      await api.put(`/api/v1/clients/${id}`, { 
        agreementPDFUrl: '' 
      });

      setIsDeleteAgrModalOpen(false);
      fetchData();
      showAlert('Deleted', 'Agreement removed. Please upload a new one.', 'success');
    } catch (err) {
      showAlert('Error', 'Error removing agreement', 'error');
      fetchData(); // Rollback on error
    }
  };

  const handleDeleteHoliday = async () => {
    try {
      await api.put(`/api/v1/clients/${id}`, {
        holidayPDFUrl: ''
      });
      fetchData();
      showAlert('Success', 'Holiday list removed successfully!');
    } catch (err) {
      showAlert('Error', 'Error removing holiday list', 'error');
    }
  };



  const handleSaveRent = async () => {
    try {
      await api.put(`/api/v1/clients/${id}`, {
        rentAmount: Number(tempRent)
      });
      setClient(prev => ({ ...prev, rentAmount: Number(tempRent) }));
      setIsEditingRent(false);
      showAlert('Success', 'Agreed Rent updated successfully!');
    } catch (err) {
      showAlert('Error', 'Failed to update rent', 'error');
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target.result;
      
      // Optimistic update for instant display
      setClient(prev => ({ ...prev, profilePhotoUrl: base64 }));
      
      try {
        await api.put(`/api/v1/clients/${id}`, {
          profilePhotoUrl: base64
        });
        fetchData();
        showAlert('Success', 'Profile photo updated successfully!');
      } catch (err) {
        fetchData();
        showAlert('Error', 'Error updating profile photo', 'error');
      }
    };
    reader.readAsDataURL(file);
  };

  const LifecycleTimeline = ({ status }) => {
    const steps = ['Review Profile', 'Signing', 'Activation', 'Active'];
    let currentIndex = 0;
    
    if (status === 'Agreement Pending' || status === 'Awaiting Signature') currentIndex = 1;
    if (status === 'Awaiting Activation') currentIndex = 2;
    if (status === 'Active') currentIndex = 3;
    if (status === 'Inactive' || status === 'Expired' || status === 'Archived') currentIndex = 3;
    
    return (
      <div className="flex items-center w-full my-12 max-w-3xl mx-auto px-4 overflow-visible">
        {steps.map((step, i) => (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center relative z-10 shrink-0">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 border-solid font-black transition-all duration-500 ${
                i <= currentIndex 
                  ? 'bg-primary border-primary text-white shadow-lg shadow-primary/30' 
                  : 'bg-background border-primary/20 text-textMuted'
              }`}>
                {(i < currentIndex || (i === 3 && status === 'Active')) ? (
                  <div className="flex items-center justify-center w-full h-full">
                    <Check size={24} strokeWidth={4} />
                  </div>
                ) : i + 1}
              </div>
              <span className={`absolute top-12 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap transition-colors duration-500 ${
                i <= currentIndex ? 'text-primary' : 'text-textMuted'
              }`}>
                {step}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="flex-1 h-1.5 mx-2 rounded-full bg-borderSubtle relative overflow-hidden">
                <div 
                  className="absolute top-0 left-0 h-full bg-primary transition-all duration-1000 ease-out"
                  style={{ width: i < currentIndex ? '100%' : '0%' }}
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  if (loading) return <div className="p-8 text-textMuted flex items-center justify-center min-h-[500px]">Loading client architecture...</div>;
  if (!client) return <div className="p-8 text-rose-400 flex items-center justify-center min-h-[500px]">Client profile not found.</div>;

  return (
    <div className="p-8 w-full max-w-7xl mx-auto space-y-10 pb-20">
      <button onClick={() => navigate('/clients')} className="flex items-center gap-2 text-textMuted hover:text-textMain transition-colors text-sm font-bold uppercase tracking-widest">
        <ArrowLeft size={16} /> Back to Client List
      </button>

      <div className="bg-surface border border-borderSubtle p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden teal-glow">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="flex justify-between items-start relative z-10">
          <div className="flex items-center gap-8">
            <label className="relative group cursor-pointer flex flex-col items-center gap-3">
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/20 flex items-center justify-center text-4xl font-black text-textMain shadow-[0_0_30px_rgba(20,184,166,0.3)] overflow-hidden relative">
                {client.profilePhotoUrl ? (
                  <img key={client.profilePhotoUrl} src={client.profilePhotoUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  client.companyName ? client.companyName.charAt(0) : client.name.charAt(0)
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={24} className="text-textMain" />
                </div>
              </div>
              <span className="text-[8px] font-black text-primary uppercase tracking-[0.15em] opacity-40 group-hover:opacity-100 transition-all flex items-center gap-1.5 whitespace-nowrap">
                <Plus size={10} /> Click to Upload Profile Photo
              </span>
            </label>
            <div>
              <h1 className="text-5xl font-black text-gradient-teal tracking-tighter">{client.companyName || 'N/A'}</h1>
              <p className="text-textMuted flex items-center gap-2 mt-2 text-xl font-medium italic">{client.name} (Contact Person)</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="bg-background border border-borderSubtle text-textMain hover:border-primary hover:text-primary px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 text-sm shadow-xl hover:shadow-primary/10"
            >
              <Edit3 size={18} /> Edit Profile
            </button>
          </div>
        </div>
        <LifecycleTimeline status={client.status} />
      </div>

      {/* Grid Layout for Cards */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Profile & Membership */}
        <div className="xl:col-span-1 space-y-8">
          
          {/* Member Profile Card */}
          <div className="bg-surface border border-borderSubtle rounded-2xl shadow-xl overflow-hidden">
            <div className="p-5 border-b border-borderSubtle bg-background/50 flex items-center gap-2">
              <Users size={18} className="text-primary" />
              <h2 className="text-base font-bold text-textMain">Client Information</h2>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex items-start gap-3">
                <Briefcase size={16} className="text-textMuted mt-0.5" />
                <div>
                  <p className="text-xs text-textMuted font-medium mb-0.5">Company Name</p>
                  <p className="text-sm text-textMain font-medium uppercase tracking-tight">{client.companyName || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users size={16} className="text-textMuted mt-0.5" />
                <div>
                  <p className="text-xs text-textMuted font-medium mb-0.5">Contact Person</p>
                  <p className="text-sm text-textMain font-medium">{client.name}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail size={16} className="text-textMuted mt-0.5" />
                <div>
                  <p className="text-xs text-textMuted font-medium mb-0.5">Email Address</p>
                  <p className="text-sm text-textMain font-medium">{client.contactEmail}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone size={16} className="text-textMuted mt-0.5" />
                <div>
                  <p className="text-xs text-textMuted font-medium mb-0.5">Phone Numbers</p>
                  <p className="text-sm text-textMain font-medium">
                    {client.contactPhone}
                    {client.alternatePhone && (
                      <span className="text-textMuted ml-2 border-l border-borderSubtle pl-2">
                        {client.alternatePhone} (Alt)
                      </span>
                    )}
                  </p>
                </div>
              </div>
              
              <div className="pt-4 border-t border-borderSubtle">
                <h3 className="text-xs font-bold text-textMuted uppercase tracking-wider mb-4 flex items-center gap-2">
                  <CreditCard size={14} /> Billing Details
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-textMuted font-medium mb-0.5">GST Number</p>
                    <p className="text-sm text-textMain">{client.billingDetails?.gstNumber || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-textMuted font-medium mb-0.5">Billing Address</p>
                    <p className="text-sm text-textMain">{client.billingDetails?.billingAddress || 'Not provided'}</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-borderSubtle">
                <h3 className="text-xs font-bold text-textMuted uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Calendar size={14} /> Holidays List
                </h3>
                {client.holidayPDFUrl ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-xl">
                      <button 
                        onClick={() => viewPDF(client.holidayPDFUrl)} 
                        className="flex items-center gap-3 text-emerald-400 group"
                      >
                        <FileText size={18} className="group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest">View Holiday List</span>
                      </button>
                      <div className="flex items-center gap-1">
                        <button onClick={handleDeleteHoliday} className="p-2 hover:bg-rose-500/10 rounded-lg text-rose-400 transition-all" title="Remove Holiday List">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <label className="block w-full cursor-pointer bg-background border border-borderSubtle border-dashed hover:border-primary py-2.5 rounded-xl text-center transition-all">
                      <input type="file" accept=".pdf" onChange={handleHolidayUpload} className="hidden" />
                      <span className="text-[9px] font-bold text-textMuted uppercase tracking-widest group-hover:text-primary transition-colors">Re-upload PDF</span>
                    </label>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-xs text-textMuted italic">No custom holiday list uploaded.</p>
                    <label className="block w-full cursor-pointer bg-background border border-borderSubtle border-dashed hover:border-primary py-3 rounded-xl text-center transition-all">
                      <input type="file" accept=".pdf" onChange={handleHolidayUpload} className="hidden" />
                      <span className="text-[10px] font-black text-primary uppercase tracking-widest">+ Upload PDF</span>
                    </label>
                  </div>
                )}
              </div>

              {/* AUDIT TRAIL HINT */}
              {client.lastActionBy && (
                <div className="pt-4 border-t border-borderSubtle">
                  <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/10 rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-black text-primary flex-shrink-0">
                      {client.lastActionBy.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-textMuted uppercase tracking-widest">Last Updated By</p>
                      <p className="text-xs font-black text-primary">{client.lastActionBy}</p>
                      <p className="text-[10px] text-textMuted">{new Date(client.lastActionAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Membership Plan Card */}
          <div className="bg-surface border border-borderSubtle rounded-2xl shadow-xl overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <div className="p-6">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <p className="text-xs text-textMuted font-medium mb-1">Current Plan Type</p>
                  <p className="text-2xl font-bold text-textMain">{client.planType || 'None selected'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-textMuted font-medium mb-1 flex items-center justify-end gap-1">
                    Agreed Rent
                    {!isEditingRent && (
                      <button 
                        onClick={() => {
                          setTempRent(client.rentAmount || '');
                          setIsEditingRent(true);
                        }}
                        className="text-primary hover:text-secondary transition-colors"
                      >
                        <Edit3 size={10} />
                      </button>
                    )}
                  </p>
                  {isEditingRent ? (
                    <div className="flex items-center justify-end gap-2">
                      <input 
                        type="number"
                        onWheel={(e) => e.target.blur()}
                        value={tempRent}
                        onChange={(e) => setTempRent(e.target.value)}
                        className="w-24 bg-background border border-primary/30 rounded-lg px-2 py-1 text-xs font-bold text-textMain focus:outline-none focus:border-primary"
                        placeholder="Amount"
                        autoFocus
                      />
                      <button onClick={handleSaveRent} className="text-emerald-500 hover:text-emerald-400 p-1"><CheckCircle size={14} /></button>
                      <button onClick={() => setIsEditingRent(false)} className="text-rose-500 hover:text-rose-400 p-1"><XCircle size={14} /></button>
                    </div>
                  ) : (
                    <p className="text-xl font-bold text-secondary flex items-center justify-end gap-0.5">
                      ₹{client.rentAmount ? client.rentAmount.toLocaleString() : '0'}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4 mb-6 bg-background/40 p-4 rounded-2xl border border-borderSubtle/50">
                <div className="flex justify-between items-center pb-3 border-b border-borderSubtle/30 group/date">
                  <span className="text-[10px] font-black text-textMuted uppercase tracking-widest">Onboarding Date</span>
                  <div className="flex items-center gap-2">
                    {isEditingDate ? (
                      <div className="flex items-center gap-2">
                        <input 
                          type="date" 
                          value={tempDate ? tempDate.split('T')[0] : ''} 
                          onChange={(e) => setTempDate(e.target.value)}
                          className="bg-background border border-primary/50 rounded-lg px-2 py-1 text-xs text-textMain focus:outline-none"
                        />
                        <button 
                          onClick={async () => {
                            try {
                              await api.put(`/api/v1/clients/${id}`, { 
                                onboardingDate: tempDate 
                              });
                              setClient(prev => ({ ...prev, onboardingDate: tempDate }));
                              setIsEditingDate(false);
                              showAlert('Success', 'Onboarding date updated successfully.', 'success');
                            } catch (err) {
                              showAlert('Error', 'Failed to update onboarding date', 'error');
                            }
                          }}
                          className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500 hover:text-white transition-all"
                        >
                          <CheckCircle size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsEditingDate(true)}>
                        <span className="text-sm text-textMain font-bold">{client.onboardingDate ? new Date(client.onboardingDate).toLocaleDateString() : 'Set Date'}</span>
                        <PenTool size={12} className="text-textMuted opacity-0 group-hover/date:opacity-100 transition-opacity" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-textMuted uppercase tracking-widest block">Workspace Info</span>
                  <div className="flex flex-wrap gap-2">
                     <span className="px-3 py-1 bg-surface border border-borderSubtle rounded-lg text-[10px] font-bold text-textMain">{client.workspaceType}</span>
                     <span className="px-3 py-1 bg-surface border border-borderSubtle rounded-lg text-[10px] font-bold text-textMain">{client.workspaceDetails}</span>
                  </div>
                </div>
              </div>

              {/* PROPOSAL ACTIONS */}
              {client.status === 'New Lead' && (
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 mb-6 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="text-primary" size={20} />
                    <h3 className="text-sm font-black text-textMain uppercase tracking-widest">Proposal Actions</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button 
                      onClick={() => setIsProposalModalOpen(true)}
                      className="bg-primary text-textMain py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/10 flex items-center justify-center gap-2"
                    >
                      <Send size={14} /> Send via Email
                    </button>
                    <button 
                      onClick={handleMarkProposalSent}
                      disabled={isMarkingProposalSent}
                      className="bg-background border border-borderSubtle text-textMuted hover:border-primary hover:text-primary py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isMarkingProposalSent ? (
                        <><div className="w-3 h-3 border-2 border-textMuted border-t-primary rounded-full animate-spin" /> Saving...</>
                      ) : 'Mark Manually Sent'}
                    </button>
                  </div>
                </div>
              )}

              {/* PLAN ACTIONS - Only for Active/Inactive Members */}
              {['Active', 'Inactive', 'Expired'].includes(client.status) && (
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      setUpgradeForm({ newRentAmount: client.rentAmount, planType: client.planType, workspaceDetails: client.workspaceDetails, generateInvoice: false, invoiceAmount: '' });
                      setIsUpgradeModalOpen(true);
                    }}
                    className="flex-1 bg-background border border-borderSubtle text-textMain hover:border-primary hover:text-primary py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm hover:shadow-primary/10"
                  >
                    Upgrade / Downgrade
                  </button>
                  {client.status === 'Inactive' ? (
                    <button 
                      onClick={() => setIsRenewModalOpen(true)}
                      className="flex-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm"
                    >
                      Renew Plan
                    </button>
                  ) : (
                    <button 
                      onClick={() => setIsCancelModalOpen(true)}
                      className="flex-1 bg-background border border-borderSubtle text-rose-500 hover:border-rose-500/50 hover:bg-rose-500/5 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm"
                    >
                      Cancel Plan
                    </button>
                  )}
                </div>
              )}

              {/* ACTIVATION TRIGGER PANEL */}
              {client.status === 'Awaiting Activation' && (
                <div className="mt-6 p-8 bg-emerald-500/5 border border-emerald-500/20 rounded-3xl border-dashed animate-in fade-in slide-in-from-bottom-4 duration-700">
                  {!agreements.some(a => a.status === 'Signed') ? (
                    <div className="text-center space-y-3 py-4">
                      <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center mx-auto border border-blue-500/20">
                        <PenTool size={24} className="animate-bounce" />
                      </div>
                      <p className="text-[10px] text-blue-400 font-black uppercase tracking-[0.2em]">Awaiting Digital Signature</p>
                      <p className="text-xs text-textMuted italic max-w-[200px] mx-auto">The client must sign the agreement before you can activate their membership.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="text-center">
                        <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/20 mb-3">
                          <CheckCircle size={24} className="animate-pulse" />
                        </div>
                        <h4 className="text-sm font-black text-textMain uppercase tracking-tighter">Ready for Onboarding</h4>
                        <p className="text-[10px] text-textMuted uppercase font-bold tracking-widest">Final Step Required</p>
                      </div>
                      
                      <button 
                        onClick={handleActivateMembership}
                        disabled={isActivating}
                        className={`w-full ${isActivating ? 'bg-emerald-500/50' : 'bg-emerald-500 hover:bg-emerald-400'} text-textMain py-5 rounded-[1.5rem] text-xs font-black uppercase tracking-[0.2em] transition-all shadow-2xl shadow-emerald-500/30 flex items-center justify-center gap-3 active:scale-95`}
                      >
                        {isActivating ? (
                          <div className="w-5 h-5 border-2 border-textMain/30 border-t-textMain rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <Check size={20} strokeWidth={4} className="shrink-0" /> 
                            <span className="flex flex-col items-center justify-center leading-tight">
                              <span>Confirm & Activate</span>
                              <span>Member</span>
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {client.status === 'Active' && (
                <div className="mt-6 p-8 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl text-center space-y-4 animate-in zoom-in duration-500">
                  <div className="w-16 h-16 bg-emerald-500 text-background rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/30">
                    <Check size={32} strokeWidth={4} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-emerald-400 uppercase tracking-tighter">Membership Active</h3>
                    <p className="text-xs text-textMuted uppercase tracking-widest font-bold">Client is fully onboarded</p>
                  </div>
                  {/* CLIENT PORTAL ACCESS */}
                  <div className="border-t border-emerald-500/20 pt-4 space-y-3">
                    <p className="text-[10px] font-black text-textMuted uppercase tracking-widest">Member Portal Access</p>
                    {client.portalEnabled ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="text-xs text-emerald-400 font-black">Portal Enabled</span>
                        </div>
                        <a href="/client-portal" target="_blank" rel="noreferrer"
                          className="inline-block text-[10px] text-primary hover:underline font-bold">Open Client Portal ↗</a>
                        <button onClick={() => setIsPortalModalOpen(true)}
                          className="block w-full border border-borderSubtle text-textMuted hover:text-textMain hover:border-primary text-[10px] font-black uppercase tracking-widest py-2 rounded-xl transition-all">
                          Reset Password
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setIsPortalModalOpen(true)}
                        className="w-full bg-primary/10 border border-primary/20 text-primary hover:bg-primary hover:text-textMain py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                        Create Portal Access
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Lifecycle Actions */}
        <div className="xl:col-span-2 space-y-8">
          
          {/* Agreement System Card */}
          <div className="bg-surface border border-borderSubtle rounded-2xl shadow-xl overflow-hidden">
            <div className="p-5 border-b border-borderSubtle flex justify-between items-center bg-background/50">
              <h2 className="text-base font-bold text-textMain flex items-center gap-2">
                <FileSignature size={18} className="text-emerald-500" /> Agreement & Onboarding
              </h2>
              <input 
                type="file" 
                ref={agreementFileInputRef} 
                onChange={handleUploadAgreement} 
                accept=".pdf" 
                className="hidden" 
              />
              <span className="text-xs text-textMuted font-bold uppercase tracking-widest">{client.status === 'Active' ? 'Management' : 'Onboarding'}</span>
              
              {/* Only show Prepare button if NOT active and no pending signature exists */}
              {client.status !== 'Active' && !agreements.some(a => a.status === 'Pending Signature') && client.rentAmount > 0 && (
                <button 
                  onClick={handleGenerateAgreement}
                  className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-textMain px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/10"
                >
                  <Plus size={14} /> Prepare & Upload Agreement
                </button>
              )}
            </div>
            <div className="p-6">
              {/* UNIFIED MANAGEMENT PANEL FOR ACTIVE CLIENTS */}
              {client.status === 'Active' ? (() => {
                // RESILIENT AGREEMENT RESOLUTION
                // 1. Check if we have a permanent URL on the client model (Highest Priority for Active)
                // 2. Fallback to any Signed agreement
                // 3. Fallback to any non-archived agreement
                // 4. Fallback to the most recent agreement regardless of status
                
                const signedAgr = agreements.find(a => a.status === 'Signed');
                const latestAgr = agreements.find(a => a.status !== 'Archived'); // Strictly non-archived
                
                const docUrl = client.agreementPDFUrl 
                            || signedAgr?.agreementPDFUrl 
                            || signedAgr?.draftPDFUrl 
                            || latestAgr?.agreementPDFUrl 
                            || latestAgr?.draftPDFUrl 
                            || null;

                const activeAgrId = signedAgr?._id || latestAgr?._id || null;
                
                return (
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-8 space-y-8 animate-in zoom-in duration-500">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-emerald-500 text-background rounded-[2rem] flex items-center justify-center shadow-2xl shadow-emerald-500/30">
                          <FileText size={32} strokeWidth={2.5} />
                        </div>
                        <div>
                          <h4 className="text-xl font-black text-textMain uppercase tracking-tighter">Membership Agreement</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`w-2 h-2 rounded-full ${docUrl ? 'bg-emerald-500 animate-pulse' : 'bg-orange-400'}`}></span>
                            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-[0.2em]">
                              {docUrl ? 'Live & Verified Record' : 'No Document — Upload Required'}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* VIEW / PRINT / DOWNLOAD */}
                      <div className="flex gap-3">
                        <button 
                          onClick={() => viewPDF(docUrl)}
                          disabled={!docUrl}
                          className={`p-4 rounded-2xl transition-all shadow-sm group ${docUrl ? 'bg-surface border border-borderSubtle hover:border-primary text-textMain cursor-pointer' : 'bg-surface/30 border border-borderSubtle/30 text-textMuted cursor-not-allowed opacity-40'}`}
                          title="View Agreement"
                        >
                          <Eye size={20} className="group-hover:scale-110 transition-transform" />
                        </button>
                        <button 
                          onClick={() => docUrl ? viewPDF(docUrl) : showAlert('Error', 'No document to print.', 'error')}
                          disabled={!docUrl}
                          className={`p-4 rounded-2xl transition-all shadow-sm group ${docUrl ? 'bg-surface border border-borderSubtle hover:border-primary text-textMain cursor-pointer' : 'bg-surface/30 border border-borderSubtle/30 text-textMuted cursor-not-allowed opacity-40'}`}
                          title="Print"
                        >
                          <Printer size={20} className="group-hover:scale-110 transition-transform" />
                        </button>
                        <button 
                          onClick={() => downloadPDF(docUrl, `Agreement_${client.companyName}.pdf`)}
                          disabled={!docUrl}
                          className={`p-4 rounded-2xl transition-all shadow-sm group ${docUrl ? 'bg-surface border border-borderSubtle hover:border-primary text-textMain cursor-pointer' : 'bg-surface/30 border border-borderSubtle/30 text-textMuted cursor-not-allowed opacity-40'}`}
                          title="Download"
                        >
                          <Download size={20} className="group-hover:scale-110 transition-transform" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-8 border-t border-emerald-500/10">
                      <button 
                        onClick={() => activeAgrId ? handleDeleteAgreement(activeAgrId) : showAlert('Notice', 'No document record to delete.', 'info')}
                        className="flex items-center justify-center gap-2 bg-rose-500/5 border border-rose-500/20 text-rose-500 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-textMain transition-all"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    <button 
                        onClick={() => agreementFileInputRef.current.click()}
                        className="flex items-center justify-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-textMain transition-all shadow-lg shadow-emerald-500/10"
                      >
                        <RefreshCw size={14} /> Re-Upload Doc
                      </button>
                    </div>

                    {!docUrl && (
                      <div className="mt-4 p-4 bg-orange-500/5 border border-orange-500/20 rounded-2xl flex items-center gap-4">
                        <AlertCircle className="text-orange-400" size={20} />
                        <p className="text-xs text-textMuted italic">No document found. Click <strong>Re-Upload Doc</strong> to attach the membership contract.</p>
                      </div>
                    )}
                  </div>
                );
              })() : (
                <div id="agreements-list" className="space-y-4">
                  {agreements.length > 0 ? (
                    agreements.map((agr, index) => {
                      const signedAgreements = [...agreements].filter(a => a.status === 'Signed').sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
                      const activeSignedAgrId = signedAgreements.length > 0 ? signedAgreements[0]._id : null;
                      const isLapsed = agr.status === 'Archived' || client.status === 'Inactive' || (agr.status === 'Signed' && activeSignedAgrId && agr._id !== activeSignedAgrId);
                      
                      return (
                      <div key={agr._id} className={`border border-borderSubtle rounded-xl p-4 flex items-center justify-between transition-colors ${isLapsed ? 'opacity-60 bg-background' : 'hover:bg-white/5'}`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${(!isLapsed && agr.status === 'Signed') ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : isLapsed ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-orange-500/10 border-orange-500/20 text-orange-400'}`}>
                            {(!isLapsed && agr.status === 'Signed') ? <Check size={16} strokeWidth={3} /> : isLapsed ? <XCircle size={16} /> : <PenTool size={16} />}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-textMain flex items-center gap-2">
                              Agreement {agreements.length - index}
                              {agr.isSentToClient && !isLapsed && <span className="px-1.5 py-0.5 bg-emerald-500/10 text-[8px] text-emerald-400 rounded-md border border-emerald-500/20">SENT</span>}
                              {isLapsed && <span className="px-1.5 py-0.5 bg-rose-500/10 text-[8px] text-rose-500 rounded-md border border-rose-500/20">LAPSED / CANCELLED</span>}
                            </h4>
                            <p className="text-xs text-textMuted mt-0.5 uppercase font-black tracking-tighter">
                              {!isLapsed && agr.status === 'Signed' ? `Signed on ${new Date(agr.updatedAt || agr.createdAt).toLocaleDateString()}` : 
                               isLapsed ? `Lapsed on ${new Date(agr.updatedAt || agr.createdAt).toLocaleDateString()}` :
                               `${agr.status} • ${new Date(agr.createdAt).toLocaleDateString()}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => viewPDF(agr.agreementPDFUrl || agr.draftPDFUrl)} className="text-textMain hover:bg-primary/10 p-2 border border-borderSubtle rounded-lg bg-background"><Eye size={16} /></button>
                          <button onClick={() => downloadPDF(agr.agreementPDFUrl || agr.draftPDFUrl, `Agreement_${client.companyName}.pdf`)} className="text-textMuted hover:text-textMain p-2 border border-borderSubtle rounded-lg bg-background"><Download size={16} /></button>
                          <button onClick={() => window.print()} className="text-textMuted hover:text-textMain p-2 border border-borderSubtle rounded-lg bg-background"><Printer size={16} /></button>
                          {agr.status === 'Pending Signature' && (
                            <button onClick={() => handleStartSigning(agr._id)} className="bg-emerald-500 hover:bg-emerald-400 text-textMain px-4 py-2 rounded-lg text-xs font-bold transition-all">Review & Sign</button>
                          )}
                          <button onClick={() => handleSendAgreementEmail(agr._id)} className="text-primary hover:bg-primary/10 p-2 border border-primary/20 rounded-lg bg-primary/5" title="Send via Email"><Mail size={16} /></button>
                          <button 
                            onClick={() => handleMarkAgreementSent(agr._id)} 
                            disabled={markingAgreementSentId === agr._id || agr.isSentToClient}
                            className="text-textMuted hover:bg-white/5 p-2 border border-borderSubtle rounded-lg bg-background disabled:opacity-40 disabled:cursor-not-allowed transition-all" 
                            title={agr.isSentToClient ? 'Already marked as sent' : 'Mark Manually Sent'}
                          >
                            {markingAgreementSentId === agr._id 
                              ? <div className="w-4 h-4 border-2 border-textMuted border-t-primary rounded-full animate-spin" />
                              : <CheckCircle size={16} className={agr.isSentToClient ? 'text-emerald-400' : ''} />}
                          </button>
                          <button onClick={() => handleDeleteAgreement(agr._id)} className="text-rose-500 hover:bg-rose-500/10 p-2 border border-rose-500/20 rounded-lg transition-colors"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    );
                  })
                  ) : (
                    <div className="text-center py-10 space-y-3">
                      <div className="w-12 h-12 bg-background border border-borderSubtle rounded-2xl flex items-center justify-center mx-auto opacity-50">
                        <FileSignature size={24} className="text-textMuted" />
                      </div>
                      <p className="text-textMuted italic text-sm">
                        {client.rentAmount > 0 
                          ? "Ready to generate. Click the button above to start the onboarding workflow." 
                          : "Agreement workflow locked. Please set the Agreed Rent in the plan card first."}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Digital Signature Portal */}
      <AnimatePresence>
        {isSigningModalOpen && activeAgreementId && client && (
          <DigitalSignaturePad
            clientId={client._id}
            agreementId={activeAgreementId}
            clientName={client.name}
            companyName={client.companyName}
            onSuccess={handleDigitalSignSuccess}
            onClose={() => { setIsSigningModalOpen(false); setActiveAgreementId(null); }}
          />
        )}
      </AnimatePresence>

      {/* Archive Agreement Modal */}
      {isDeleteAgrModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-surface border border-borderSubtle rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h2 className="text-2xl font-bold text-textMain mb-2 uppercase tracking-tight">Archive Agreement?</h2>
              <p className="text-textMuted text-sm">This agreement will be removed from the active list and stored in the database for future analytics.</p>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setIsDeleteAgrModalOpen(false)} className="flex-1 px-6 py-3 text-sm font-bold text-textMuted hover:text-textMain transition-colors">Cancel</button>
              <button 
                onClick={() => {
                  console.log("Confirming archive for:", agrToDelete);
                  confirmDeleteAgreement();
                }} 
                className="flex-1 bg-rose-500 hover:bg-rose-400 text-textMain px-6 py-3 rounded-2xl text-sm font-bold transition-all shadow-lg shadow-rose-500/25"
              >
                Confirm Archive
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Cancellation Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90 backdrop-blur-md">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-surface border border-borderSubtle rounded-3xl p-8 w-full max-w-lg shadow-2xl space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={32} />
              </div>
              <h2 className="text-2xl font-bold text-textMain mb-2 uppercase tracking-tight">Cancel Membership Plan</h2>
              <p className="text-textMuted text-sm">Are you sure you want to cancel {client.companyName}'s plan? This action will mark the client as Inactive.</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-textMuted uppercase tracking-widest">Reason for Cancellation</label>
                <textarea 
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="Please provide a detailed reason for future reports..."
                  className="w-full bg-background border border-borderSubtle rounded-2xl px-5 py-4 text-sm text-textMain focus:border-rose-500 focus:outline-none min-h-[120px] resize-none"
                />
              </div>
              
              <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl">
                <p className="text-xs text-rose-400 font-medium leading-relaxed">
                  <strong>Warning:</strong> Cancellation data will be logged for administrative analytics and cannot be reversed easily.
                </p>
              </div>
            </div>

            <div className="flex gap-4 pt-2">
              <button 
                onClick={() => setIsCancelModalOpen(false)} 
                className="flex-1 px-6 py-3 text-sm font-bold text-textMuted hover:text-textMain transition-colors"
                disabled={isCancelling}
              >
                Go Back
              </button>
              <button 
                onClick={async () => {
                  if(!cancellationReason.trim()) {
                    showAlert('Error', 'Please provide a reason for cancellation.', 'error');
                    return;
                  }
                  setIsCancelling(true);
                  try {
                    await api.put(`/api/v1/clients/${client._id}`, {
                      status: 'Inactive',
                      cancellationReason,
                      cancelledAt: new Date()
                    });
                    setClient(prev => ({ ...prev, status: 'Inactive' }));
                    setIsCancelModalOpen(false);
                    showAlert('Plan Cancelled', 'The membership has been terminated and logged successfully.', 'success');
                  } catch (err) {
                    showAlert('Error', 'Failed to cancel plan: ' + err.message, 'error');
                  } finally {
                    setIsCancelling(false);
                  }
                }}
                className="flex-1 bg-rose-500 hover:bg-rose-400 text-white px-6 py-3 rounded-2xl text-sm font-bold transition-all shadow-lg shadow-rose-500/25 flex items-center justify-center gap-2"
                disabled={isCancelling}
              >
                {isCancelling ? 'Processing...' : 'Confirm Cancellation'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Renew Modal */}
      {isRenewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90 backdrop-blur-md">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-surface border border-borderSubtle rounded-3xl p-8 w-full max-w-lg shadow-2xl space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <RefreshCw size={32} />
              </div>
              <h2 className="text-2xl font-bold text-textMain mb-2 uppercase tracking-tight">Renew Membership Plan</h2>
              <p className="text-textMuted text-sm">Are you sure you want to renew {client.companyName}'s plan? This will place the client back into the Awaiting Signature pipeline.</p>
            </div>
            
            <div className="flex gap-4 pt-4">
              <button 
                onClick={() => setIsRenewModalOpen(false)} 
                className="flex-1 px-6 py-3 text-sm font-bold text-textMuted hover:text-textMain transition-colors"
                disabled={isRenewing}
              >
                Go Back
              </button>
              <button 
                onClick={async () => {
                  setIsRenewing(true);
                  try {
                    await api.put(`/api/v1/clients/${client._id}`, {
                      status: 'Awaiting Signature',
                      cancellationReason: null,
                      cancelledAt: null
                    });
                    setClient(prev => ({ ...prev, status: 'Awaiting Signature', cancellationReason: null, cancelledAt: null }));
                    setIsRenewModalOpen(false);
                    showAlert('Plan Renewed', 'The client has been placed back in the onboarding pipeline.', 'success');
                  } catch (err) {
                    showAlert('Error', 'Failed to renew plan: ' + err.message, 'error');
                  } finally {
                    setIsRenewing(false);
                  }
                }}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-3 rounded-2xl text-sm font-bold transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
                disabled={isRenewing}
              >
                {isRenewing ? 'Processing...' : 'Confirm Renewal'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-surface border border-borderSubtle rounded-[2.5rem] p-8 w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-black text-textMain uppercase tracking-tight">Edit Company Profile</h2>
                  <p className="text-xs text-textMuted">Update primary contact and billing details for {client.companyName}.</p>
                </div>
                <button onClick={() => setIsEditModalOpen(false)} className="text-textMuted hover:text-textMain p-2">✕</button>
              </div>
              
              <form onSubmit={handleUpdateProfile} className="space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-primary uppercase tracking-widest">Company Name</label>
                    <input value={editFormData.companyName} onChange={(e) => setEditFormData({...editFormData, companyName: e.target.value})} type="text" className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm focus:border-primary focus:outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-primary uppercase tracking-widest">Contact Person</label>
                    <input value={editFormData.name} onChange={(e) => setEditFormData({...editFormData, name: e.target.value})} type="text" className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm focus:border-primary focus:outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-primary uppercase tracking-widest">Email Address</label>
                    <input value={editFormData.contactEmail} onChange={(e) => setEditFormData({...editFormData, contactEmail: e.target.value})} type="email" className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm focus:border-primary focus:outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-primary uppercase tracking-widest">Phone Number</label>
                    <input value={editFormData.contactPhone} onChange={(e) => setEditFormData({...editFormData, contactPhone: e.target.value.replace(/\D/g, '').slice(0, 10)})} type="text" className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm focus:border-primary focus:outline-none" placeholder="e.g. 9876543210" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-primary uppercase tracking-widest">Alternate Phone (Optional)</label>
                    <input value={editFormData.alternatePhone} onChange={(e) => setEditFormData({...editFormData, alternatePhone: e.target.value.replace(/\D/g, '').slice(0, 10)})} type="text" className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm focus:border-primary focus:outline-none" placeholder="e.g. 9876543210" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-accent uppercase tracking-widest border-b border-borderSubtle pb-2">Billing & Membership</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-primary uppercase tracking-widest">GST Number</label>
                      <input 
                        value={editFormData.billingDetails?.gstNumber} 
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 15);
                          setEditFormData({...editFormData, billingDetails: {...editFormData.billingDetails, gstNumber: val}});
                        }} 
                        type="text" 
                        maxLength={15}
                        className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm focus:border-primary focus:outline-none" 
                        placeholder="15-character GSTIN"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-primary uppercase tracking-widest">Membership Plan</label>
                      <select value={editFormData.planType} onChange={(e) => setEditFormData({...editFormData, planType: e.target.value})} className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm focus:border-primary focus:outline-none">
                        {editFormData.workspaceType === 'Individual Seat' ? (
                          <option value="Monthly">Monthly (Locked)</option>
                        ) : editFormData.workspaceType === 'Cabin' ? (
                          <option value="Yearly">Yearly (Locked)</option>
                        ) : (
                          <>
                            <option value="Monthly">Monthly</option>
                            {editFormData.workspaceType === 'Virtual Office' && <option value="Yearly">Yearly</option>}
                          </>
                        )}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-primary uppercase tracking-widest">Meeting Room Rate (₹/hr)</label>
                      <input 
                        value={editFormData.pricingDetails?.meetingRoomRate ?? ''} 
                        onChange={(e) => setEditFormData({
                          ...editFormData, 
                          pricingDetails: {
                            ...editFormData.pricingDetails, 
                            meetingRoomRate: e.target.value
                          }
                        })} 
                        type="number" 
                        onWheel={(e) => e.target.blur()} 
                        className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm focus:border-primary focus:outline-none" 
                        placeholder="500"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-primary uppercase tracking-widest">Billing Address</label>
                    <textarea value={editFormData.billingDetails?.billingAddress} onChange={(e) => setEditFormData({...editFormData, billingDetails: {...editFormData.billingDetails, billingAddress: e.target.value}})} className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm focus:border-primary focus:outline-none h-20" />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-4 text-sm font-bold text-textMuted hover:text-textMain transition-colors">Cancel</button>
                  <button type="submit" className="flex-[2] bg-primary hover:bg-primary/90 text-textMain py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/25">Save Changes</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Proposal Customization Modal */}
      {isProposalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90 backdrop-blur-md">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-surface border border-borderSubtle rounded-3xl p-8 w-full max-w-lg shadow-2xl space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-textMain mb-1">Create Proposal</h2>
              <p className="text-textMuted text-sm">Customize the terms for this client before sending.</p>
            </div>
            
            <form onSubmit={handleGenerateProposal} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-textMuted font-bold uppercase tracking-wider">Plan Type</label>
                  <select 
                    value={proposalFormData.proposedPlan}
                    onChange={(e) => setProposalFormData({...proposalFormData, proposedPlan: e.target.value})}
                    className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                  >
                    {client?.workspaceType === 'Individual Seat' ? (
                      <option value="Monthly">Monthly (Locked)</option>
                    ) : client?.workspaceType === 'Cabin' ? (
                      <option value="Monthly">Monthly (1 Year Lock)</option>
                    ) : (
                      <>
                        <option value="Monthly">Monthly</option>
                        {client?.workspaceType === 'Virtual Office' && <option value="Yearly">Yearly</option>}
                      </>
                    )}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-textMuted font-bold uppercase tracking-wider">Proposed Rent (₹)</label>
                  <input 
                    type="number" 
                    onWheel={(e) => e.target.blur()} 
                    value={proposalFormData.proposedRent}
                    onChange={(e) => setProposalFormData({...proposalFormData, proposedRent: e.target.value})}
                    required
                    className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                    placeholder="e.g. 25000"
                  />
                </div>
              </div>

              <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl">
                <h4 className="text-xs font-bold text-primary uppercase mb-2">Note:</h4>
                <p className="text-xs text-textMuted leading-relaxed">
                  Generating this proposal will update the client's status to "Proposal Sent" and trigger an automated email to the client for review.
                </p>
              </div>

              <div className="flex gap-4">
                <button type="button" onClick={() => setIsProposalModalOpen(false)} className="flex-1 px-6 py-3 text-sm font-bold text-textMuted hover:text-textMain transition-colors">Cancel</button>
                <button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-textMain px-6 py-3 rounded-2xl text-sm font-bold transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2">
                  <Send size={16} /> Send Proposal
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      {/* ── UPGRADE / DOWNGRADE MODAL ── */}
      <AnimatePresence>
        {isUpgradeModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-borderSubtle rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-black text-textMain uppercase tracking-tight">Upgrade / Downgrade</h2>
                  <p className="text-xs text-textMuted mt-1">Adjust the membership plan for <span className="text-primary font-bold">{client?.companyName}</span></p>
                </div>
                <button onClick={() => setIsUpgradeModalOpen(false)} className="text-textMuted hover:text-textMain p-2"><X size={18} /></button>
              </div>

              {/* Current vs New comparison */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-background border border-borderSubtle rounded-2xl p-4">
                  <p className="text-[10px] font-black text-textMuted uppercase tracking-widest mb-1">Current Rent</p>
                  <p className="text-2xl font-black text-textMain">₹{client?.rentAmount?.toLocaleString()}</p>
                  <p className="text-[10px] text-textMuted mt-1">{client?.planType} · {client?.workspaceDetails}</p>
                </div>
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">New Rent</p>
                  <p className="text-2xl font-black text-primary">₹{upgradeForm.newRentAmount ? Number(upgradeForm.newRentAmount).toLocaleString() : '—'}</p>
                  <p className="text-[10px] text-textMuted mt-1">{upgradeForm.planType}</p>
                </div>
              </div>

              <form onSubmit={handleUpgradePlan} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-primary uppercase tracking-widest">New Rent Amount (₹)</label>
                    <input type="number" onWheel={(e) => e.target.blur()} value={upgradeForm.newRentAmount} onChange={e => setUpgradeForm({...upgradeForm, newRentAmount: e.target.value})}
                      className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm focus:border-primary focus:outline-none" placeholder="e.g. 20000" required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-primary uppercase tracking-widest">Plan Type</label>
                    <select value={upgradeForm.planType} onChange={e => setUpgradeForm({...upgradeForm, planType: e.target.value})}
                      className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm focus:border-primary focus:outline-none">
                      <option value="Monthly">Monthly</option>
                      {client?.workspaceType === 'Virtual Office' && <option value="Yearly">Yearly</option>}
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-primary uppercase tracking-widest">Workspace Details (optional)</label>
                  <input type="text" value={upgradeForm.workspaceDetails} onChange={e => setUpgradeForm({...upgradeForm, workspaceDetails: e.target.value})}
                    className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm focus:border-primary focus:outline-none"
                    placeholder={client?.workspaceDetails} />
                </div>

                {/* Prorated Invoice Toggle */}
                <div className="bg-background border border-borderSubtle rounded-2xl p-4 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={upgradeForm.generateInvoice} onChange={e => setUpgradeForm({...upgradeForm, generateInvoice: e.target.checked})}
                      className="w-4 h-4 accent-teal-500" />
                    <div>
                      <p className="text-xs font-black text-textMain">Generate Prorated Invoice Now</p>
                      <p className="text-[10px] text-textMuted">Create an immediate paid invoice for the difference + 18% GST</p>
                    </div>
                  </label>
                  {upgradeForm.generateInvoice && (
                    <div className="space-y-1.5 pt-2 border-t border-borderSubtle">
                      <label className="text-[10px] font-black text-primary uppercase tracking-widest">Invoice Base Amount (₹)</label>
                      <input type="number" onWheel={(e) => e.target.blur()} value={upgradeForm.invoiceAmount}
                        onChange={e => setUpgradeForm({...upgradeForm, invoiceAmount: e.target.value})}
                        placeholder={`Difference: ₹${Math.max(0, (upgradeForm.newRentAmount || 0) - (client?.rentAmount || 0))}`}
                        className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-2.5 text-sm focus:border-primary focus:outline-none" />
                      {upgradeForm.invoiceAmount > 0 && (
                        <div className="text-[10px] text-textMuted space-y-0.5 pt-1">
                          <p>Base: ₹{Number(upgradeForm.invoiceAmount).toLocaleString()}</p>
                          <p>CGST (9%): ₹{Math.round(upgradeForm.invoiceAmount * 0.09).toLocaleString()}</p>
                          <p>SGST (9%): ₹{Math.round(upgradeForm.invoiceAmount * 0.09).toLocaleString()}</p>
                          <p className="text-primary font-black text-xs">Total: ₹{(Number(upgradeForm.invoiceAmount) + Math.round(upgradeForm.invoiceAmount * 0.09) * 2).toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-4 pt-2">
                  <button type="button" onClick={() => setIsUpgradeModalOpen(false)} className="flex-1 py-3 text-sm font-bold text-textMuted hover:text-textMain transition-colors">Cancel</button>
                  <button type="submit" disabled={isUpgrading}
                    className="flex-[2] bg-primary hover:bg-primary/90 disabled:opacity-50 text-textMain py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/25">
                    {isUpgrading ? 'Saving...' : 'Confirm Change'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── CANCEL PLAN MODAL ── */}
      <AnimatePresence>
        {isCancelModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-rose-500/20 rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <XCircle size={32} className="text-rose-500" />
                </div>
                <h2 className="text-2xl font-black text-textMain uppercase tracking-tight">Cancel Plan</h2>
                <p className="text-xs text-textMuted mt-1">This will move <span className="text-rose-400 font-bold">{client?.companyName}</span> to <span className="font-bold">Inactive</span> status</p>
              </div>

              <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-4 mb-6 space-y-2">
                <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">What happens next:</p>
                <ul className="text-xs text-textMuted space-y-1 list-disc list-inside">
                  <li>Client status changes to <strong>Inactive</strong> immediately</li>
                  <li>No further monthly invoices will be generated</li>
                  <li>Historical invoices and revenue remain unchanged</li>
                  <li>Client profile is preserved for your records</li>
                </ul>
              </div>

              <div className="space-y-2 mb-6">
                <label className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Reason for Cancellation *</label>
                <textarea value={cancellationReason} onChange={e => setCancellationReason(e.target.value)} rows={3}
                  className="w-full bg-background border border-borderSubtle focus:border-rose-400 rounded-xl px-4 py-3 text-sm focus:outline-none resize-none"
                  placeholder="e.g. Client relocated, budget constraints, etc." />
              </div>

              <div className="flex gap-4">
                <button onClick={() => { setIsCancelModalOpen(false); setCancellationReason(''); }}
                  className="flex-1 py-3 text-sm font-bold text-textMuted hover:text-textMain transition-colors">Keep Active</button>
                <button onClick={handleCancelPlan} disabled={isCancelling}
                  className="flex-[2] bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-rose-500/25">
                  {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── PORTAL CREDENTIALS MODAL ── */}
      <AnimatePresence>
        {isPortalModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-borderSubtle rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-black text-textMain uppercase tracking-tight">Portal Access</h2>
                <p className="text-xs text-textMuted mt-1">Set credentials for <span className="text-primary font-bold">{client?.companyName}</span></p>
              </div>

              <form onSubmit={handleSetPortalCredentials} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-primary uppercase tracking-widest">Client Email (Login ID)</label>
                  <input type="email" value={client?.contactEmail} disabled
                    className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm text-textMuted focus:outline-none cursor-not-allowed" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-primary uppercase tracking-widest">Portal Password</label>
                  <input type="text" value={portalPassword} onChange={e => setPortalPassword(e.target.value)}
                    className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm focus:border-primary focus:outline-none"
                    placeholder="Must be at least 6 characters" required />
                </div>

                <div className="flex gap-4 pt-2">
                  <button type="button" onClick={() => { setIsPortalModalOpen(false); setPortalPassword(''); }}
                    className="flex-1 py-3 text-sm font-bold text-textMuted hover:text-textMain transition-colors">Cancel</button>
                  <button type="submit" disabled={isSettingPortal}
                    className="flex-[2] bg-primary hover:bg-primary/90 disabled:opacity-50 text-textMain py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/25">
                    {isSettingPortal ? 'Saving...' : 'Set Credentials'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Alert Modal */}
      <AnimatePresence>
        {alertConfig.isOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-surface border border-borderSubtle rounded-[2rem] p-8 w-full max-w-sm shadow-2xl text-center teal-glow"
            >
              <div className={`w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center ${alertConfig.type === 'error' ? 'bg-rose-500/10 text-rose-500' : 'bg-primary/10 text-primary'}`}>
                {alertConfig.type === 'error' ? <X size={32} /> : <CheckCircle size={32} />}
              </div>
              <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tight">{alertConfig.title}</h3>
              <p className="text-sm text-textMuted mb-8 leading-relaxed">{alertConfig.message}</p>
              <button 
                onClick={() => setAlertConfig({ ...alertConfig, isOpen: false })}
                className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg ${alertConfig.type === 'error' ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/25' : 'bg-primary hover:bg-primary/90 shadow-primary/25'} text-white`}
              >
                Continue
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ClientDetail;
