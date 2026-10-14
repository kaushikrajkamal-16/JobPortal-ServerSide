const nodemailer = require("nodemailer");
const { OTPMailTem } = require("./mailTemplate");

// Gmail + App Password come from the .env file
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendMail = async ({ email, subject, otp }) => {
  try {
    const info = await transporter.sendMail({
      from: `"JobPortal BD" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: subject,
      html: OTPMailTem(otp, subject, "JobPortal BD"),
    });
    console.log("Email sent successfully: %s", info.messageId);
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

module.exports = { sendMail };
