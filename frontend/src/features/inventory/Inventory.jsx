import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Package, CreditCard, ArrowDownToLine, Trash2, Edit3, CheckCircle, AlertTriangle, X, ShieldAlert, Printer, Eye, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const Inventory = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [selectedItem, setSelectedItem] = useState(null);
  
  // Deletion State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    itemName: '',
    purchasedQuantity: 0,
    inHandQuantity: 0,
    totalCost: 0,
    vendorDetails: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    paymentStatus: 'Paid',
    paymentMethod: 'Cash',
    billCopyUrl: ''
  });

  const [notification, setNotification] = useState(null);
  const printRef = useRef();
  const singleItemPrintRef = useRef();
  const [selectedItemForPrint, setSelectedItemForPrint] = useState(null);

  const handlePrint = () => {
    const printContent = printRef.current.innerHTML;
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = printContent;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload(); // Refresh to restore React state
  };

  const handlePrintItem = (item) => {
    setSelectedItemForPrint(item);
    setTimeout(() => {
      const printContent = singleItemPrintRef.current.innerHTML;
      const originalContent = document.body.innerHTML;
      document.body.innerHTML = printContent;
      window.print();
      document.body.innerHTML = originalContent;
      window.location.reload();
    }, 50);
  };

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('dworkz_token');
      const res = await axios.get('http://localhost:5000/api/v1/inventory', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setItems(res.data.data);
    } catch (err) {
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const showNotify = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleOpenModal = (mode, item = null) => {
    setModalMode(mode);
    if (mode === 'edit' && item) {
      setSelectedItem(item);
      setFormData({
        itemName: item.itemName,
        purchasedQuantity: item.purchasedQuantity,
        inHandQuantity: item.inHandQuantity,
        totalCost: item.totalCost ? Number(item.totalCost) : Number(item.unitPrice * item.purchasedQuantity) || 0,
        vendorDetails: item.vendorDetails,
        purchaseDate: new Date(item.purchaseDate).toISOString().split('T')[0],
        paymentStatus: item.paymentStatus,
        paymentMethod: item.paymentMethod || 'N/A',
        billCopyUrl: item.billCopyUrl || ''
      });
    } else {
      setSelectedItem(null);
      setFormData({
        itemName: '',
        purchasedQuantity: '',
        inHandQuantity: '',
        totalCost: '',
        vendorDetails: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        paymentStatus: 'Paid',
        paymentMethod: 'Cash',
        billCopyUrl: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('dworkz_token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const cleanedData = {
        ...formData,
        purchasedQuantity: formData.purchasedQuantity === '' ? 0 : Number(formData.purchasedQuantity),
        inHandQuantity: formData.inHandQuantity === '' ? 0 : Number(formData.inHandQuantity),
        totalCost: formData.totalCost === '' ? 0 : Number(formData.totalCost)
      };
      
      if (modalMode === 'add') {
        await axios.post('http://localhost:5000/api/v1/inventory', cleanedData, { headers });
        showNotify('Item added to inventory successfully');
      } else {
        await axios.put(`http://localhost:5000/api/v1/inventory/${selectedItem._id}`, cleanedData, { headers });
        showNotify('Inventory item updated successfully');
      }
      
      setIsModalOpen(false);
      fetchInventory();
    } catch (err) {
      showNotify(err.response?.data?.error || 'Operation failed', 'error');
    }
  };

  const confirmDelete = (item) => {
    setItemToDelete(item);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      const token = localStorage.getItem('dworkz_token');
      await axios.delete(`http://localhost:5000/api/v1/inventory/${itemToDelete._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showNotify('Item removed from inventory');
      setShowDeleteConfirm(false);
      setItemToDelete(null);
      fetchInventory();
    } catch (err) {
      showNotify('Delete failed', 'error');
    }
  };

  const handleViewBill = (billUrl) => {
    if (!billUrl) return;
    try {
      const isPdf = billUrl.startsWith('data:application/pdf');
      const win = window.open("");
      if (win) {
        win.document.write(
          isPdf 
            ? `<iframe width='100%' height='100%' style='border:0;top:0;left:0;bottom:0;right:0;position:fixed;' src='${billUrl}'></iframe>`
            : `<div style='display:flex;justify-content:center;align-items:center;min-height:100vh;background:#0f172a;margin:0;'><img src='${billUrl}' style='max-width:100%;max-height:100vh;object-fit:contain;' /></div>`
        );
        win.document.title = "View Bill Copy";
        win.document.close();
      } else {
        showNotify('Popup blocked! Please allow popups to view the bill.', 'warning');
      }
    } catch (e) {
      console.error(e);
      showNotify('Failed to open document preview', 'error');
    }
  };

  const filteredItems = items.filter(i => i.itemName.toLowerCase().includes(searchTerm.toLowerCase()));

  const isItemLowStock = (item) => {
    if (item.purchasedQuantity <= 0) return false;
    return (item.inHandQuantity / item.purchasedQuantity) <= 0.25;
  };

  const totalItemsCount = items.length;
  const lowStockCount = items.filter(isItemLowStock).length;
  const pendingPayments = items.filter(i => i.paymentStatus === 'Credit').reduce((acc, curr) => acc + Number(curr.totalCost || (curr.unitPrice * curr.purchasedQuantity) || 0), 0);

  return (
    <div className="p-8 w-full max-w-7xl mx-auto space-y-8 relative">
      
      {/* Notifications */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -100, opacity: 0 }} 
            className={`fixed top-8 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border ${notification.type === 'error' ? 'bg-rose-500/10 border-rose-500/50 text-rose-500' : 'bg-primary/10 border-primary/50 text-primary'} backdrop-blur-xl`}
          >
            {notification.type === 'error' ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
            <span className="font-bold text-sm">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-textMain uppercase tracking-tight">Inventory Management</h1>
          <p className="text-textMuted mt-1">Efficiently track office supplies, stock levels, and vendor payments.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={handlePrint}
            className="bg-background border border-borderSubtle hover:bg-white/5 text-textMain px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-sm flex items-center gap-2"
          >
            <Printer size={16} /> Print Report
          </button>
          <button 
            onClick={() => handleOpenModal('add')}
            className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-primary/25 flex items-center gap-2"
          >
            <Plus size={16} /> Add New Item
          </button>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div ref={printRef} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-surface border border-borderSubtle p-8 rounded-[32px] flex items-center gap-6 shadow-xl">
          <div className="w-14 h-14 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center"><Package size={28} /></div>
          <div><p className="text-[10px] font-black uppercase tracking-widest text-textMuted mb-1">Total Assets</p><p className="text-3xl font-black text-textMain">{totalItemsCount}</p></div>
        </div>
        <div className="bg-surface border border-borderSubtle p-8 rounded-[32px] flex items-center gap-6 shadow-xl">
          <div className="w-14 h-14 bg-orange-500/10 text-orange-400 rounded-2xl flex items-center justify-center"><ArrowDownToLine size={28} /></div>
          <div><p className="text-[10px] font-black uppercase tracking-widest text-textMuted mb-1">Low Stock</p><p className="text-3xl font-black text-textMain">{lowStockCount}</p></div>
        </div>
        <div className="bg-surface border border-borderSubtle p-8 rounded-[32px] flex items-center gap-6 shadow-xl">
          <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center"><CreditCard size={28} /></div>
          <div><p className="text-[10px] font-black uppercase tracking-widest text-textMuted mb-1">Unpaid Credits</p><p className="text-3xl font-black text-textMain">₹{pendingPayments.toLocaleString()}</p></div>
        </div>
      </div>

      <div className="relative max-w-lg group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted group-focus-within:text-primary transition-colors" size={20} />
        <input 
          type="text" 
          placeholder="Search items by name..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-surface border border-borderSubtle text-sm rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-lg font-bold text-textMain" 
        />
      </div>

      <div className="bg-surface border border-borderSubtle rounded-[32px] overflow-hidden shadow-2xl">
        <table className="w-full text-left text-sm text-textMain">
          <thead className="bg-background/50 border-b border-borderSubtle text-textMuted uppercase font-black tracking-widest text-[10px]">
            <tr>
              <th className="px-8 py-6">Item Specification</th>
              <th className="px-8 py-6">Stock Status</th>
              <th className="px-8 py-6">Vendor & Purchase</th>
              <th className="px-8 py-6">Payment</th>
              <th className="px-8 py-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borderSubtle/30">
            {loading ? (
              <tr><td colSpan={5} className="px-8 py-12 text-center text-textMuted font-black uppercase tracking-widest text-[10px]">Loading Inventory Database...</td></tr>
            ) : filteredItems.length === 0 ? (
              <tr><td colSpan={5} className="px-8 py-12 text-center text-textMuted">No inventory items found.</td></tr>
            ) : filteredItems.map(item => (
              <tr key={item._id} className="hover:bg-white/5 transition-all group">
                <td className="px-8 py-6">
                   <div className="font-bold text-textMain text-base">{item.itemName}</div>
                   <div className="flex gap-2 items-center mt-0.5">
                      <span className="text-[10px] uppercase font-black text-textMuted tracking-widest">ID: {item.itemId || item._id.slice(-6)}</span>
                      <span className="w-1 h-1 bg-textMuted/30 rounded-full"></span>
                      <span className="text-[10px] uppercase font-black text-primary tracking-widest font-bold">Total: ₹{Number(item.totalCost || (item.unitPrice * item.purchasedQuantity) || 0).toLocaleString()}</span>
                   </div>
                </td>
                <td className="px-8 py-6">
                   <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1">
                         <span className={isItemLowStock(item) ? 'text-orange-400' : 'text-textMuted'}>Availability</span>
                         <span className="text-textMain">{item.purchasedQuantity > 0 ? Math.round((item.inHandQuantity / item.purchasedQuantity) * 100) : 0}%</span>
                      </div>
                      <div className="w-32 h-1.5 bg-background rounded-full overflow-hidden border border-borderSubtle">
                         <div 
                           className={`h-full rounded-full transition-all duration-1000 ${isItemLowStock(item) ? 'bg-orange-500' : 'bg-primary'}`} 
                           style={{ width: `${item.purchasedQuantity > 0 ? (item.inHandQuantity / item.purchasedQuantity) * 100 : 0}%` }}
                         ></div>
                      </div>
                      <div className="text-[10px] font-black text-textMuted mt-1 uppercase tracking-widest">{item.inHandQuantity} / {item.purchasedQuantity} UNITS</div>
                   </div>
                </td>
                 <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                       <span className="font-bold text-textMain">{item.vendorDetails}</span>
                        {item.billCopyUrl && (
                           <div className="flex items-center gap-1.5">
                              <button 
                                type="button"
                                onClick={() => handleViewBill(item.billCopyUrl)}
                                className="p-1 text-primary hover:text-white bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-md transition-all flex items-center justify-center cursor-pointer" 
                                title="View Bill Copy"
                              >
                                 <Eye size={12} />
                              </button>
                              <a 
                                href={item.billCopyUrl} 
                                download={`Bill_${item.itemName.replace(/\s+/g, '_')}_${item.itemId || item._id.slice(-6)}`}
                                className="p-1 text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-md transition-all flex items-center justify-center" 
                                title="Download Bill Copy"
                              >
                                 <Download size={12} />
                              </a>
                           </div>
                        )}
                    </div>
                    <div className="text-[10px] uppercase font-black text-primary/60 mt-0.5 tracking-widest">{new Date(item.purchaseDate).toLocaleDateString()}</div>
                 </td>
                <td className="px-8 py-6">
                  <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${item.paymentStatus === 'Paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                    {item.paymentStatus} {item.paymentMethod !== 'N/A' ? `(${item.paymentMethod})` : ''}
                  </span>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex justify-end gap-2">
                     <button onClick={() => handlePrintItem(item)} className="p-2.5 bg-background border border-borderSubtle rounded-xl text-textMuted hover:text-emerald-500 hover:border-emerald-500 transition-all" title="Print Asset Voucher"><Printer size={16} /></button>
                     <button onClick={() => handleOpenModal('edit', item)} className="p-2.5 bg-background border border-borderSubtle rounded-xl text-textMuted hover:text-primary hover:border-primary transition-all"><Edit3 size={16} /></button>
                     <button onClick={() => confirmDelete(item)} className="p-2.5 bg-background border border-borderSubtle rounded-xl text-textMuted hover:text-rose-500 hover:border-rose-500 transition-all"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>

      {/* Main Form Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-surface border border-borderSubtle rounded-[32px] p-10 w-full max-w-xl shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
              <h2 className="text-2xl font-black uppercase tracking-tight mb-8 flex items-center gap-3 text-textMain">
                 <div className="p-2 bg-primary/20 rounded-xl text-primary"><Package size={20} /></div>
                 {modalMode === 'add' ? 'New Inventory Entry' : 'Update Item Details'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase text-textMuted tracking-widest ml-1">Item Designation</label>
                     <input 
                       required
                       type="text" 
                       value={formData.itemName}
                       onChange={(e) => setFormData({...formData, itemName: e.target.value})}
                       className="w-full bg-background/50 border border-borderSubtle rounded-2xl px-4 py-3 text-sm font-bold text-textMain focus:border-primary focus:outline-none transition-all" 
                       placeholder="e.g. Printer Paper A4"
                     />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase text-textMuted tracking-widest ml-1">Vendor Details</label>
                     <input 
                       required
                       type="text" 
                       value={formData.vendorDetails}
                       onChange={(e) => setFormData({...formData, vendorDetails: e.target.value})}
                       className="w-full bg-background/50 border border-borderSubtle rounded-2xl px-4 py-3 text-sm font-bold text-textMain focus:border-primary focus:outline-none transition-all" 
                       placeholder="e.g. Office Depot"
                     />
                   </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-textMuted tracking-widest ml-1">Total Units</label>
                    <input 
                      required
                      type="number" 
                      onWheel={(e) => e.target.blur()} 
                      value={formData.purchasedQuantity || ''}
                      onChange={(e) => setFormData({...formData, purchasedQuantity: e.target.value, inHandQuantity: modalMode === 'add' ? e.target.value : formData.inHandQuantity})}
                      className="w-full bg-background/50 border border-borderSubtle rounded-2xl px-4 py-3 text-sm font-bold text-textMain focus:border-primary focus:outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-textMuted tracking-widest ml-1">In-Hand</label>
                    <input 
                      required
                      type="number" 
                      onWheel={(e) => e.target.blur()} 
                      value={formData.inHandQuantity || ''}
                      onChange={(e) => setFormData({...formData, inHandQuantity: e.target.value})}
                      className="w-full bg-background/50 border border-borderSubtle rounded-2xl px-4 py-3 text-sm font-bold text-textMain focus:border-primary focus:outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-textMuted tracking-widest ml-1">Total Amount (₹)</label>
                    <input 
                      required
                      type="number" 
                      onWheel={(e) => e.target.blur()} 
                      value={formData.totalCost || ''}
                      onChange={(e) => setFormData({...formData, totalCost: e.target.value})}
                      className="w-full bg-background/50 border border-borderSubtle rounded-2xl px-4 py-3 text-sm font-bold text-textMain focus:border-primary focus:outline-none transition-all" 
                    />
                  </div>
                </div>

                <div className="space-y-4 bg-background/50 border border-borderSubtle p-6 rounded-3xl">
                   <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black uppercase text-textMuted tracking-widest">Financial Status</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 text-xs font-bold cursor-pointer group">
                           <input type="radio" name="pay" checked={formData.paymentStatus === 'Paid'} onChange={() => setFormData({...formData, paymentStatus: 'Paid'})} className="accent-primary"/> 
                           <span className={formData.paymentStatus === 'Paid' ? 'text-primary' : 'text-textMuted'}>PAID</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs font-bold cursor-pointer group">
                           <input type="radio" name="pay" checked={formData.paymentStatus === 'Credit'} onChange={() => setFormData({...formData, paymentStatus: 'Credit'})} className="accent-primary"/> 
                           <span className={formData.paymentStatus === 'Credit' ? 'text-rose-500' : 'text-textMuted'}>ON CREDIT</span>
                        </label>
                      </div>
                   </div>
                   
                   {formData.paymentStatus === 'Paid' && (
                     <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="pt-4 border-t border-borderSubtle/50 space-y-2">
                        <label className="text-[10px] font-black uppercase text-textMuted tracking-widest ml-1">Payment Channel</label>
                        <select 
                          value={formData.paymentMethod}
                          onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                          className="w-full bg-background/50 border border-borderSubtle rounded-2xl px-4 py-3 text-sm font-bold text-textMain focus:border-primary focus:outline-none transition-all appearance-none cursor-pointer"
                        >
                          <option>Cash</option>
                          <option>GPay</option>
                          <option>Bank Transfer</option>
                        </select>
                     </motion.div>
                   )}
                </div>

                <div className="space-y-2 bg-background/50 border border-borderSubtle p-6 rounded-3xl">
                    <label className="text-[10px] font-black uppercase text-textMuted tracking-widest ml-1">Upload Bill Copy (Optional)</label>
                    <div className="flex flex-col gap-4">
                      <label className="flex flex-col items-center justify-center border border-dashed border-borderSubtle hover:border-primary rounded-2xl p-4 cursor-pointer transition-colors bg-background/20 group">
                        <span className="text-xs text-textMuted group-hover:text-primary font-bold transition-colors">
                          {formData.billCopyUrl ? '📄 Bill Uploaded (Click to change)' : '📁 Choose Bill PDF or Image'}
                        </span>
                        <input 
                          type="file" 
                          accept="image/*,application/pdf" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setFormData({ ...formData, billCopyUrl: reader.result });
                              };
                              reader.readAsDataURL(file);
                            }
                          }} 
                        />
                      </label>
                      {formData.billCopyUrl && (
                        <div className="flex flex-wrap gap-2 justify-end">
                          <button
                             type="button"
                             onClick={() => handleViewBill(formData.billCopyUrl)}
                             className="flex-1 py-3 px-4 bg-primary/10 text-primary border border-primary/20 rounded-2xl hover:bg-primary hover:text-white transition-all text-xs font-black uppercase tracking-wider text-center flex items-center justify-center gap-1.5"
                           >
                             <Eye size={14} /> View
                           </button>
                          <a
                            href={formData.billCopyUrl}
                            download={`Bill_${formData.itemName || 'Item'}`}
                            className="flex-1 py-3 px-4 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all text-xs font-black uppercase tracking-wider text-center flex items-center justify-center gap-1.5"
                          >
                            <Download size={14} /> Download
                          </a>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, billCopyUrl: '' })}
                            className="py-3 px-4 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-2xl hover:bg-rose-500 hover:text-white transition-all text-xs font-black uppercase tracking-wider text-center flex items-center justify-center gap-1.5"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                <div className="pt-6 flex justify-end gap-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-textMuted hover:text-textMain transition-colors">Cancel</button>
                  <button type="submit" className="bg-primary hover:bg-primary/90 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-primary/20">
                     {modalMode === 'add' ? 'Commit Entry' : 'Update Record'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-surface border border-rose-500/50 rounded-[32px] p-10 max-w-sm w-full shadow-2xl text-center">
              <div className="w-20 h-20 rounded-[28px] bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-8 shadow-inner shadow-rose-500/20">
                 <ShieldAlert size={40} />
              </div>
              <h3 className="text-2xl font-black text-textMain mb-3 uppercase tracking-tight">Security Check</h3>
              <p className="text-sm text-textMuted mb-10 leading-relaxed font-medium">You are about to permanently remove <span className="text-rose-500 font-bold">"{itemToDelete?.itemName}"</span> from the inventory. This action is irreversible.</p>
              <div className="flex gap-4">
                <button 
                  onClick={handleDelete} 
                  className="flex-1 bg-rose-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20 active:scale-95"
                >
                  Confirm Delete
                </button>
                <button 
                  onClick={() => { setShowDeleteConfirm(false); setItemToDelete(null); }} 
                  className="flex-1 bg-background border border-borderSubtle text-textMain py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/5 transition-all active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Hidden Single Item Print Template */}
      <div className="hidden">
        <div ref={singleItemPrintRef} className="p-10 font-sans text-black bg-white w-[800px]">
          {selectedItemForPrint && (
            <div className="border-2 border-black p-8 rounded-2xl relative">
               <div className="absolute top-8 right-8 text-right">
                  <div className="text-3xl font-black uppercase tracking-tight">ASSET VOUCHER</div>
                  <div className="text-sm font-bold mt-1 tracking-widest text-gray-500">ID: {selectedItemForPrint.itemId || selectedItemForPrint._id.slice(-6)}</div>
               </div>
               
               <div className="mb-12">
                 <h1 className="text-4xl font-black uppercase tracking-tight">{selectedItemForPrint.itemName}</h1>
                 <p className="text-gray-500 font-bold uppercase tracking-widest mt-2">{new Date(selectedItemForPrint.purchaseDate).toLocaleDateString()}</p>
               </div>

               <div className="grid grid-cols-2 gap-8 mb-12">
                 <div className="p-6 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Vendor Details</div>
                    <div className="text-lg font-bold text-black">{selectedItemForPrint.vendorDetails}</div>
                 </div>
                 <div className="p-6 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Financial Status</div>
                    <div className="text-lg font-bold text-black">{selectedItemForPrint.paymentStatus} {selectedItemForPrint.paymentMethod !== 'N/A' ? `(${selectedItemForPrint.paymentMethod})` : ''}</div>
                 </div>
               </div>

               <table className="w-full text-left mb-8">
                 <thead>
                   <tr className="border-b-2 border-black text-xs font-black uppercase tracking-widest text-gray-500">
                     <th className="py-4">Description</th>
                     <th className="py-4 text-center">Purchased</th>
                     <th className="py-4 text-center">In-Hand</th>
                     <th className="py-4 text-right">Total Amount</th>
                   </tr>
                 </thead>
                 <tbody>
                   <tr className="border-b border-gray-200 font-bold">
                     <td className="py-6">{selectedItemForPrint.itemName}</td>
                     <td className="py-6 text-center">{selectedItemForPrint.purchasedQuantity} UNITS</td>
                     <td className="py-6 text-center">{selectedItemForPrint.inHandQuantity} UNITS</td>
                     <td className="py-6 text-right">₹{Number(selectedItemForPrint.totalCost || (selectedItemForPrint.unitPrice * selectedItemForPrint.purchasedQuantity) || 0).toLocaleString()}</td>
                   </tr>
                 </tbody>
               </table>

               <div className="flex justify-between items-end border-t-2 border-black pt-8 mt-16">
                 <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Authorized Signature</div>
                 <div className="text-right">
                    <div className="text-sm font-black uppercase tracking-widest text-gray-500 mb-2">Grand Total</div>
                    <div className="text-3xl font-black">₹{Number(selectedItemForPrint.totalCost || (selectedItemForPrint.unitPrice * selectedItemForPrint.purchasedQuantity) || 0).toLocaleString()}</div>
                 </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Inventory;
