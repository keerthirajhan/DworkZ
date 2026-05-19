const express = require('express');
const { register, login, getMe, refreshToken, updatePassword } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/refresh', refreshToken);
router.put('/updatepassword', protect, updatePassword);

module.exports = router;
