const nodemailer = require('nodemailer');
require('dotenv').config();

const mailSender = async (email, title, body) => {
    try {
        // Create a transporter using Mailtrap credentials
        let transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            }
        });

        // Send the email
        let info = await transporter.sendMail({
            from: '"Inter IIT Tech 14.0" <no-reply@interiit.tech>',
            to: email,
            subject: title,
            html: body,
        });

        console.log("Email info: ", info);
        return info;

    } catch (error) {
        console.error('Error sending email:', error.message);
        throw error; // Re-throw the error to be caught by the caller
    }
};

module.exports = mailSender;
