const nodemailer = require('nodemailer');
const logger = require('./logger');

const createEmailTransporter = () => {
  const config = {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  };

  if (!config.auth.user || !config.auth.pass) {
    logger.warn('Email credentials not configured. Email notifications will not work.');
    return null;
  }

  try {
    const transporter = nodemailer.createTransporter(config);
    logger.info('Email transporter configured successfully');
    return transporter;
  } catch (error) {
    logger.error('Failed to create email transporter:', error);
    return null;
  }
};

const sendEmail = async (to, subject, html) => {
  const transporter = createEmailTransporter();
  if (!transporter) {
    logger.warn('Cannot send email: transporter not configured');
    return false;
  }

  try {
    const mailOptions = {
      from: {
        name: process.env.EMAIL_FROM_NAME || 'SIMKA System',
        address: process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER
      },
      to,
      subject,
      html
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Email sent successfully to: ${to}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send email to ${to}:`, error);
    return false;
  }
};

const testEmailConnection = async () => {
  const transporter = createEmailTransporter();
  if (!transporter) {
    return false;
  }

  try {
    await transporter.verify();
    logger.info('Email connection test passed');
    return true;
  } catch (error) {
    logger.error('Email connection test failed:', error);
    return false;
  }
};

module.exports = {
  createEmailTransporter,
  sendEmail,
  testEmailConnection
};
