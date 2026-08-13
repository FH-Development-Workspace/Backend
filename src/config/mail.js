const env = require('./environment');

const fromAddress = env.smtp.fromName
  ? `"${env.smtp.fromName}" <${env.smtp.from}>`
  : env.smtp.from;

module.exports = {
  host: env.smtp.host,
  port: env.smtp.port,
  secure: env.smtp.port === 465,
  auth: env.smtp.user
    ? { user: env.smtp.user, pass: env.smtp.password }
    : undefined,
  from: fromAddress,
  replyTo: env.smtp.from,
};
