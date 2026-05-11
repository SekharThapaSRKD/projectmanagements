import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const smtpUser = env.SMTP_USER ?? env.EMAIL_USER;
const smtpPassword = env.SMTP_PASSWORD ?? env.EMAIL_PASS;
const smtpHost = env.SMTP_HOST ?? 'smtp.gmail.com';
const smtpPort = env.SMTP_PORT ?? 587;

const hasSmtpConfig = () => Boolean(smtpUser && smtpPassword);

const createTransport = () => {
  if (!hasSmtpConfig()) {
    return null;
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: env.SMTP_SECURE ?? smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPassword
    }
  });
};

export const mailService = {
  async sendEmail(to: string, subject: string, html: string) {
    const transport = createTransport();

    if (!transport) {
      throw new Error('SMTP is not configured. Set SMTP_USER/SMTP_PASSWORD (or EMAIL_USER/EMAIL_PASS) in backend environment variables.');
    }

    await transport.sendMail({
      from: env.SMTP_FROM || smtpUser,
      to,
      subject,
      html
    });
  }
};