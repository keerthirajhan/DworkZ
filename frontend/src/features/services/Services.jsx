import React, { useState } from 'react';
import { Wrench, AlertCircle, Clock, CheckCircle, Plus } from 'lucide-react';

const initialRequests = [
  { id: 'SR-101', client: 'TechNova', workspace: 'Cabin 4', issue: 'Internet very slow', type: 'IT Support', status: 'Pending', assignedTo: 'Unassigned' },
  { id: 'SR-102', client: 'Acme Corp', workspace: 'Desk 8', issue: 'Spilled coffee, need cleaning', type: 'Housekeeping', status: 'In Progress', assignedTo: 'John (Staff)' },
  { id: 'SR-103', client: 'Freelance Hub', workspace: 'Meeting Rm 2', issue: 'Projector not turning on', type: 'Maintenance', status: 'Completed', assignedTo: 'Mike (Staff)' },
];

const Services = () => {
  const [requests] = useState(initialRequests);

  const getStatusBadge = (status) => {
    switch(status) {
      case 'Completed': return <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-medium flex items-center gap-1.5 w-max"><CheckCircle size={14}/> Completed</span>;
      case 'In Progress': return <span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-xs font-medium flex items-center gap-1.5 w-max"><Clock size={14}/> In Progress</span>;
      case 'Pending': return <span className="px-3 py-1 bg-orange-500/10 text-orange-400 rounded-full text-xs font-medium flex items-center gap-1.5 w-max"><AlertCircle size={14}/> Pending</span>;
      default: return null;
    }
  };

  return (
    <div className="p-8 w-full max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Staff & Services
          </h1>
          <p className="text-textMuted mt-1">Manage maintenance, IT, and housekeeping requests.</p>
        </div>
        <button className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-lg font-medium transition-all shadow-lg shadow-primary/25 flex items-center gap-2">
          <Plus size={18} /> New Request
        </button>
      </div>

      <div className="bg-surface border border-borderSubtle rounded-2xl overflow-hidden shadow-xl mt-8">
        <table className="w-full text-left text-sm text-textMain">
          <thead className="bg-background/50 border-b border-borderSubtle text-textMuted">
            <tr>
              <th className="px-6 py-4 font-medium">Ticket ID</th>
              <th className="px-6 py-4 font-medium">Client / Workspace</th>
              <th className="px-6 py-4 font-medium">Issue</th>
              <th className="px-6 py-4 font-medium">Type</th>
              <th className="px-6 py-4 font-medium">Assigned To</th>
              <th className="px-6 py-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borderSubtle">
            {requests.map(req => (
              <tr key={req.id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 font-medium text-white">{req.id}</td>
                <td className="px-6 py-4">
                  <div className="text-white">{req.client}</div>
                  <div className="text-textMuted text-xs mt-0.5">{req.workspace}</div>
                </td>
                <td className="px-6 py-4 text-textMuted max-w-xs truncate">{req.issue}</td>
                <td className="px-6 py-4">
                  <span className="bg-background border border-borderSubtle px-2.5 py-1 rounded text-xs text-textMuted">{req.type}</span>
                </td>
                <td className="px-6 py-4 text-textMuted">{req.assignedTo}</td>
                <td className="px-6 py-4">{getStatusBadge(req.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Services;
