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
  welcome: (data) => ({
    subject: 'Welcome to FH Development',
    html: `<h1>Welcome, ${data?.name || data || 'User'}!</h1><p>Thank you for joining FH Development.</p>`,
  }),
  emailVerification: (name, link) => ({
    subject: 'Verify your email - FH Development',
    html: `<h1>Verify your email</h1><p>Hi ${typeof name === 'object' ? (name.name || 'User') : name},</p><p><a href="${typeof name === 'object' ? name.link : link}">Click here to verify your email</a></p>`,
  }),
  passwordReset: (name, link) => ({
    subject: 'Reset your password - FH Development',
    html: `<h1>Password Reset</h1><p>Hi ${typeof name === 'object' ? (name.name || 'User') : name},</p><p><a href="${typeof name === 'object' ? name.link : link}">Click here to reset your password</a></p>`,
  }),
  loginAlert: (name, ip) => ({
    subject: 'New login detected - FH Development',
    html: `<p>Hi ${typeof name === 'object' ? (name.name || 'User') : name}, a new login was detected from IP: ${typeof name === 'object' ? name.ip : ip}</p>`,
  }),
  downloadReceipt: (name, receiptNumber, productName) => ({
    subject: `Download Receipt ${typeof name === 'object' ? name.receiptNumber : receiptNumber}`,
    html: `<p>Hi ${typeof name === 'object' ? name.name : name}, your download of ${typeof name === 'object' ? name.productName : productName} is confirmed.</p>`,
  }),
  licenseCreated: (name, productName, licenseKey) => ({
    subject: 'Your license key - FH Development',
    html: `<p>Hi ${typeof name === 'object' ? name.name : name}, your license for ${typeof name === 'object' ? name.productName : productName} has been created.</p><p>Key: <strong>${typeof name === 'object' ? name.licenseKey : licenseKey}</strong></p>`,
  }),
  supportTicketCreated: (name, ticketNumber) => ({
    subject: `Support ticket ${typeof name === 'object' ? name.ticketNumber : ticketNumber} created`,
    html: `<p>Hi ${typeof name === 'object' ? name.name : name}, your support ticket ${typeof name === 'object' ? name.ticketNumber : ticketNumber} has been created.</p>`,
  }),
  supportReply: (name, ticketNumber) => ({
    subject: `New reply on ticket ${typeof name === 'object' ? name.ticketNumber : ticketNumber}`,
    html: `<p>Hi ${typeof name === 'object' ? name.name : name}, there is a new reply on your support ticket ${typeof name === 'object' ? name.ticketNumber : ticketNumber}.</p>`,
  }),
  applicationReceived: (name, jobTitle) => ({
    subject: `Application received - ${typeof name === 'object' ? name.jobTitle : jobTitle}`,
    html: `<p>Hi ${typeof name === 'object' ? name.name : name}, we received your application for ${typeof name === 'object' ? name.jobTitle : jobTitle}.</p>`,
  }),
  contactReceived: (data) => ({
    subject: `Thank you for contacting FH Development`,
    html: `<p>Hi ${data?.name || 'there'},</p><p>We have received your message and will respond shortly.</p><p><strong>Your message:</strong><br>${data?.message || ''}</p>`,
  }),
  contactNotification: (data) => ({
    subject: `New contact: ${data?.subject || 'Inquiry'}`,
    html: `<p>From: ${data?.name} (${data?.email})</p><p>${data?.message}</p>`,
  }),
};

const sendTemplate = async (to, templateName, ...args) => {
  try {
    const templateFn = templates[templateName];
    if (!templateFn) {
      logger.warn(`Unknown email template: ${templateName}`);
      return { skipped: true };
    }
    const { subject, html } = templateFn(...args);
    return await sendEmail({ to, subject, html });
  } catch (err) {
    logger.warn('Error rendering/sending email template', { templateName, error: err.message });
    return { error: err.message };
  }
};

module.exports = { sendEmail, sendTemplate, templates };
