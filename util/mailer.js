const nodemailer = require("nodemailer");

// Create a transporter
const transporter = nodemailer.createTransport({
  service: "gmail", // Use your email service provider (e.g., Gmail, Outlook, etc.)
  auth: {
    user: process.env.SENDER_EMAIL, // Replace with your email
    pass: process.env.SENDER_EMAIL_APP_PASS, // Replace with your email password or app-specific password
  },
});

const sendMail = async (mailOptions) => {
  // Send the email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log(`Error: ${error}`);
    }
    console.log(`Email sent: ${info.response}`);
  });
};

module.exports = { sendMail };
