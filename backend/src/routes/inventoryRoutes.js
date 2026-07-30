const express = require('express');
const { 
  getInventory, 
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem 
} = require('../controllers/inventoryController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(authorize('admin', 'staff'), getInventory)
  .post(authorize('admin', 'staff'), addInventoryItem);

router.route('/:id')
  .put(authorize('admin', 'staff'), updateInventoryItem)
  .delete(authorize('admin', 'staff'), deleteInventoryItem);

module.exports = router;
