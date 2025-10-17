const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
  },
  avatar: {
    type: String,
    required: [true, 'Avatar is required'],
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  // --- NEW FIELDS FOR OTP VERIFICATION ---
  isVerified: {
    type: Boolean,
    default: false,
  },
  otp: {
    type: String,
  },
  otpExpires: {
    type: Date,
  },
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
