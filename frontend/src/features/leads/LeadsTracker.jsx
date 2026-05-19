import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { Search, Plus, Minus, Mail, Clock, Search as SearchIcon, CheckCircle, TrendingUp, Filter, Trash2, MoreVertical, FileText, X, Pencil, Archive } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import EmailComposeModal from '../../components/EmailComposeModal';
// NOTE: All authenticated API calls use the 'api' utility (not raw axios) to ensure
// the auth interceptor handles token injection and 401 refresh automatically.

const LeadsTracker = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('pipeline'); // Default to pipeline
  const [activeFilter, setActiveFilter] = useState('All');
  
  const [stats, setStats] = useState({ 
    leads: 0, 
    proposalsSent: 0, 
    awaitingSignature: 0, 
    activeClients: 0,
    conversionRate: 0,
    leadsTrend: '+12%',
    proposalsTrend: '+5%'
  });

  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [proposalStep, setProposalStep] = useState(1); // 1: Pricing, 2: Preview, 3: Email
  const [selectedClient, setSelectedClient] = useState(null);
  const [proposalData, setProposalData] = useState({
    recipientEmail: '',
    proposedPlan: 'Monthly',
    pricePerSeat: 0,
    seats: 1,
    discount: 0,
    totalPrice: 0,
    workspaceType: 'Individual Seat',
    workspaceDetails: '',
    subject: 'Workspace Proposal from DWorkz',
    emailBody: '',
    pdfData: null // Store base64 PDF
  });

  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const INITIAL_LEAD_STATE = { 
    name: '', 
    companyName: '', 
    contactPhone: '', 
    contactEmail: '', 
    workspaceType: 'Individual Seat', 
    planType: 'Monthly', 
    rentAmount: 0,
    workspaceDetails: '',
    seats: '1',
    preferredDate: '',
    enquiryDate: new Date().toISOString().split('T')[0],
    source: 'Walk-in',
    priority: 'Warm',
    budgetRange: '',
    notes: '',
    nextFollowUp: ''
  };

  const [newLead, setNewLead] = useState(INITIAL_LEAD_STATE);
  const [isSending, setIsSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [markingSentLeadId, setMarkingSentLeadId] = useState(null);
  
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
  const [pdfViewerUrl, setPdfViewerUrl] = useState('');
  
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const [clientsRes, statsRes] = await Promise.all([
        api.get('/api/v1/clients'),
        api.get('/api/v1/clients/stats')
      ]);

      const allClients = clientsRes.data.data;
      // Filter leads based on simplified pipeline stages
      const leadStatuses = ['New Lead', 'Proposal Sent', 'Negotiation', 'Awaiting Signature', 'Converted', 'Rejected', 'Lead'];
      setLeads(allClients.filter(c => leadStatuses.includes(c.status)));
      
      const s = statsRes.data.data;
      setStats({
        leads: s.leads || 0,
        proposalsSent: s.proposalsSent || 0,
        awaitingSignature: s.awaitingSignature || 0,
        activeClients: s.activeClients || 0,
        conversionRate: ((s.activeClients / (s.activeClients + s.leads || 1)) * 100).toFixed(1),
        leadsTrend: '+12%',
        proposalsTrend: '+5%'
      });

      if (selectedLead) {
        const updated = allClients.find(c => c._id === selectedLead._id);
        if (updated) setSelectedLead(updated);
      }
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [rejectionLeadId, setRejectionLeadId] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ title: '', message: '', onConfirm: () => {} });

  const showAlert = (title, message) => {
    setConfirmConfig({ title, message, onConfirm: null });
    setIsConfirmModalOpen(true);
  };

  const showConfirm = (title, message, onConfirm) => {
    setConfirmConfig({ title, message, onConfirm });
    setIsConfirmModalOpen(true);
  };

  const [selectedLead, setSelectedLead] = useState(null);
  const [isLeadDetailModalOpen, setIsLeadDetailModalOpen] = useState(false);

  const generatePDFForLead = (lead) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pd = lead.pricingDetails || { pricePerSeat: 0, totalPrice: 0, discount: 0 };

    // 1. HEADER (Dworkz. + Contact)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.setTextColor(20, 184, 166); // Teal
    doc.text("Dworkz.", 20, 30);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("GST No. 33AAZFD3031H1ZG", 20, 38);

    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text("Address: TV Swamy Road, R S Puram, Coimbatore", 120, 30);
    doc.text("Contact: +91 9442944363 |", 120, 36);

    doc.setDrawColor(230);
    doc.line(20, 55, pageWidth - 20, 55);

    // 2. PROPOSAL INFO
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("PROPOSAL FOR:", 20, 75);
    doc.text("DATE:", 160, 75);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(String(lead.name), 20, 85);
    doc.text(String(lead.companyName || 'ASD'), 20, 93);
    doc.text(String(lead.contactEmail), 20, 101);

    doc.text(new Date(lead.proposalSentDate || lead.createdAt).toLocaleDateString('en-IN'), 160, 85);

    // 3. LETTER CONTENT
    doc.setFontSize(11);
    doc.text("Dear Partner,", 20, 120);
    doc.text("Thank you for choosing DWorkz. We are pleased to provide workspace details and pricing", 20, 128);
    doc.text("tailored for your team. Our facilities are designed to boost productivity and collaboration.", 20, 134);

    // 4. PRICING TABLE
    autoTable(doc, {
      startY: 150,
      head: [["Workspace Type", "Seats", "Rate/Seat", "Total"]],
      body: [[
        String(lead.workspaceType || 'Individual Seat'),
        String(lead.seats || 1),
        `Rs. ${Number(pd.pricePerSeat).toLocaleString()}`,
        `Rs. ${Number(pd.totalPrice).toLocaleString()}`
      ]],
      theme: 'grid',
      headStyles: { fillColor: [20, 184, 166], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 5 }
    });

    // 5. TERMS
    const finalY = doc.lastAutoTable.finalY + 30;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Terms & Conditions:", 20, finalY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const terms = [
      "A security deposit equivalent to 3 months' rent is required upon confirmation.",
      "An additional 18% GST will apply to the agreed rental amount."
    ];

    terms.forEach((term, index) => {
      doc.text("•", 24, finalY + 12 + (index * 8));
      doc.text(term, 30, finalY + 12 + (index * 8));
    });

    // 6. FOOTER
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Thank you for your business!", 20, finalY + 45);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text("This is system generated document & does not require signature.", 20, finalY + 58);

    return doc.output('datauristring');
  };

  const handleViewProposal = () => {
    try {
      // If we have a saved PDF in the database, use it!
      if (selectedLead.proposalPDFUrl && selectedLead.proposalPDFUrl.startsWith('data:application/pdf')) {
        setPdfViewerUrl(selectedLead.proposalPDFUrl);
        setIsPdfViewerOpen(true);
        return;
      }

      // Otherwise generate on the fly
      const dataUri = generatePDFForLead(selectedLead);
      
      const base64String = dataUri.split('base64,')[1];
      const byteCharacters = atob(base64String);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      
      setPdfViewerUrl(blobUrl);
      setIsPdfViewerOpen(true);
    } catch(e) {
      console.error("PDF Generate Error:", e);
      setSuccessMessage({ type: 'error', text: 'Error generating PDF document.' });
    }
  };

  const handleStatusUpdate = async (id, newStatus, reason = '') => {
    if (newStatus === 'Rejected' && !reason) {
      setRejectionLeadId(id);
      setIsRejectionModalOpen(true);
      return;
    }

    try {
      await api.patch(`/api/v1/clients/${id}`, { 
        status: newStatus,
        rejectionReason: reason
      });
      await fetchLeads();
      if (newStatus === 'Rejected') {
        setIsLeadDetailModalOpen(false);
      }
    } catch (err) {
      if (err.response?.status !== 401) {
        showAlert('Error', 'Error updating status: ' + (err.response?.data?.error || err.message));
      }
    }
  };

  const handleStatusUpdateManual = async (id, newStatus, reason = '') => {
    try {
      await api.put(`/api/v1/clients/${id}`, { 
        status: newStatus,
        rejectionReason: reason
      });
      setIsRejectionModalOpen(false);
      fetchLeads();
    } catch (err) {
      if (err.response?.status !== 401) {
        showAlert('Error', 'Error updating status: ' + (err.response?.data?.error || err.message));
      }
    }
  };

  const moveNext = (lead) => {
    const currentIndex = stages.indexOf(lead.status);
    if (currentIndex < stages.length - 2) { // Don't move past Converted
      handleStatusUpdate(lead._id, stages[currentIndex + 1]);
    }
  };

  const movePrev = (lead) => {
    const currentIndex = stages.indexOf(lead.status);
    if (currentIndex > 0) {
      handleStatusUpdate(lead._id, stages[currentIndex - 1]);
    }
  };

  const handleDelete = async (id) => {
    showConfirm(
      'Archive Lead',
      'Are you sure you want to move this lead to archives? This will preserve all data for analytics but remove it from the active pipeline.',
      async () => {
        try {
          await api.delete(`/api/v1/clients/${id}`);
          fetchLeads();
        } catch (err) {
          showAlert('Error', 'Error deleting lead: ' + (err.response?.data?.error || err.message));
        }
      }
    );
  };

  const handleOpenProposal = (client) => {
    setSelectedClient(client);
    setProposalStep(1);
    
    // Use the numeric value from budgetRange if available, otherwise fall back to defaults
    const budgetValue = parseFloat(client.budgetRange?.replace(/[^0-9.]/g, ''));
    const basePrice = !isNaN(budgetValue) && budgetValue > 0 
      ? budgetValue 
      : (client.workspaceType === 'Cabin' ? 20000 : (client.workspaceType === 'Virtual Office' ? 2000 : 5000));
    
    const seatsCount = client.seats || 1;
    const initialTotal = basePrice * seatsCount;

    setProposalData({
      recipientEmail: client.contactEmail || '',
      proposedPlan: client.planType || 'Monthly',
      pricePerSeat: basePrice,
      seats: seatsCount,
      discount: 0,
      totalPrice: initialTotal,
      preferredDate: client.preferredDate, // Capture preferred start date
      workspaceType: client.workspaceType || 'Individual Seat',
      workspaceDetails: client.workspaceDetails || '',
      subject: 'Workspace Proposal from DWorkz',
      emailBody: `Hi ${client.name},\n\nThank you for inquiring about DWorkz Workspace. We are excited to offer you a professional ${client.workspaceType} for ${seatsCount} seats.\n\nPlease find the attached proposal for your review. We look forward to having ${client.companyName} at our space!\n\nBest Regards,\nTeam DWorkz`,
      pdfData: null
    });
    setIsProposalModalOpen(true);
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // 1. HEADER (Dworkz. + Contact)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.setTextColor(20, 184, 166); // Teal
    doc.text("Dworkz.", 20, 30);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("GST No. 33AAZFD3031H1ZG", 20, 38);

    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text("Address: TV Swamy Road, R S Puram, Coimbatore", 120, 30);
    doc.text("Contact: +91 9442944363 |", 120, 36);

    doc.setDrawColor(230);
    doc.line(20, 55, pageWidth - 20, 55);

    // 2. PROPOSAL INFO
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("PROPOSAL FOR:", 20, 75);
    doc.text("DATE:", 160, 75);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(String(selectedClient.name), 20, 85);
    doc.text(String(selectedClient.companyName || 'ASD'), 20, 93);
    doc.text(String(selectedClient.contactEmail), 20, 101);

    doc.text(new Date().toLocaleDateString('en-IN'), 160, 85);

    // 3. LETTER CONTENT
    doc.setFontSize(11);
    doc.text("Dear Partner,", 20, 125);
    doc.text("Thank you for choosing DWorkz. We are pleased to provide workspace details and pricing", 20, 135);
    doc.text("tailored for your team. Our facilities are designed to boost productivity and collaboration.", 20, 142);

    // 4. PRICING TABLE (Teal Header)
    autoTable(doc, {
      startY: 160,
      head: [["Workspace Type", "Seats", "Rate/Seat", "Total"]],
      body: [[
        String(proposalData.workspaceType),
        String(proposalData.seats),
        `Rs. ${Number(proposalData.pricePerSeat).toLocaleString()}`,
        `Rs. ${Number(proposalData.totalPrice).toLocaleString()}`
      ]],
      theme: 'grid',
      headStyles: { 
        fillColor: [20, 184, 166], 
        textColor: [255, 255, 255], 
        fontStyle: 'bold',
        fontSize: 12,
        halign: 'left',
        valign: 'middle'
      },
      bodyStyles: { 
        fontSize: 11, 
        cellPadding: 8,
        textColor: [50, 50, 50]
      },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 35, halign: 'center' },
        2: { cellWidth: 45 },
        3: { cellWidth: 40 }
      },
      alternateRowStyles: { fillColor: [250, 250, 250] }
    });

    // 5. TERMS & CONDITIONS
    const finalY = doc.lastAutoTable.finalY + 30;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Terms & Conditions:", 20, finalY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const terms = [
      "A security deposit equivalent to 3 months' rent is required upon confirmation.",
      "An additional 18% GST will apply to the agreed rental amount."
    ];

    terms.forEach((term, index) => {
      doc.text("•", 24, finalY + 12 + (index * 8));
      doc.text(term, 30, finalY + 12 + (index * 8));
    });

    // 6. FOOTER
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Thank you for your business!", 20, finalY + 45);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text("This is system generated document & does not require signature.", 20, finalY + 58);

    return doc.output('datauristring');
  };

  const handleNextStep = async () => {
    if (proposalStep === 1) {
      try {
        const pdf = generatePDF();
        await api.post(`/api/v1/clients/${selectedClient._id}/proposals`, {
          pricePerSeat: proposalData.pricePerSeat,
          totalPrice: proposalData.totalPrice,
          discount: proposalData.discount,
          proposedPlan: proposalData.proposedPlan,
          workspaceType: proposalData.workspaceType,
          workspaceDetails: proposalData.workspaceDetails,
          seats: proposalData.seats,
          pdfBase64: pdf
        });

        setProposalData(prev => ({ ...prev, pdfData: pdf }));
        setProposalStep(2);
      } catch (err) {
        if (err.response?.status !== 401) {
          showAlert('Error', 'Proposal generation failed: ' + (err.response?.data?.error || err.message));
        }
      }
    } else if (proposalStep === 2) {
      setProposalStep(3);
    }
  };

  const handleSendProposal = async (e) => {
    if (e) e.preventDefault();
    setIsSending(true);
    try {
      await api.post('/api/v1/email/send-proposal', {
        clientId: selectedClient._id,
        customSubject: proposalData.subject,
        customMessage: proposalData.emailBody,
        pricing: {
          totalPrice: proposalData.totalPrice,
          seats: proposalData.seats,
          planType: proposalData.proposedPlan,
          workspaceType: proposalData.workspaceType
        },
        pdfHtml: ""
      });
      
      setIsProposalModalOpen(false);
      await fetchLeads();
      showAlert('Success', `Enterprise Proposal sent successfully to ${selectedClient.contactEmail}!`);
    } catch (err) {
      if (err.response?.status !== 401) {
        showAlert('Error', 'Failed to send proposal: ' + (err.response?.data?.error || err.message));
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleStartEdit = (lead) => {
    setIsLeadDetailModalOpen(false); // Close detail modal first
    
    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : '';
    };

    setNewLead({
      ...lead,
      notes: Array.isArray(lead.notes) && lead.notes.length > 0 ? lead.notes[0].content : (typeof lead.notes === 'string' ? lead.notes : ''),
      seats: lead.seats?.toString() || '1',
      preferredDate: formatDate(lead.preferredDate),
      enquiryDate: formatDate(lead.enquiryDate),
      nextFollowUp: formatDate(lead.nextFollowUp)
    });
    setTimeout(() => setIsAddLeadModalOpen(true), 100); // Slight delay for smooth transition
  };

  const handleAddLead = async (e, thenOpenProposal = false) => {
    if (e) e.preventDefault();
    
    // VALIDATION
    const requiredFields = {
      name: 'Contact Person',
      companyName: 'Company / Brand',
      contactPhone: 'Phone Number',
      contactEmail: 'Email Address',
      budgetRange: 'Budget Range',
      enquiryDate: 'Enquiry Date',
      seats: 'Seats Needed',
      nextFollowUp: 'Next Follow-up',
      preferredDate: 'Preferred Start'
    };

    for (const [key, label] of Object.entries(requiredFields)) {
      if (!newLead[key] || String(newLead[key]).trim() === '') {
        showAlert('Validation Error', `${label} is required.`);
        return;
      }
    }

    // Budget Range Validation: Must contain at least one digit
    const budgetRegex = /\d/;
    if (!budgetRegex.test(newLead.budgetRange)) {
      showAlert('Validation Error', 'Budget Range must contain numbers (e.g., 15k, 10000-20000).');
      return;
    }

    // Email Validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newLead.contactEmail)) {
      showAlert('Validation Error', 'Please enter a valid email address.');
      return;
    }

    try {
      const payload = {
        ...newLead,
        seats: parseInt(newLead.seats) || 1,
        notes: [{ content: typeof newLead.notes === 'string' ? newLead.notes : (newLead.notes?.[0]?.content || '') }]
      };

      let res;
      if (newLead._id) {
        res = await api.put(`/api/v1/clients/${newLead._id}`, payload);
      } else {
        payload.status = 'New Lead';
        payload.workspaceDetails = `${newLead.seats} Seats | Start: ${newLead.preferredDate} | Source: ${newLead.source}`;
        res = await api.post('/api/v1/clients', payload);
      }
      
      const savedLead = res.data.data;
      setIsAddLeadModalOpen(false);
      setNewLead(INITIAL_LEAD_STATE);
      
      await fetchLeads();
      if (selectedLead && selectedLead._id === savedLead._id) {
        setSelectedLead(savedLead);
      }
      
      if (thenOpenProposal) handleOpenProposal(savedLead);
      else showAlert('Success', `Lead ${newLead._id ? 'updated' : 'saved'} successfully!`);
    } catch (err) {
      if (err.response?.status !== 401) {
        showAlert('Backend Error', err.response?.data?.error || err.message);
      }
    }
  };

  const [advancedFilters, setAdvancedFilters] = useState({
    priority: 'All',
    source: 'All',
    planType: 'All'
  });
  const [tempFilters, setTempFilters] = useState({
    priority: 'All',
    source: 'All',
    planType: 'All'
  });
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);

  const applyFilters = () => {
    setAdvancedFilters(tempFilters);
    setIsAdvancedFilterOpen(false);
  };

  const resetFilters = () => {
    const defaultFilters = { priority: 'All', source: 'All', planType: 'All' };
    setAdvancedFilters(defaultFilters);
    setTempFilters(defaultFilters);
    setSearchTerm('');
    setActiveFilter('All');
    setIsAdvancedFilterOpen(false);
  };

  const filteredLeads = leads.filter(l => {
    const matchesSearch = (l.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
                          (l.companyName?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesStage = activeFilter === 'All' || l.status === activeFilter;
    const matchesPriority = advancedFilters.priority === 'All' || l.priority === advancedFilters.priority;
    const matchesSource = advancedFilters.source === 'All' || l.source === advancedFilters.source;
    const matchesPlan = advancedFilters.planType === 'All' || l.planType === advancedFilters.planType;
    
    return matchesSearch && matchesStage && matchesPriority && matchesSource && matchesPlan;
  });

  const stages = ['New Lead', 'Proposal Sent', 'Negotiation', 'Awaiting Signature', 'Converted', 'Rejected'];

  return (
    <div className="p-8 space-y-10 relative">
      {/* Toast Notification */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className={`fixed top-8 left-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${
              successMessage.type === 'error' 
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' 
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
            }`}
          >
            {successMessage.type === 'error' ? <X size={20} /> : <CheckCircle size={20} />}
            <span className="font-bold text-sm">{successMessage.text || successMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-3xl font-black text-textMain uppercase tracking-tight">
              Leads Management
            </h1>
            <div className="flex bg-surface border border-borderSubtle rounded-xl p-1 shadow-inner">
              <button 
                onClick={() => setViewMode('pipeline')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'pipeline' ? 'bg-primary text-textMain shadow-lg' : 'text-textMuted hover:text-textMain'}`}
              >
                Pipeline
              </button>
              <button 
                onClick={() => setViewMode('table')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'table' ? 'bg-primary text-textMain shadow-lg' : 'text-textMuted hover:text-textMain'}`}
              >
                Table
              </button>
            </div>
          </div>
          <p className="text-textMuted font-medium">Track, nurture, and convert your workspace lead pipeline.</p>
        </div>
        <div className="flex gap-4 relative">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted group-focus-within:text-primary transition-colors" size={18} />
            <input 
              type="text"
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-surface border border-borderSubtle rounded-2xl pl-12 pr-10 py-3 text-sm text-textMain focus:border-primary focus:outline-none w-64 focus:w-80 transition-all shadow-inner"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-textMuted hover:text-textMain transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <button 
            onClick={() => setIsAdvancedFilterOpen(!isAdvancedFilterOpen)}
            className={`px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 border ${isAdvancedFilterOpen || Object.values(advancedFilters).some(v => v !== 'All') ? 'bg-primary/10 border-primary text-primary shadow-lg shadow-primary/10' : 'bg-surface border-borderSubtle text-textMain hover:border-primary'}`}
          >
            <Filter size={18} /> 
            Filters
            {Object.values(advancedFilters).some(v => v !== 'All') && (
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(20,184,166,1)]"></span>
            )}
          </button>
          
          <AnimatePresence>
            {isAdvancedFilterOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 top-full mt-4 w-[400px] bg-surface border border-borderSubtle rounded-3xl p-6 shadow-2xl z-[50] teal-glow"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-textMain font-bold tracking-tight">Filter Workspace Lead Pipeline</h3>
                  <button onClick={resetFilters} className="text-[10px] font-black uppercase text-textMuted hover:text-primary transition-colors tracking-widest">Reset All</button>
                </div>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-primary tracking-widest">Lead Priority</label>
                    <div className="flex gap-2">
                      {['All', 'Hot', 'Warm', 'Cold'].map(p => (
                        <button 
                          key={p} 
                          onClick={() => setTempFilters({...tempFilters, priority: p})}
                          className={`flex-1 py-2 rounded-xl text-[10px] font-bold transition-all border ${tempFilters.priority === p ? 'bg-primary border-primary text-textMain shadow-lg' : 'bg-background border-borderSubtle text-textMuted hover:text-textMain'}`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-primary tracking-widest">Source</label>
                      <select 
                        value={tempFilters.source}
                        onChange={(e) => setTempFilters({...tempFilters, source: e.target.value})}
                        className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-2 text-xs text-textMain focus:border-primary focus:outline-none"
                      >
                        <option value="All">All Sources</option>
                        <option value="Walk-in">Walk-in</option>
                        <option value="Website">Website</option>
                        <option value="Referral">Referral</option>
                        <option value="Social Media">Social Media</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-primary tracking-widest">Plan Type</label>
                      <select 
                        value={tempFilters.planType}
                        onChange={(e) => setTempFilters({...tempFilters, planType: e.target.value})}
                        className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-2 text-xs text-textMain focus:border-primary focus:outline-none"
                      >
                        <option value="All">All Plans</option>
                        <option value="Daily">Daily</option>
                        <option value="Weekly">Weekly</option>
                        <option value="Monthly">Monthly</option>
                        <option value="Yearly">Yearly</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button 
                      onClick={() => setIsAdvancedFilterOpen(false)}
                      className="flex-1 py-3 bg-background border border-borderSubtle text-textMuted rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-textMain transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={applyFilters}
                      className="flex-[2] py-3 bg-primary text-textMain rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
                    >
                      Apply Search
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <button 
            onClick={() => {
              setNewLead(INITIAL_LEAD_STATE);
              setIsAddLeadModalOpen(true);
            }}
            className="bg-primary hover:bg-primary/90 text-textMain px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-primary/25 flex items-center gap-2 teal-glow group"
          >
            <Plus size={20} className="group-hover:scale-110 transition-transform" /> Add Lead
          </button>
        </div>
      </div>


      {/* Active Filters Indicator */}
      {(searchTerm || Object.values(advancedFilters).some(v => v !== 'All')) && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 p-2 rounded-lg">
              <Filter size={16} className="text-primary" />
            </div>
            <div>
              <span className="text-textMain text-sm font-bold">Filters Active: </span>
              <span className="text-textMuted text-sm">
                Showing {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''} matching your search
              </span>
            </div>
          </div>
          <button 
            onClick={resetFilters}
            className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2"
          >
            <X size={14} /> Clear All
          </button>
        </motion.div>
      )}

      {/* Conditional View Rendering */}
      <AnimatePresence mode="wait">
        {viewMode === 'pipeline' ? (
          filteredLeads.length > 0 ? (
            <motion.div 
              key="pipeline"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-6 gap-3 pb-6 min-h-[600px]"
            >
              {stages.map(stage => (
                <div key={stage} className="flex flex-col gap-3 min-w-0">
                  <div className="flex justify-between items-center px-1">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <span className="text-[10px] font-black text-slate-800 dark:text-white/80 uppercase tracking-tighter truncate group-hover:text-primary transition-colors">{stage}</span>
                      <span className="bg-slate-100 dark:bg-surface border border-borderSubtle text-[9px] font-black text-slate-600 dark:text-textMuted px-2 py-0.5 rounded-full shrink-0 shadow-sm">
                        {filteredLeads.filter(l => l.status === stage).length}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex-1 bg-background/30 rounded-[1.5rem] border border-borderSubtle/50 p-2.5 space-y-3">
                    {filteredLeads.filter(l => l.status === stage).map(lead => (
                      <motion.div 
                        key={lead._id}
                        layoutId={lead._id}
                        whileHover={{ scale: 1.02 }}
                        className="bg-surface border border-borderSubtle p-5 rounded-2xl shadow-lg hover:border-primary/30 transition-all cursor-pointer group relative"
                        onClick={() => {
                          setSelectedLead(lead);
                          setIsLeadDetailModalOpen(true);
                        }}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-tighter ${
                            lead.priority === 'Hot' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 
                            lead.priority === 'Warm' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 
                            'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}>
                            {lead.priority || 'Warm'}
                          </span>
                          <div className="flex gap-2">
                            {/* Icons removed per user request */}
                          </div>
                        </div>
                        
                        <h4 className="text-textMain font-bold text-sm leading-tight group-hover:text-primary transition-colors">{lead.companyName}</h4>
                        <p className="text-textMuted text-[10px] mt-1 font-medium flex items-center gap-1">
                          {lead.name}
                        </p>
                        
                        <div className="mt-4 pt-4 border-t border-borderSubtle">
                          <div className="flex flex-col gap-1">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[8px] font-black text-primary/50 uppercase tracking-[0.2em]">Follow-up Date</span>
                              <div className="flex items-center gap-1.5 text-[9px] font-bold text-textMuted uppercase tracking-tighter">
                                <span className={new Date(lead.nextFollowUp) < new Date() ? 'text-rose-400' : ''}>
                                  {lead.nextFollowUp ? new Date(lead.nextFollowUp).toLocaleDateString() : 'Set Follow-up'}
                                </span>
                              </div>
                            </div>
                            <div className="text-[9px] font-black text-primary uppercase mt-1">{lead.workspaceType} • {lead.source}</div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    {filteredLeads.filter(l => l.status === stage).length === 0 && (
                      <div className="h-20 border-2 border-dashed border-borderSubtle rounded-2xl flex items-center justify-center text-[10px] text-textMuted uppercase font-bold tracking-widest opacity-30">
                        Drop Here
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-40 bg-surface/30 rounded-[3rem] border border-dashed border-borderSubtle"
            >
              <Search className="text-textMuted/20 mb-4" size={64} />
              <h3 className="text-2xl font-bold text-textMain mb-2">No Match Found</h3>
              <p className="text-textMuted text-center max-w-sm">We couldn't find any leads matching your filters in the pipeline view.</p>
              <button onClick={resetFilters} className="mt-6 px-8 py-3 bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-widest rounded-xl hover:bg-primary/20 transition-all">
                Reset All Filters
              </button>
            </motion.div>
          )
        ) : (
          <motion.div 
            key="table"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="bg-surface border border-borderSubtle rounded-3xl overflow-hidden shadow-2xl"
          >
            <table className="w-full text-left text-sm">
              <thead className="bg-background/50 text-textMuted">
                <tr>
                  <th className="px-8 py-5 font-bold uppercase tracking-widest text-[10px]">Lead / Company</th>
                  <th className="px-8 py-5 font-bold uppercase tracking-widest text-[10px]">Priority</th>
                  <th className="px-8 py-5 font-bold uppercase tracking-widest text-[10px]">Stage</th>
                  <th className="px-8 py-5 font-bold uppercase tracking-widest text-[10px]">Next Follow-up</th>
                  <th className="px-8 py-5 font-bold uppercase tracking-widest text-[10px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderSubtle">
                {filteredLeads.length > 0 ? (
                  filteredLeads.map(lead => (
                    <tr key={lead._id} className="group hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => {
                      setSelectedLead(lead);
                      setIsLeadDetailModalOpen(true);
                    }}>
                      <td className="px-8 py-5">
                        <div className="flex flex-col">
                          <span className="text-textMain font-bold">{lead.companyName}</span>
                          <span className="text-xs text-textMuted">{lead.name}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase ${
                          lead.priority === 'Hot' ? 'bg-rose-500/10 text-rose-400' : 
                          lead.priority === 'Warm' ? 'bg-orange-500/10 text-orange-400' : 
                          'bg-blue-500/10 text-blue-400'
                        }`}>
                          {lead.priority || 'Warm'}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <select 
                          onClick={(e) => e.stopPropagation()}
                          value={lead.status}
                          onChange={(e) => handleStatusUpdate(lead._id, e.target.value)}
                          className="bg-background border border-borderSubtle text-[10px] font-bold rounded-lg px-2 py-1 focus:outline-none focus:border-primary"
                        >
                          {stages.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2 text-xs">
                          <Clock size={14} className={new Date(lead.nextFollowUp) < new Date() ? 'text-rose-400' : 'text-textMuted'} />
                          <span className={new Date(lead.nextFollowUp) < new Date() ? 'text-rose-400 font-bold' : 'text-textMain'}>
                            {lead.nextFollowUp ? new Date(lead.nextFollowUp).toLocaleDateString() : 'Not Set'}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={(e) => { e.stopPropagation(); handleOpenProposal(lead); }} className="p-2 hover:bg-white/10 rounded-lg text-primary"><Mail size={16}/></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(lead._id); }} className="p-2 hover:bg-rose-500/10 rounded-lg text-rose-500/50 hover:text-rose-500"><Trash2 size={16}/></button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Search className="text-textMuted/20" size={48} />
                        <h3 className="text-xl font-bold text-textMain">No Match Found</h3>
                        <p className="text-sm text-textMuted max-w-xs mx-auto">We couldn't find any leads matching your current search or filter criteria.</p>
                        <button onClick={resetFilters} className="mt-4 text-xs font-black text-primary uppercase tracking-[0.2em] hover:underline">Clear all filters</button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Proposal Wizard Modal */}
      <AnimatePresence>
        {isProposalModalOpen && selectedClient && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-borderSubtle rounded-[2.5rem] w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col h-[90vh] teal-glow"
            >
              {/* Step Progress */}
              <div className="flex items-center px-10 pt-8 pb-6 border-b border-borderSubtle shrink-0 gap-4">
                <button onClick={() => setIsProposalModalOpen(false)} className="text-textMuted hover:text-textMain transition-colors mr-2"><X size={20}/></button>
                {['Pricing', 'Preview PDF', 'Send Email'].map((label, i) => (
                  <React.Fragment key={label}>
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${proposalStep > i+1 ? 'bg-primary text-textMain' : proposalStep === i+1 ? 'bg-primary text-textMain shadow-[0_0_0_5px_rgba(20,184,166,0.15)]' : 'bg-background border-2 border-primary/20 text-textMuted'}`}>{proposalStep > i+1 ? '✓' : i+1}</div>
                      <span className={`text-xs font-bold uppercase tracking-widest ${proposalStep === i+1 ? 'text-textMain' : 'text-textMuted'}`}>{label}</span>
                    </div>
                    {i < 2 && <div className={`flex-1 h-px ${proposalStep > i+1 ? 'bg-primary' : 'bg-borderSubtle'}`}/>}
                  </React.Fragment>
                ))}
              </div>

              <div className="flex flex-1 overflow-hidden">
                {/* STEP 1: PRICING FORM + LIVE PREVIEW */}
                {proposalStep === 1 && (
                  <div className="flex flex-1 overflow-hidden">
                    {/* Left: Inputs */}
                    <div className="w-72 border-r border-borderSubtle p-8 flex flex-col gap-5 overflow-y-auto custom-scrollbar bg-background/40 shrink-0">
                      <div className="p-3 bg-surface rounded-xl border border-borderSubtle">
                        <p className="text-xs font-black text-slate-900">{selectedClient?.companyName || 'Private Client'}</p>
                        <p className="text-[10px] text-slate-600 mt-0.5">{selectedClient?.contactEmail || 'No Email'}</p>
                      </div>
                      {[
                        { label: 'Price per Seat (₹)', key: 'pricePerSeat', type: 'number' },
                        { label: 'Seats', key: 'seats', type: 'number' },
                      ].map(field => (
                        <div key={field.key} className="space-y-1.5">
                          <label className="text-[10px] font-black text-primary uppercase tracking-widest">{field.label}</label>
                          <input type={field.type} value={proposalData[field.key]}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setProposalData(prev => {
                                const next = {...prev, [field.key]: val};
                                next.totalPrice = Math.max(0, next.pricePerSeat * next.seats);
                                return next;
                              });
                            }}
                            className="w-full bg-surface border border-borderSubtle rounded-xl px-4 py-3 text-sm text-textMain focus:border-primary focus:outline-none"
                          />
                        </div>
                      ))}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-primary uppercase tracking-widest">Plan</label>
                        <select value={proposalData.proposedPlan}
                          onChange={(e) => setProposalData(d => ({...d, proposedPlan: e.target.value}))}
                          className="w-full bg-surface border border-borderSubtle rounded-xl px-4 py-3 text-sm text-textMain focus:border-primary focus:outline-none">
                          <option value="Daily">Daily</option>
                          <option value="Weekly">Weekly</option>
                          <option value="Monthly">Monthly</option>
                          {proposalData.workspaceType === 'Virtual Office' && <option value="Yearly">Yearly</option>}
                        </select>
                      </div>
                      <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl">
                        <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-1">Total Amount</p>
                        <p className="text-2xl font-black text-textMain">₹{Number(proposalData.totalPrice).toLocaleString()}</p>
                        <p className="text-[10px] text-textMuted">per {proposalData.proposedPlan}</p>
                      </div>
                    </div>
                    {/* Right: Live Preview */}
                    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-slate-50">
                      <div className="max-w-xl mx-auto bg-white shadow-xl rounded-2xl p-10 md:p-12 border border-slate-100 min-h-[700px] flex flex-col">
                        <div className="flex justify-between items-start mb-8">
                          <div>
                            <div className="flex items-center mb-1">
                              <h1 className="text-3xl font-bold text-primary tracking-tight">Dworkz</h1>
                              <span className="w-1.5 h-1.5 bg-primary rounded-full mt-3"></span>
                            </div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">GST No. 33AAZFD3031H1ZG</p>
                          </div>
                          <div className="text-right space-y-0.5">
                            <p className="text-[10px] font-bold text-slate-500">Address: TV Swamy Road, Coimbatore</p>
                            <p className="text-[10px] font-bold text-slate-500">Contact: +91 9442944363 |</p>
                          </div>
                        </div>

                        <div className="h-px bg-slate-100 w-full mb-10"></div>

                        <div className="grid grid-cols-2 gap-8 mb-10">
                          <div>
                            <h3 className="text-[9px] font-black text-slate-900 uppercase tracking-widest mb-2">Proposal For:</h3>
                            <p className="text-lg font-bold text-slate-900 leading-tight">{selectedClient?.name}</p>
                            <p className="text-base font-bold text-slate-700">{selectedClient?.companyName || 'ASD'}</p>
                            <p className="text-xs font-medium text-slate-500 mt-1">{selectedClient?.contactEmail}</p>
                          </div>
                          <div className="text-right">
                            <h3 className="text-[9px] font-black text-slate-900 uppercase tracking-widest mb-1">Date:</h3>
                            <p className="text-lg font-bold text-slate-900">{new Date().toLocaleDateString('en-IN')}</p>
                          </div>
                        </div>

                        <div className="space-y-3 mb-10">
                          <p className="text-sm font-bold text-slate-900">Dear Partner,</p>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            Thank you for choosing DWorkz. We are pleased to provide workspace details and pricing tailored for your team. Our facilities are designed to boost productivity and collaboration.
                          </p>
                        </div>

                        {/* Pricing Table */}
                        <div className="rounded-xl border border-slate-200 overflow-hidden mb-10 shadow-sm">
                          <div className="grid grid-cols-4 bg-primary px-4 py-3">
                            <span className="text-[9px] font-black text-white uppercase tracking-widest">Workspace</span>
                            <span className="text-[9px] font-black text-white uppercase tracking-widest text-center">Seats</span>
                            <span className="text-[9px] font-black text-white uppercase tracking-widest text-right">Rate</span>
                            <span className="text-[9px] font-black text-white uppercase tracking-widest text-right">Total</span>
                          </div>
                          <div className="grid grid-cols-4 px-4 py-4 bg-white items-center">
                            <span className="text-xs font-bold text-slate-900">{proposalData.workspaceType}</span>
                            <span className="text-xs font-bold text-slate-500 text-center">{proposalData.seats}</span>
                            <span className="text-xs font-bold text-slate-500 text-right">Rs. {Number(proposalData.pricePerSeat).toLocaleString()}</span>
                            <span className="text-sm font-black text-slate-900 text-right">Rs. {Number(proposalData.totalPrice).toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Terms */}
                        <div className="mb-10">
                          <h4 className="text-[9px] font-black text-slate-900 uppercase tracking-widest mb-3">Terms & Conditions:</h4>
                          <ul className="space-y-1.5">
                            {[
                              "A security deposit equivalent to 3 months' rent is required upon confirmation.",
                              "An additional 18% GST will apply to the agreed rental amount."
                            ].map((term, i) => (
                              <li key={i} className="text-[10px] text-slate-500 flex items-start gap-2">
                                <span className="text-primary mt-1">•</span>
                                {term}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="mt-auto">
                          <h3 className="text-sm font-black text-slate-900">Thank you for your business!</h3>
                          <p className="text-[10px] italic font-medium text-slate-400 mt-1">
                            This is system generated document & does not require signature.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: PDF PREVIEW */}
                {proposalStep === 2 && (
                  <div className="flex-1 flex flex-col p-6 gap-4 overflow-hidden">
                    <div className="flex items-center justify-between shrink-0 px-2">
                      <div>
                        <p className="text-textMain font-black text-sm uppercase tracking-tight">Proposal PDF Ready</p>
                        <p className="text-textMuted text-[10px] uppercase font-bold tracking-widest">Review and Download</p>
                      </div>
                      <div className="flex gap-3">
                        {proposalData.pdfData && (
                          <a href={proposalData.pdfData} download={`Proposal_${selectedClient.companyName.replace(/\s+/g,'_')}.pdf`}
                            className="px-6 py-3 bg-surface border border-borderSubtle text-textMain text-[10px] font-black uppercase tracking-widest rounded-xl hover:border-primary transition-all flex items-center gap-2 shadow-sm">
                            <FileText size={14} className="text-primary"/> Download PDF
                          </a>
                        )}
                        <button 
                          onClick={async () => {
                            try {
                              setMarkingSentLeadId(selectedClient._id);
                              await api.post(`/api/v1/clients/${selectedClient._id}/proposal/mark-sent`, {
                                pdfBase64: proposalData.pdfData
                              });
                              setIsProposalModalOpen(false);
                              await fetchLeads();
                              setSuccessMessage({ type: 'success', text: 'Proposal marked as manually sent.' });
                            } catch (err) {
                              showAlert('Error', 'Failed to mark as sent: ' + (err.response?.data?.error || err.message));
                            } finally {
                              setMarkingSentLeadId(null);
                            }
                          }}
                          disabled={markingSentLeadId === selectedClient?._id}
                          className="px-6 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-500 hover:text-white transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {markingSentLeadId === selectedClient?._id 
                            ? <><div className="w-3 h-3 border-2 border-emerald-400 border-t-white rounded-full animate-spin" /> Saving...</>
                            : <><CheckCircle size={14} /> Mark Sent Manually</>}
                        </button>
                      </div>
                    </div>
                    {proposalData.pdfData ? (
                      <iframe src={proposalData.pdfData} className="flex-1 w-full rounded-2xl border border-borderSubtle" title="Proposal Preview"/>
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-textMuted">Generating PDF...</div>
                    )}
                  </div>
                )}

                {/* STEP 3: EMAIL COMPOSER */}
                {proposalStep === 3 && (
                  <div className="flex-1 p-8 overflow-y-auto custom-scrollbar flex flex-col gap-5">
                    <div>
                      <p className="text-textMain font-bold text-lg mb-1">Compose & Send</p>
                      <p className="text-textMuted text-xs">The PDF is auto-attached. Edit the message if needed.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-primary uppercase tracking-widest">To (Email)</label>
                        <input type="email" value={proposalData.recipientEmail}
                          onChange={(e) => setProposalData(d => ({...d, recipientEmail: e.target.value}))}
                          className="w-full bg-surface border border-borderSubtle rounded-xl px-4 py-3 text-sm text-textMain focus:border-primary focus:outline-none"/>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-primary uppercase tracking-widest">Subject</label>
                        <input type="text" value={proposalData.subject}
                          onChange={(e) => setProposalData(d => ({...d, subject: e.target.value}))}
                          className="w-full bg-surface border border-borderSubtle rounded-xl px-4 py-3 text-sm text-textMain focus:border-primary focus:outline-none"/>
                      </div>
                    </div>
                    <div className="space-y-1.5 flex-1 flex flex-col">
                      <label className="text-[10px] font-black text-primary uppercase tracking-widest">Message</label>
                      <textarea value={proposalData.emailBody}
                        onChange={(e) => setProposalData(d => ({...d, emailBody: e.target.value}))}
                        className="flex-1 min-h-[200px] w-full bg-surface border border-borderSubtle rounded-xl px-4 py-3 text-sm text-textMain focus:border-primary focus:outline-none resize-none"/>
                    </div>
                    <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl flex items-center gap-3 shrink-0">
                      <FileText size={20} className="text-primary shrink-0"/>
                      <div>
                        <p className="text-textMain text-xs font-bold">Proposal_{selectedClient.companyName.replace(/\s+/g,'_')}.pdf</p>
                        <p className="text-textMuted text-[10px]">Auto-generated PDF — will be attached on send</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Buttons */}
              <div className="px-10 py-5 border-t border-borderSubtle flex justify-between items-center shrink-0">
                <button onClick={() => proposalStep > 1 ? setProposalStep(p => p-1) : setIsProposalModalOpen(false)}
                  className="px-6 py-3 text-sm font-bold text-textMuted hover:text-textMain transition-colors">
                  {proposalStep > 1 ? '← Back' : 'Cancel'}
                </button>
                {proposalStep < 3 ? (
                  <button onClick={handleNextStep}
                    className="px-8 py-3 bg-primary text-textMain rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
                    {proposalStep === 1 ? 'Generate PDF Preview →' : 'Compose Email →'}
                  </button>
                ) : (
                  <button onClick={handleSendProposal} disabled={isSending}
                    className={`px-8 py-3 rounded-xl text-sm font-black uppercase tracking-widest shadow-lg transition-all ${isSending ? 'bg-primary/50 text-textMain/50 cursor-not-allowed' : 'bg-primary text-textMain shadow-primary/20 hover:bg-primary/90'}`}>
                    {isSending ? 'Sending...' : '📧 Send Proposal'}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Lead Modal */}
      <AnimatePresence>
        {isAddLeadModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-surface border border-borderSubtle rounded-3xl p-8 w-full max-w-2xl shadow-2xl relative teal-glow max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-textMain tracking-tight">{newLead._id ? 'Update Lead Details' : 'Capture New Inquiry'}</h2>
                <p className="text-sm text-textMuted mt-1">{newLead._id ? 'Refine lead information and requirements.' : 'Capture detailed requirements to generate a tailored proposal.'}</p>
              </div>

              <form onSubmit={handleAddLead} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-primary uppercase tracking-widest">Contact Person</label>
                    <input 
                      required
                      type="text" 
                      placeholder="e.g. John Doe"
                      value={newLead.name}
                      onChange={(e) => setNewLead({...newLead, name: e.target.value})}
                      className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm text-textMain focus:border-primary focus:outline-none" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-primary uppercase tracking-widest">Company / Brand</label>
                    <input 
                      required
                      type="text" 
                      placeholder="e.g. Acme Corp"
                      value={newLead.companyName}
                      onChange={(e) => setNewLead({...newLead, companyName: e.target.value})}
                      className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm text-textMain focus:border-primary focus:outline-none" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-primary uppercase tracking-widest">Email Address</label>
                    <input 
                      required
                      type="email" 
                      placeholder="john@company.com"
                      value={newLead.contactEmail}
                      onChange={(e) => setNewLead({...newLead, contactEmail: e.target.value})}
                      className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm text-textMain focus:border-primary focus:outline-none" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-primary uppercase tracking-widest">Phone Number</label>
                    <input 
                      required
                      type="text" 
                      placeholder="+91 98765 43210"
                      value={newLead.contactPhone}
                      onChange={(e) => setNewLead({...newLead, contactPhone: e.target.value})}
                      className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm text-textMain focus:border-primary focus:outline-none" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-primary uppercase tracking-widest">Enquiry Date</label>
                    <input 
                      type="date" 
                      value={newLead.enquiryDate}
                      onChange={(e) => setNewLead({...newLead, enquiryDate: e.target.value})}
                      className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm text-textMain focus:border-primary focus:outline-none" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-primary uppercase tracking-widest">Lead Source</label>
                    <select 
                      value={newLead.source}
                      onChange={(e) => setNewLead({...newLead, source: e.target.value})}
                      className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm text-textMain focus:border-primary focus:outline-none"
                    >
                      <option value="Walk-in">Walk-in</option>
                      <option value="Website">Website</option>
                      <option value="Referral">Referral</option>
                      <option value="Social Media">Social Media</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-primary uppercase tracking-widest">Priority</label>
                    <select 
                      value={newLead.priority}
                      onChange={(e) => setNewLead({...newLead, priority: e.target.value})}
                      className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm text-textMain focus:border-primary focus:outline-none"
                    >
                      <option value="Hot">Hot (High Intent)</option>
                      <option value="Warm">Warm (Interested)</option>
                      <option value="Cold">Cold (Inquiry)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-primary uppercase tracking-widest">Budget Range (₹)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 15k - 20k"
                      value={newLead.budgetRange}
                      onChange={(e) => setNewLead({...newLead, budgetRange: e.target.value})}
                      className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm text-textMain focus:border-primary focus:outline-none" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-primary uppercase tracking-widest">Next Follow-up</label>
                    <input 
                      type="date" 
                      value={newLead.nextFollowUp}
                      onChange={(e) => setNewLead({...newLead, nextFollowUp: e.target.value})}
                      className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm text-textMain focus:border-primary focus:outline-none" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-primary uppercase tracking-widest">Preferred Start</label>
                    <input 
                      type="date" 
                      value={newLead.preferredDate}
                      onChange={(e) => setNewLead({...newLead, preferredDate: e.target.value})}
                      className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm text-textMain focus:border-primary focus:outline-none" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-primary uppercase tracking-widest">Workspace Preference</label>
                    <select 
                      value={newLead.workspaceType}
                      onChange={(e) => {
                        const type = e.target.value;
                        const plan = type === 'Cabin' ? 'Yearly' : 'Monthly';
                        setNewLead({ ...newLead, workspaceType: type, planType: plan });
                      }}
                      className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm text-textMain focus:border-primary focus:outline-none"
                    >
                      <option value="Individual Seat">Individual Seat</option>
                      <option value="Cabin">Cabin</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-primary uppercase tracking-widest">Seats Needed</label>
                    <div className="flex items-center bg-background border border-borderSubtle rounded-xl overflow-hidden focus-within:border-primary transition-colors">
                      <button 
                        type="button"
                        onClick={() => setNewLead({...newLead, seats: Math.max(0, (parseInt(newLead.seats) || 0) - 1).toString()})}
                        className="px-3 py-3 hover:bg-white/5 text-textMuted hover:text-textMain transition-colors border-r border-borderSubtle"
                      >
                        <Minus size={14} />
                      </button>
                      <input 
                        type="number" 
                        onWheel={(e) => e.target.blur()} 
                        placeholder="0"
                        value={newLead.seats}
                        onChange={(e) => setNewLead({...newLead, seats: e.target.value})}
                        className="w-full bg-transparent px-4 py-3 text-sm text-textMain focus:outline-none text-center font-bold" 
                      />
                      <button 
                        type="button"
                        onClick={() => setNewLead({...newLead, seats: ((parseInt(newLead.seats) || 0) + 1).toString()})}
                        className="px-3 py-3 hover:bg-white/5 text-textMuted hover:text-textMain transition-colors border-l border-borderSubtle"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-primary uppercase tracking-widest">Plan Type</label>
                    <select 
                      value={newLead.planType}
                      onChange={(e) => setNewLead({...newLead, planType: e.target.value})}
                      className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm text-textMain focus:border-primary focus:outline-none font-bold text-primary"
                    >
                      {newLead.workspaceType === 'Cabin' ? (
                        <option value="Yearly">Yearly (Locked)</option>
                      ) : (
                        <option value="Monthly">Monthly (Locked)</option>
                      )}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-primary uppercase tracking-widest">Strategic Notes</label>
                  <textarea 
                    placeholder="Specific requirements, decision makers, budget constraints..."
                    value={newLead.notes}
                    onChange={(e) => setNewLead({...newLead, notes: e.target.value})}
                    className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm text-textMain focus:border-primary focus:outline-none h-24" 
                  />
                </div>

                <div className="pt-6 flex gap-4">
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsAddLeadModalOpen(false);
                      setNewLead({ 
                        name: '', companyName: '', contactPhone: '', contactEmail: '', 
                        workspaceType: 'Individual Seat', planType: 'Monthly', rentAmount: 0,
                        workspaceDetails: '', seats: '1', preferredDate: '', source: 'Walk-in', notes: '',
                        priority: 'Warm', budgetRange: '', nextFollowUp: '', enquiryDate: new Date().toISOString().split('T')[0]
                      });
                    }} 
                    className="flex-1 py-4 bg-background border border-borderSubtle text-textMuted hover:text-textMain rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-[2] bg-primary text-textMain py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/25 hover:scale-[1.02] transition-all"
                  >
                    {newLead._id ? 'Save Changes' : 'Create New Lead'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Rejection Reason Modal */}
      <AnimatePresence>
        {isRejectionModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-surface border border-borderSubtle rounded-[2rem] p-8 w-full max-w-md shadow-2xl teal-glow"
            >
              <h3 className="text-xl font-bold text-textMain mb-2">Rejection Reason</h3>
              <p className="text-sm text-textMuted mb-6">Capture why this lead didn't convert for future analysis.</p>
              
              <div className="space-y-4">
                {['Too costly', 'Location', 'Not matching requirement', 'Competitor', 'Other'].map(reason => (
                  <button 
                    key={reason}
                    onClick={() => handleStatusUpdateManual(rejectionLeadId, 'Rejected', reason)}
                    className="w-full text-left px-4 py-3 bg-background border border-borderSubtle rounded-xl text-sm text-textMain hover:border-primary hover:bg-primary/5 transition-all"
                  >
                    {reason}
                  </button>
                ))}
              </div>
              
              <button 
                onClick={() => setIsRejectionModalOpen(false)}
                className="mt-6 w-full py-3 text-sm font-bold text-textMuted hover:text-textMain transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Lead Detail / Edit Modal */}
      <AnimatePresence>
        {isLeadDetailModalOpen && selectedLead && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-surface border border-borderSubtle rounded-[2.5rem] p-0 w-full max-w-4xl shadow-2xl overflow-hidden flex h-[85vh] teal-glow"
            >
              {/* Left Side: Detail & Edit */}
              <div className="flex-1 p-10 overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em] mb-2 block">Lead Intelligence</span>
                    <h2 className="text-3xl font-black text-textMain tracking-tighter">{selectedLead.companyName}</h2>
                    <p className="text-textMuted font-medium mt-1">{selectedLead.name} • {selectedLead.contactEmail}</p>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleStartEdit(selectedLead)}
                      className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                    >
                      <Pencil size={14} /> Edit Lead
                    </button>
                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                      selectedLead.priority === 'Hot' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 
                      selectedLead.priority === 'Warm' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 
                      'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    }`}>
                      {selectedLead.priority} Priority
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-textMuted uppercase tracking-widest">Pipeline Stage</label>
                      <div className="w-full bg-background/50 border border-borderSubtle rounded-2xl px-5 py-4 text-sm text-primary font-black uppercase tracking-widest">
                        {selectedLead.status}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-textMuted uppercase tracking-widest">Workspace</label>
                        <div className="bg-background border border-borderSubtle rounded-2xl px-5 py-4 text-sm text-textMain font-bold">{selectedLead.workspaceType}</div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-textMuted uppercase tracking-widest">Seats</label>
                        <div className="bg-background border border-borderSubtle rounded-2xl px-5 py-4 text-sm text-textMain font-bold">{selectedLead.seats || 'N/A'}</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-textMuted uppercase tracking-widest">Lead Source</label>
                      <div className="bg-background border border-borderSubtle rounded-2xl px-5 py-4 text-sm text-textMain font-bold">{selectedLead.source}</div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-textMuted uppercase tracking-widest">Strategic Notes</label>
                      <div className="bg-background border border-borderSubtle rounded-2xl p-5 min-h-[200px] text-sm text-textMain leading-relaxed">
                        {selectedLead.notes && selectedLead.notes.length > 0 ? selectedLead.notes[0].content : 'No strategic notes captured for this inquiry.'}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-textMuted uppercase tracking-widest">Next Follow-up</label>
                        <div className="bg-background border border-borderSubtle rounded-2xl px-5 py-4 text-sm text-textMain font-bold flex items-center gap-2">
                          <Clock size={14} className="text-primary" />
                          {selectedLead.nextFollowUp ? new Date(selectedLead.nextFollowUp).toLocaleDateString() : 'Not Set'}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-textMuted uppercase tracking-widest">Enquiry Date</label>
                        <div className="bg-background border border-borderSubtle rounded-2xl px-5 py-4 text-sm text-textMain font-bold">
                           {selectedLead.enquiryDate ? new Date(selectedLead.enquiryDate).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side: Quick Actions */}
              <div className="w-[320px] bg-background/50 border-l border-borderSubtle p-10 flex flex-col justify-between">
                <div className="space-y-8">
                  {/* Title removed per user request */}
                  
                  <div className="space-y-3">
                    <div className="bg-surface border border-borderSubtle rounded-2xl p-4 mb-4">
                      <p className="text-[10px] font-bold text-textMuted uppercase tracking-widest mb-1">Contact Phone</p>
                      <p className="text-sm font-bold text-textMain">{selectedLead.contactPhone || 'No phone provided'}</p>
                    </div>

                    {['Proposal Sent', 'Negotiation', 'Awaiting Signature', 'Converted', 'Rejected'].includes(selectedLead.status) ? (
                      <>
                        <button 
                          onClick={handleViewProposal}
                          className="w-full bg-primary text-textMain p-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/25 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                        >
                          <FileText size={16} /> View the Proposal
                        </button>
                        
                        {selectedLead.status === 'Rejected' && (
                          <div className="pt-4">
                            <button 
                              onClick={() => {
                                showConfirm(
                                  'Archive Lead',
                                  'Are you sure you want to move this lead to archives? It will be removed from the pipeline but kept for analytical tracking.',
                                  async () => {
                                    try {
                                      await api.delete(`/api/v1/clients/${selectedLead._id}`);
                                      setIsLeadDetailModalOpen(false);
                                      await fetchLeads();
                                    } catch (err) {
                                      showAlert('Error', 'Failed to archive lead: ' + (err.response?.data?.error || err.message));
                                    }
                                  }
                                );
                              }}
                              className="w-full bg-red-500/10 text-red-500 border border-red-500/20 p-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-textMain transition-all flex items-center justify-center gap-2"
                            >
                              <Archive size={14} /> Archive Lead
                            </button>
                          </div>
                        )}
                        
                        {(selectedLead.status !== 'Converted' && selectedLead.status !== 'Rejected') && (
                          <div className="pt-4 space-y-2">
                            <p className="text-[10px] font-bold text-textMuted uppercase tracking-widest text-center mb-2">Move to Next Stage</p>
                            
                            {['Proposal Sent'].includes(selectedLead.status) && (
                              <button 
                                onClick={() => { handleStatusUpdateManual(selectedLead._id, 'Negotiation'); setIsLeadDetailModalOpen(false); }}
                                className="w-full bg-orange-500/10 text-orange-400 border border-orange-500/20 p-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-500 hover:text-textMain transition-all"
                              >
                                Negotiation
                              </button>
                            )}
                            
                            {['Proposal Sent', 'Negotiation'].includes(selectedLead.status) && (
                              <button 
                                onClick={() => { handleStatusUpdateManual(selectedLead._id, 'Awaiting Signature'); setIsLeadDetailModalOpen(false); }}
                                className="w-full bg-blue-500/10 text-blue-400 border border-blue-500/20 p-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 hover:text-textMain transition-all"
                              >
                                Awaiting Signature
                              </button>
                            )}
                            
                            {['Proposal Sent', 'Negotiation', 'Awaiting Signature'].includes(selectedLead.status) && (
                              <button 
                                onClick={() => { handleStatusUpdateManual(selectedLead._id, 'Converted'); setIsLeadDetailModalOpen(false); }}
                                className="w-full bg-emerald-500/10 text-emerald-400 border border-borderSubtle rounded-xl p-3 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-textMain transition-all"
                              >
                                Converted
                              </button>
                            )}
                            
                            <button 
                                onClick={() => { handleStatusUpdate(selectedLead._id, 'Rejected'); }}
                                className="w-full bg-rose-500/10 text-rose-400 border border-rose-500/20 p-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-textMain transition-all"
                              >
                                Rejected
                              </button>
                          </div>
                        )}
                      </>
                    ) : selectedLead.status !== 'Rejected' && selectedLead.status !== 'Converted' ? (
                      <>
                         <button 
                          onClick={() => { handleOpenProposal(selectedLead); setIsLeadDetailModalOpen(false); }}
                          className="w-full bg-primary text-textMain p-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/25 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                        >
                          <FileText size={16} /> {selectedLead.proposalCreated ? 'View / Re-Generate Proposal' : 'Prepare Proposal'}
                        </button>

                        {selectedLead.proposalCreated && (
                          <button 
                            onClick={async () => {
                              try {
                                setMarkingSentLeadId(selectedLead._id);
                                await api.post(`/api/v1/clients/${selectedLead._id}/proposal/mark-sent`, {});
                                setIsLeadDetailModalOpen(false);
                                await fetchLeads();
                                setSuccessMessage({ type: 'success', text: 'Proposal marked as manually sent.' });
                              } catch (err) {
                                setSuccessMessage({ text: 'Action failed: ' + (err.response?.data?.error || err.message), type: 'error' });
                              } finally {
                                setMarkingSentLeadId(null);
                              }
                            }}
                            disabled={markingSentLeadId === selectedLead._id}
                            className="w-full bg-surface border border-borderSubtle text-textMuted p-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {markingSentLeadId === selectedLead._id
                              ? <><div className="w-4 h-4 border-2 border-textMuted border-t-primary rounded-full animate-spin" /> Saving...</>
                              : <><CheckCircle size={16} /> Mark Manually Sent</>}
                          </button>
                        )}
                        
                        <div className="pt-4 border-t border-borderSubtle mt-4">
                            <button 
                                onClick={() => { handleStatusUpdate(selectedLead._id, 'Rejected'); }}
                                className="w-full bg-rose-500/10 text-rose-400 border border-rose-500/20 p-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-textMain transition-all"
                              >
                                Rejected
                              </button>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-3">
                        <div className="w-full bg-surface border border-borderSubtle text-textMuted p-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2">
                          {selectedLead.status}
                        </div>
                        {selectedLead.status === 'Rejected' && (
                          <button 
                            onClick={() => {
                              if(window.confirm('Are you sure you want to discard this lead? It will be removed from the pipeline but kept in analytics.')) {
                                handleStatusUpdateManual(selectedLead._id, 'Archived');
                                setIsLeadDetailModalOpen(false);
                              }
                            }}
                            className="w-full bg-red-500/10 text-red-500 border border-red-500/20 p-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-textMain transition-all flex items-center justify-center gap-2"
                          >
                            <Trash2 size={14} /> Discard Lead
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <button 
                  onClick={() => setIsLeadDetailModalOpen(false)}
                  className="w-full py-4 bg-surface border border-borderSubtle text-textMuted rounded-2xl text-[10px] font-black uppercase tracking-widest hover:text-textMain transition-all"
                >
                  Close Detail
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PDF Viewer Modal */}
      <AnimatePresence>
        {isPdfViewerOpen && (
          <div className="fixed inset-0 bg-background/90 backdrop-blur-md z-[100] flex items-center justify-center p-8">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-borderSubtle rounded-[2rem] w-full max-w-5xl h-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-borderSubtle flex justify-between items-center bg-surface/50">
                <h2 className="text-xl font-bold text-textMain tracking-tight flex items-center gap-3">
                  <FileText className="text-primary" />
                  Proposal Document
                </h2>
                <div className="flex items-center gap-3">
                  <a 
                    href={pdfViewerUrl} 
                    download={`Proposal_${selectedLead?.companyName || 'DWorkz'}.pdf`}
                    className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-black uppercase tracking-widest rounded-xl transition-all"
                  >
                    Download
                  </a>
                  <button 
                    onClick={() => setIsPdfViewerOpen(false)}
                    className="p-2 bg-background hover:bg-background/80 text-textMuted hover:text-textMain rounded-xl transition-all border border-borderSubtle"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-background">
                <iframe src={pdfViewerUrl} className="w-full h-full border-0" title="PDF Viewer" />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Confirmation/Alert Modal */}
      <AnimatePresence>
        {isConfirmModalOpen && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-surface border border-borderSubtle rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl teal-glow"
            >
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  {confirmConfig.onConfirm ? <Trash2 className="text-primary" size={32} /> : <CheckCircle className="text-primary" size={32} />}
                </div>
                <h3 className="text-2xl font-bold text-textMain mb-2 tracking-tight">{confirmConfig.title}</h3>
                <p className="text-textMuted text-sm leading-relaxed mb-8">{confirmConfig.message}</p>
                
                <div className="flex gap-3">
                  {confirmConfig.onConfirm ? (
                    <>
                      <button 
                        onClick={() => setIsConfirmModalOpen(false)}
                        className="flex-1 py-4 bg-background border border-borderSubtle text-textMuted hover:text-textMain rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => {
                          confirmConfig.onConfirm();
                          setIsConfirmModalOpen(false);
                        }}
                        className="flex-1 py-4 bg-primary text-textMain rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
                      >
                        Confirm
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => setIsConfirmModalOpen(false)}
                      className="w-full py-4 bg-primary text-textMain rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
                    >
                      Got it
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LeadsTracker;
