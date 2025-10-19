const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const otpGenerator = require('otp-generator');
const mailSender = require('../utils/mailSender');

const rawDomains = process.env.ALLOWED_DOMAINS || "";
const ALLOWED_DOMAINS = rawDomains.split(',').map(domain => domain.trim());

console.log("✅ Server configured with allowed domains:", ALLOWED_DOMAINS);


exports.register = async (req, res) => {
  try {
    // Expect a new field 'isAdminRegister' from the frontend
    const { name, email, password, avatar, isAdminRegister } = req.body;

    if (!name || !email || !password || !avatar) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    // --- UPDATED: More Secure Admin Check ---
    let isAdmin = false;
    // Check if the user intended to register as admin AND provided the correct password
    if (isAdminRegister && password === '123456') {
        isAdmin = true;
    }

    const emailDomain = email.split('@')[1];
    if (!ALLOWED_DOMAINS.includes(emailDomain)) {
        return res.status(400).json({ success: false, message: `Email domain '${emailDomain}' is not allowed.` });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser.isVerified) {
      return res.status(409).json({ success: false, message: 'User already exists with this email' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const otp = otpGenerator.generate(6, { 
        upperCaseAlphabets: false, 
        lowerCaseAlphabets: false, 
        specialChars: false 
    });

    const hashedOtp = await bcrypt.hash(otp, 10);
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    if (existingUser) {
        existingUser.password = hashedPassword;
        existingUser.avatar = avatar;
        existingUser.otp = hashedOtp;
        existingUser.otpExpires = otpExpires;
        existingUser.isAdmin = isAdmin;
        await existingUser.save();
    } else {
        await User.create({
            name, email, password: hashedPassword, avatar,
            otp: hashedOtp, otpExpires, isAdmin
        });
    }

    await mailSender(email, 'Verification Code for Inter IIT Tech 14.0', `<p>Your OTP is: <strong>${otp}</strong>. It is valid for 10 minutes.</p>`);

    res.status(201).json({ success: true, message: 'OTP sent successfully. Please check your email.' });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Error registering user' });
  }
};

// --- Other functions (verifyOtp, login, etc.) remain unchanged ---
exports.verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ success: false, message: 'Email and OTP are required' });
        }
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        if (new Date() > user.otpExpires) {
            return res.status(400).json({ success: false, message: 'OTP has expired.' });
        }
        const isOtpValid = await bcrypt.compare(otp, user.otp);
        if (!isOtpValid) {
            return res.status(400).json({ success: false, message: 'Invalid OTP.' });
        }
        user.isVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();
        res.status(200).json({ success: true, message: 'Email verified successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error verifying OTP' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || !user.isVerified) {
            return res.status(401).json({ success: false, message: 'Invalid credentials or user not verified.' });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }
        const token = jwt.sign({ id: user._id, isAdmin: user.isAdmin }, process.env.JWT_SECRET, { expiresIn: '7d' });
        user.password = undefined;
        const options = {
    httpOnly: true,
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    // Add these two lines for cross-domain cookies
    sameSite: 'none',
    secure: true
};
        res.status(200).cookie('token', token, options).json({ success: true, user, token });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Login error.' });
    }
};

exports.getCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.status(200).json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching user' });
    }
};

exports.logout = async (req, res) => {
    try {
        res.status(200).clearCookie('token').json({ success: true, message: 'Logout successful' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Logout error' });
    }
};

