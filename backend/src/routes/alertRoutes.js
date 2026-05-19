const express = require('express');
const { getSmartAlerts } = require('../controllers/alertController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);
router.route('/').get(getSmartAlerts);

module.exports = router;
