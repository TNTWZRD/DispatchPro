
import nodemailer from 'nodemailer';

type MailPayload = {
  to: string;
  subject: string;
  html: string;
};

const smtpConfig = {
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
};

const transporter = nodemailer.createTransport(smtpConfig);

export const sendMail = async (payload: MailPayload) => {
  if (!smtpConfig.auth.user || !smtpConfig.auth.pass) {
    console.error("SMTP credentials are not set in .env file.");
    throw new Error("SMTP service is not configured.");
  }

  const mailOptions = {
    from: process.env.SMTP_FROM,
    ...payload,
  };

  await transporter.sendMail(mailOptions);
};
