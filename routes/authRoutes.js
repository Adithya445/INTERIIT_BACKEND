const express = require('express');
const router = express.Router();
const { register, login, getCurrentUser, logout, verifyOtp } = require('../controllers/authController');
const { auth } = require('../middleware/auth');

// Auth routes
router.post('/register', register);
router.post('/verify-otp', verifyOtp); // Add the new verification route
router.post('/login', login);
router.get('/me', auth, getCurrentUser);
router.post('/logout', logout);

module.exports = router;
