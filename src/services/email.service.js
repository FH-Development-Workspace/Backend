const nodemailer = require('nodemailer');
const mailConfig = require('../config/mail');
const env = require('../config/environment');
const logger = require('../utils/logger');

let transporter = null;

const getTransporter = () => {
  if (!transporter && mailConfig.host) {
    transporter = nodemailer.createTransport({
      host: mailConfig.host,
      port: mailConfig.port,
      secure: mailConfig.secure,
      auth: mailConfig.auth,
      tls: mailConfig.secure ? { rejectUnauthorized: true } : undefined,
    });
  }
  return transporter;
};

const sendEmail = async ({ to, subject, html, text }) => {
  const transport = getTransporter();
  if (!transport) {
    logger.warn('Email not configured, skipping send', { to, subject });
    return { skipped: true };
  }

  const info = await transport.sendMail({
    from: mailConfig.from,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, ''),
  });

  logger.info('Email sent', { to, subject, messageId: info.messageId });
  return info;
};

const templates = {
  welcome: (name) => ({
    subject: 'Welcome to FH Development',
    html: `<h1>Welcome, ${name}!</h1><p>Thank you for joining FH Development.</p>`,
  }),
  emailVerification: (name, link) => ({
    subject: 'Verify your email - FH Development',
    html: `<h1>Verify your email</h1><p>Hi ${name},</p><p><a href="${link}">Click here to verify your email</a></p>`,
  }),
  passwordReset: (name, link) => ({
    subject: 'Reset your password - FH Development',
    html: `<h1>Password Reset</h1><p>Hi ${name},</p><p><a href="${link}">Click here to reset your password</a></p>`,
  }),
  loginAlert: (name, ip) => ({
    subject: 'New login detected - FH Development',
    html: `<p>Hi ${name}, a new login was detected from IP: ${ip}</p>`,
  }),
  downloadReceipt: (name, receiptNumber, productName) => ({
    subject: `Download Receipt ${receiptNumber}`,
    html: `<p>Hi ${name}, your download of ${productName} is confirmed. Receipt: ${receiptNumber}</p>`,
  }),
  licenseCreated: (name, productName, licenseKey) => ({
    subject: 'Your license key - FH Development',
    html: `<p>Hi ${name}, your license for ${productName} has been created.</p><p>Key: <strong>${licenseKey}</strong></p>`,
  }),
  supportTicketCreated: (name, ticketNumber) => ({
    subject: `Support ticket ${ticketNumber} created`,
    html: `<p>Hi ${name}, your support ticket ${ticketNumber} has been created.</p>`,
  }),
  supportReply: (name, ticketNumber) => ({
    subject: `New reply on ticket ${ticketNumber}`,
    html: `<p>Hi ${name}, there is a new reply on your support ticket ${ticketNumber}.</p>`,
  }),
  applicationReceived: (name, jobTitle) => ({
    subject: `Application received - ${jobTitle}`,
    html: `<p>Hi ${name}, we received your application for ${jobTitle}.</p>`,
  }),
  contactNotification: (data) => ({
    subject: `New contact: ${data.subject}`,
    html: `<p>From: ${data.name} (${data.email})</p><p>${data.message}</p>`,
  }),
};

const sendTemplate = async (to, templateName, data) => {
  const templateFn = templates[templateName];
  if (!templateFn) throw new Error(`Unknown email template: ${templateName}`);
  const { subject, html } = templateFn(data);
  return sendEmail({ to, subject, html });
};

module.exports = { sendEmail, sendTemplate, templates };
