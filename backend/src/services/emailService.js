const sgMail = require('@sendgrid/mail');
const nodemailer = require('nodemailer');
const puppeteer = require('puppeteer');
const EmailLog = require('../models/EmailLog');

// Helper to get fresh config
const getConfig = () => {
  const SENDGRID_KEY = process.env.SENDGRID_API_KEY;
  const isSendGridConfigured = SENDGRID_KEY && !SENDGRID_KEY.includes('your_');
  
  const EMAIL_USER = process.env.EMAIL_USER;
  const isNodemailerConfigured = EMAIL_USER && !EMAIL_USER.includes('your_');
  
  return {
    isSendGridConfigured,
    isNodemailerConfigured,
    from: process.env.EMAIL_FROM || 'noreply@dworkz.com'
  };
};

if (process.env.SENDGRID_API_KEY && !process.env.SENDGRID_API_KEY.includes('your_')) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Initialize NodeMailer
const getTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_PORT == 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

class EmailService {
  /**
   * Generates a PDF from HTML content using Puppeteer
   */
  async generatePDF(html, fileName) {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
        printBackground: true
      });
      return pdfBuffer;
    } catch (error) {
      console.error('PDF Generation Error:', error);
      throw error;
    } finally {
      if (browser) await browser.close();
    }
  }

  /**
   * Sends an email with an optional attachment
   */
  async sendEmail({ to, subject, html, attachment, clientId, type, attachmentName }) {
    const { isSendGridConfigured, isNodemailerConfigured, from } = getConfig();
    
    // 1. Try SendGrid if configured
    if (isSendGridConfigured) {
      try {
        const msg = { to, from, subject, html };
        if (attachment) {
          const buffer = Buffer.isBuffer(attachment) ? attachment : Buffer.from(attachment);
          msg.attachments = [{
            content: buffer.toString('base64'),
            filename: attachmentName || 'document.pdf',
            type: 'application/pdf',
            disposition: 'attachment',
          }];
        }
        const result = await sgMail.send(msg);
        await this.logEmail(clientId, to, subject, type, 'Sent', result[0]?.headers['x-message-id'], attachmentName);
        return { success: true, method: 'SendGrid' };
      } catch (error) {
        console.warn('SendGrid failed, falling back to NodeMailer:', error.message);
      }
    }

    // 2. Try NodeMailer if configured
    if (isNodemailerConfigured) {
      try {
        const mailOptions = { from, to, subject, html };
        if (attachment) {
          mailOptions.attachments = [{
            filename: attachmentName || 'document.pdf',
            content: attachment
          }];
        }
        const info = await getTransporter().sendMail(mailOptions);
        await this.logEmail(clientId, to, subject, type, 'Sent', info.messageId, attachmentName);
        return { success: true, method: 'NodeMailer' };
      } catch (error) {
        console.warn('NodeMailer failed:', error.message);
      }
    }

    // 3. Fallback for Development or Missing Config: Log to Console
    const isDev = !process.env.NODE_ENV || process.env.NODE_ENV.toLowerCase().startsWith('dev');
    if (isDev || (!isSendGridConfigured && !isNodemailerConfigured)) {
      console.log('\x1b[33m%s\x1b[0m', '--- [FALLBACK] EMAIL CONTENT LOG ---');
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Type: ${type}`);
      console.log('------------------------------------');
      await this.logEmail(clientId, to, subject, type, 'Sent (Dev Log)', 'DEV_MOCK_ID', attachmentName);
      return { success: true, method: 'Console' };
    }

    throw new Error('Email service configuration missing and not in development mode.');
  }

  async logEmail(clientId, email, subject, type, status, messageId, attachmentName, errorMessage) {
    try {
      await EmailLog.create({
        clientId,
        email,
        subject,
        type,
        status,
        messageId,
        attachmentName,
        errorMessage
      });
    } catch (err) {
      console.error('Failed to log email to database:', err.message);
    }
  }

  async getClientHistory(clientId) {
    return await EmailLog.find({ clientId }).sort({ sentAt: -1 });
  }
}

module.exports = new EmailService();
