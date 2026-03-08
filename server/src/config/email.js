import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendVerificationEmail = async (toEmail, verifyLink) => {
  await transporter.sendMail({
    from: `"Chat App" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Xác thực tài khoản của bạn',
    html: `
      <h2>Xác thực email</h2>
      <p>Click vào link bên dưới để xác thực tài khoản:</p>
      <a href="${verifyLink}">${verifyLink}</a>
      <p>Link hết hạn sau 24 giờ.</p>
    `,
  });
};