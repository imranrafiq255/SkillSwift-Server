const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASS,
  },
});

const sendPasswordResetEmail = async (email, resetLink) => {
  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: "Password Reset",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #333; text-align: center;">Password Reset Request</h2>
        <p style="color: #555;">Hello,</p>
        <p style="color: #555;">We received a request to reset your password. Click the button below to reset it:</p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${resetLink}" style="display: inline-block; padding: 15px 25px; font-size: 16px; color: #fff; background-color: #007BFF; border-radius: 5px; text-decoration: none;">Change Password</a>
        </div>
        <p style="color: #555;">If you didn't request a password reset, please ignore this email or contact support if you have questions.</p>
        <p style="color: #555;">Thanks, <br /> The Team</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
        <p style="font-size: 12px; color: #777; text-align: center;">If you're having trouble clicking the "Change Password" button, copy and paste the URL below into your web browser: <br /><a href="${resetLink}" style="color: #007BFF;">${resetLink}</a></p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

const sendConfirmEmail = async (email, confirmEmailLink) => {
  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: "Confirm Email",
    html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Email Confirmation</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        background-color: #f4f4f4;
                        margin: 0;
                        padding: 0;
                    }
                    .container {
                        width: 100%;
                        max-width: 600px;
                        margin: 0 auto;
                        background-color: #ffffff;
                        padding: 20px;
                        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                    }
                    .header {
                        text-align: center;
                        padding: 20px 0;
                    }
                    .header h1 {
                        margin: 0;
                        font-size: 24px;
                        color: #333333;
                    }
                    .content {
                        text-align: center;
                        padding: 20px 0;
                    }
                    .content p {
                        font-size: 16px;
                        color: #555555;
                    }
                    .button {
                        text-align: center;
                        margin: 20px 0;
                    }
                    .button a {
                        background-color: #4CAF50;
                        color: white;
                        padding: 15px 25px;
                        text-decoration: none;
                        border-radius: 5px;
                        font-size: 16px;
                    }
                    .footer {
                        text-align: center;
                        padding: 20px 0;
                        font-size: 14px;
                        color: #999999;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Email Confirmation</h1>
                    </div>
                    <div class="content">
                        <p>Thank you for signing up! Please confirm your email address by clicking the button below:</p>
                    </div>
                    <div class="button">
                        <a href="${confirmEmailLink}">Confirm Email</a>
                    </div>
                    <div class="footer">
                        <p>If you did not sign up for this account, you can ignore this email.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
  };
  await transporter.sendMail(mailOptions);
};
module.exports = { sendPasswordResetEmail, sendConfirmEmail };
