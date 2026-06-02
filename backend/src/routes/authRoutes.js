const express = require('express');
const { 
  register, 
  login, 
  getMe, 
  refreshToken, 
  updatePassword, 
  forceResetPassword,
  getUsers,
  createUser,
  deleteUser
} = require('../controllers/authController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/refresh', refreshToken);
router.put('/updatepassword', protect, updatePassword);
router.post('/force-reset-password', protect, forceResetPassword);

// User Management Routes (Admin only)
router.get('/users', protect, authorize('admin'), getUsers);
router.post('/users', protect, authorize('admin'), createUser);
router.delete('/users/:id', protect, authorize('admin'), deleteUser);

module.exports = router;

