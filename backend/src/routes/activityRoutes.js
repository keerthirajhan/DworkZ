const express = require('express');
const { getActivities, createActivity, clearAllActivities } = require('../controllers/activityController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);
router.route('/').get(getActivities).post(createActivity).delete(authorize('admin'), clearAllActivities);

module.exports = router;
