const express = require('express');
const { getActivities, createActivity, clearAllActivities } = require('../controllers/activityController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);
router.route('/').get(getActivities).post(createActivity).delete(clearAllActivities);

module.exports = router;
