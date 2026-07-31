const Inventory = require('../models/Inventory');

// @desc    Get all active inventory items
// @route   GET /api/v1/inventory
// @access  Private
exports.getInventory = async (req, res) => {
  try {
    const items = await Inventory.find({ isArchived: { $ne: true } }).sort('-purchaseDate').populate({
      path: 'addedBy',
      select: 'name'
    });
    res.status(200).json({ success: true, count: items.length, data: items });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};

// @desc    Get all archived inventory items
// @route   GET /api/v1/inventory/archived
// @access  Private
exports.getArchivedInventory = async (req, res) => {
  try {
    console.log('Fetching archived inventory...');
    const items = await Inventory.find({ isArchived: true }).sort('-archivedAt').populate({
      path: 'addedBy',
      select: 'name'
    });
    console.log(`Found ${items.length} archived items`);
    res.status(200).json({ success: true, count: items.length, data: items });
  } catch (err) { 
    console.error('Fetch archive failed:', err);
    res.status(400).json({ success: false, error: err.message }); 
  }
};

// @desc    Add a new inventory item
// @route   POST /api/v1/inventory
// @access  Private
exports.addInventoryItem = async (req, res) => {
  try {
    req.body.addedBy = req.user.id;
    
    const count = await Inventory.countDocuments();
    req.body.itemId = `INV-${String(count + 1).padStart(4, '0')}`;
    
    if (req.body.purchasedQuantity && req.body.totalCost) {
      req.body.unitPrice = req.body.totalCost / req.body.purchasedQuantity;
    } else if (req.body.purchasedQuantity && req.body.unitPrice) {
      req.body.totalCost = req.body.purchasedQuantity * req.body.unitPrice;
    }

    if (req.body.purchasedQuantity && !req.body.inHandQuantity) {
      req.body.inHandQuantity = req.body.purchasedQuantity;
    }
    
    const item = await Inventory.create(req.body);
    global.io?.emit('bookingUpdated');
    res.status(201).json({ success: true, data: item });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};

// @desc    Update an inventory item
// @route   PUT /api/v1/inventory/:id
// @access  Private
exports.updateInventoryItem = async (req, res) => {
  try {
    if (req.body.purchasedQuantity && req.body.totalCost) {
      req.body.unitPrice = req.body.totalCost / req.body.purchasedQuantity;
    } else if (req.body.purchasedQuantity && req.body.unitPrice) {
      req.body.totalCost = req.body.purchasedQuantity * req.body.unitPrice;
    }

    const item = await Inventory.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }
    global.io?.emit('bookingUpdated');
    res.status(200).json({ success: true, data: item });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};

// @desc    Soft delete (archive) an inventory item
// @route   DELETE /api/v1/inventory/:id
// @access  Private
exports.deleteInventoryItem = async (req, res) => {
  try {
    console.log(`Archiving inventory item: ${req.params.id}`);
    const item = await Inventory.findByIdAndUpdate(req.params.id, {
      isArchived: true,
      archivedAt: Date.now()
    }, { new: true });

    if (!item) {
      console.log('Item not found for archiving');
      return res.status(404).json({ success: false, error: 'Item not found' });
    }
    console.log('Item successfully moved to archives');
    res.status(200).json({ success: true, data: {} });
  } catch (err) { 
    console.error('Archive operation failed:', err);
    res.status(400).json({ success: false, error: err.message }); 
  }
};

// @desc    Restore an archived inventory item
// @route   PUT /api/v1/inventory/:id/restore
// @access  Private
exports.restoreInventoryItem = async (req, res) => {
  try {
    const item = await Inventory.findByIdAndUpdate(req.params.id, {
      isArchived: false,
      archivedAt: null
    }, { new: true });

    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }
    res.status(200).json({ success: true, data: item });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Permanently delete an inventory item
// @route   DELETE /api/v1/inventory/:id/permanent
// @access  Private
exports.deleteInventoryPermanent = async (req, res) => {
  try {
    const item = await Inventory.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};
