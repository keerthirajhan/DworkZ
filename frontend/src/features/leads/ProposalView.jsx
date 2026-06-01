import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { FileText, Download, CheckCircle, Clock, MapPin, Mail, Phone, Building } from 'lucide-react';
import { motion } from 'framer-motion';

const ProposalView = () => {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProposal = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const res = await axios.get(`${API_URL}/api/v1/clients/public/proposal/${id}`);
        setClient(res.data.data);
      } catch (err) {
        setError("Proposal not found or has expired.");
      } finally {
        setLoading(false);
      }
    };
    fetchProposal();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (error || !client) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500 mb-6">
        <FileText size={40} />
      </div>
      <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-2">Access Denied</h1>
      <p className="text-slate-500 max-w-md">{error || "This proposal link is no longer active."}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-primary selection:text-white p-4 md:p-12">
      <div className="max-w-4xl mx-auto bg-white border border-slate-200 shadow-2xl rounded-3xl overflow-hidden flex flex-col p-8 md:p-16">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-12">
          <div>
            <div className="flex items-center mb-2">
              <h1 className="text-4xl font-bold text-primary tracking-tight">DworkZ</h1>
              <span className="w-2 h-2 bg-primary rounded-full mt-4"></span>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">GST No. 33AAZFD3031H1ZG</p>
          </div>
          <div className="text-left md:text-right space-y-1">
            <p className="text-xs font-bold text-slate-600">Address: TV Swamy Road, R S Puram, Coimbatore</p>
            <p className="text-xs font-bold text-slate-600">Contact: +91 9442944363 |</p>
          </div>
        </div>

        <div className="h-px bg-slate-100 w-full mb-12"></div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-12 mb-16">
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4">Proposal For:</h3>
            <p className="text-xl font-bold text-slate-900">{client.name}</p>
            <p className="text-lg font-bold text-slate-700">{client.companyName || 'ASD'}</p>
            <p className="text-sm font-medium text-slate-500">{client.contactEmail}</p>
          </div>
          <div className="text-right">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-1">Date:</h3>
            <p className="text-xl font-bold text-slate-900">{new Date().toLocaleDateString('en-IN')}</p>
          </div>
        </div>

        {/* Intro */}
        <div className="space-y-4 mb-16">
          <p className="text-lg font-bold text-slate-900">Dear Partner,</p>
          <p className="text-slate-600 leading-relaxed max-w-2xl">
            Thank you for choosing DworkZ. We are pleased to provide workspace details and pricing tailored for your team. Our facilities are designed to boost productivity and collaboration.
          </p>
        </div>

        {/* Pricing Table */}
        <div className="rounded-2xl border border-slate-200 overflow-hidden mb-16 shadow-sm">
          <div className="grid grid-cols-4 bg-primary p-5">
            <span className="text-xs font-black text-white uppercase tracking-widest">Workspace Type</span>
            <span className="text-xs font-black text-white uppercase tracking-widest text-center">Seats</span>
            <span className="text-xs font-black text-white uppercase tracking-widest text-right">Rate/Seat</span>
            <span className="text-xs font-black text-white uppercase tracking-widest text-right">Total</span>
          </div>
          <div className="grid grid-cols-4 p-6 bg-white items-center">
            <span className="text-lg font-bold text-slate-900">{client.workspaceType}</span>
            <span className="text-lg font-bold text-slate-500 text-center">{client.seats}</span>
            <span className="text-lg font-bold text-slate-500 text-right">Rs. {Number(client.rentAmount).toLocaleString()}</span>
            <span className="text-xl font-black text-slate-900 text-right">Rs. {Number(client.rentAmount).toLocaleString()}</span>
          </div>
        </div>

        {/* Terms */}
        <div className="mb-16">
          <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">Terms & Conditions:</h4>
          <ul className="space-y-3">
            {[
              "A security deposit equivalent to 3 months' rent is required upon confirmation.",
              "An additional 18% GST will apply to the agreed rental amount."
            ].map((term, i) => (
              <li key={i} className="text-sm text-slate-600 flex items-start gap-3">
                <span className="text-primary mt-1.5">•</span>
                {term}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="mt-auto space-y-12">
          <div>
            <h3 className="text-xl font-black text-slate-900">Thank you for your business!</h3>
            <p className="text-sm italic font-medium text-slate-400 mt-2">
              This is system generated document & does not require signature.
            </p>
          </div>

          <div className="flex gap-4">
            <button className="flex-1 bg-primary text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-teal-600 transition-all shadow-lg shadow-primary/20">
              Accept Proposal
            </button>
            <button className="px-10 bg-slate-100 text-slate-900 py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all flex items-center gap-2">
              <Download size={16} /> Download PDF
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProposalView;
