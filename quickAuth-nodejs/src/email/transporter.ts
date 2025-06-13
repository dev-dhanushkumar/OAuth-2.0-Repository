import nodemailer from 'nodemailer';


import SMTPTransport from 'nodemailer/lib/smtp-transport';

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
} as SMTPTransport.Options);