const nodemailer = require('nodemailer');
require('dotenv').config();

const mailSender = async (email, title, body) => {
    try {
        // Create a transporter using Gmail's SMTP server and your App Password
        let transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com', // Gmail's SMTP server
            port: 465, // Standard port for SSL
            secure: true, // Use SSL
            auth: {
                user: process.env.GMAIL_USER, // Your Gmail address from .env
                pass: process.env.GMAIL_APP_PASSWORD, // Your App Password from .env
            }
        });

        // Send the email
        let info = await transporter.sendMail({
            from: `"Inter IIT Tech 14.0" <${process.env.GMAIL_USER}>`, // Send from your own address
            to: email, // The recipient
            subject: title,
            html: body,
        });

        console.log("✅ Email sent successfully via Gmail:", info.messageId);
        return info;

    } catch (error) {
        console.error('❌ Error sending email via Gmail:', error.message);
        throw error;
    }
};

module.exports = mailSender;

