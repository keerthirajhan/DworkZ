const express = require('express');
const { getUtilization } = require('../controllers/utilizationController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', protect, getUtilization);

module.exports = router;
