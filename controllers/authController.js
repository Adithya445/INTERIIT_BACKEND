const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // <-- THIS LINE WAS MISSING
const otpGenerator = require('otp-generator');
const mailSender = require('../utils/mailSender');

// --- ROBUST DOMAIN HANDLING ---
const rawDomains = process.env.ALLOWED_DOMAINS || "";
const ALLOWED_DOMAINS = rawDomains.split(',').map(domain => domain.trim());
console.log("✅ Server configured with allowed domains:", ALLOWED_DOMAINS);


// Register user (now sends OTP)
exports.register = async (req, res) => {
  try {
    const { name, email, password, avatar } = req.body;

    if (!name || !email || !password || !avatar) {
      console.error("Validation failed: A field was missing.", req.body);
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const emailDomain = email.split('@')[1];
    if (!ALLOWED_DOMAINS.includes(emailDomain)) {
        console.error(`Domain validation failed: ${emailDomain} is not in ${ALLOWED_DOMAINS}`);
        return res.status(400).json({ success: false, message: `Email domain '${emailDomain}' is not allowed.` });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser.isVerified) {
      return res.status(409).json({ success: false, message: 'User already exists with this email' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, lowerCaseAlphabets: false, specialChars: false });
    const hashedOtp = await bcrypt.hash(otp, 10);
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    if (existingUser) {
        existingUser.name = name;
        existingUser.password = hashedPassword;
        existingUser.avatar = avatar;
        existingUser.otp = hashedOtp;
        existingUser.otpExpires = otpExpires;
        await existingUser.save();
    } else {
        await User.create({ name, email, password: hashedPassword, avatar, otp: hashedOtp, otpExpires });
    }

    await mailSender(
        email,
        'Verification Code for Inter IIT Tech 14.0',
        `<p>Your OTP is: <strong>${otp}</strong>. It is valid for 10 minutes.</p>`
    );

    res.status(201).json({
      success: true,
      message: 'OTP sent successfully. Please check your email.',
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Error registering user', error: error.message });
  }
};

// --- The rest of the file (verifyOtp, login, etc.) remains the same ---
exports.verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP are required' });
        
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        if (new Date() > user.otpExpires) return res.status(400).json({ success: false, message: 'OTP has expired.' });
        
        const isOtpValid = await bcrypt.compare(otp, user.otp);
        if (!isOtpValid) return res.status(400).json({ success: false, message: 'Invalid OTP provided.' });
        
        user.isVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();
        
        res.status(200).json({ success: true, message: 'Email verified successfully. You can now log in.' });
    } catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({ success: false, message: 'Error verifying OTP', error: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required' });
    
        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    
        if (!user.isVerified) return res.status(403).json({ success: false, message: 'Account not verified.' });
    
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    
        const token = jwt.sign({ id: user._id, email: user.email, isAdmin: user.isAdmin }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
        user.password = undefined;
    
        const options = {
            expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            httpOnly: true
        };
    
        res.status(200).cookie('token', token, options).json({ success: true, message: 'Login successful', token, user });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Error logging in' });
    }
};

exports.getCurrentUser = async (req, res) => { 
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        res.status(200).json({ success: true, user });
    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({ success: false, message: 'Error fetching user data' });
    }
};

exports.logout = async (req, res) => { 
    try {
        res.status(200).clearCookie('token').json({ success: true, message: 'Logout successful' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ success: false, message: 'Error logging out' });
    }
};

