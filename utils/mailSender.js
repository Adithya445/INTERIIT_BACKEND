const sgMail = require('@sendgrid/mail');
require('dotenv').config();

// Set the API key from your environment variables
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const mailSender = async (email, title, body) => {
    try {
        const msg = {
            to: email, // Recipient
            from: process.env.SENDGRID_SENDER_EMAIL, // Your verified sender email
            subject: title,
            html: body,
        };

        const info = await sgMail.send(msg);

        console.log("✅ Email sent successfully via SendGrid:", info[0].headers['x-message-id']);
        return info;

    } catch (error) {
        console.error('❌ Error sending email via SendGrid:', error);
        
        // If SendGrid returns detailed errors, log them
        if (error.response) {
            console.error(error.response.body)
        }
        
        throw error;
    }
};

module.exports = mailSender;