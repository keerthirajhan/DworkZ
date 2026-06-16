const sgMail = require('@sendgrid/mail');
const nodemailer = require('nodemailer');
const puppeteer = require('puppeteer');
const axios = require('axios');
const EmailLog = require('../models/EmailLog');

// Helper to get fresh config
const getConfig = () => {
  const BREVO_KEY = process.env.BREVO_API_KEY;
  const isBrevoConfigured = BREVO_KEY && !BREVO_KEY.includes('your_');

  const SENDGRID_KEY = process.env.SENDGRID_API_KEY;
  const isSendGridConfigured = SENDGRID_KEY && !SENDGRID_KEY.includes('your_');
  
  const EMAIL_USER = process.env.EMAIL_USER;
  const isNodemailerConfigured = EMAIL_USER && !EMAIL_USER.includes('your_');
  
  return {
    isBrevoConfigured,
    isSendGridConfigured,
    isNodemailerConfigured,
    from: process.env.EMAIL_FROM || 'noreply@dworkz.com',
    brevoSender: {
      name: process.env.BREVO_SENDER_NAME || 'DworkZ',
      email: process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_FROM || 'info.dworkzcbe@gmail.com'
    }
  };
};

if (process.env.SENDGRID_API_KEY && !process.env.SENDGRID_API_KEY.includes('your_')) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}


// Initialize NodeMailer (with timeout to fail fast when SMTP port is blocked)
const getTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: parseInt(process.env.EMAIL_PORT) === 465,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
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
        margin: { top: '5mm', right: '5mm', bottom: '5mm', left: '5mm' },
        printBackground: true,
        scale: 0.9
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
    const disableEmail = process.env.DISABLE_EMAIL_SENDING === 'true';

    if (!disableEmail) {
      const { isBrevoConfigured, isSendGridConfigured, isNodemailerConfigured, from, brevoSender } = getConfig();
      
      // 1. Try Brevo if configured
      if (isBrevoConfigured) {
        try {
          const payload = {
            sender: brevoSender,
            to: [{ email: to }],
            subject,
            htmlContent: html
          };

          if (attachment) {
            const buffer = Buffer.isBuffer(attachment) ? attachment : Buffer.from(attachment);
            payload.attachment = [{
              content: buffer.toString('base64'),
              name: attachmentName || 'document.pdf'
            }];
          }

          const response = await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
            headers: {
              'api-key': process.env.BREVO_API_KEY,
              'Content-Type': 'application/json'
            }
          });

          const messageId = response.data?.messageId || 'BREVO_SUCCESS';
          await this.logEmail(clientId, to, subject, type, 'Sent', messageId, attachmentName);
          return { success: true, method: 'Brevo' };
        } catch (error) {
          console.warn('Brevo failed, falling back:', error.response?.data || error.message);
        }
      }

      // 2. Try SendGrid if configured
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

      // 2. Try NodeMailer if configured (with 12s hard deadline via Promise.race)
      if (isNodemailerConfigured) {
        try {
          const mailOptions = { from, to, subject, html };
          if (attachment) {
            mailOptions.attachments = [{
              filename: attachmentName || 'document.pdf',
              content: attachment
            }];
          }

          // Hard 12-second deadline — fails fast if SMTP port is blocked by hosting provider
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('SMTP timeout: port may be blocked by your hosting provider (Render blocks port 587). Consider using SendGrid instead.')), 12000)
          );

          const info = await Promise.race([
            getTransporter().sendMail(mailOptions),
            timeoutPromise
          ]);

          await this.logEmail(clientId, to, subject, type, 'Sent', info.messageId, attachmentName);
          return { success: true, method: 'NodeMailer' };
        } catch (error) {
          console.warn('NodeMailer failed (SMTP may be blocked by hosting provider):', error.message);
          // Fall through to graceful fallback below — do NOT throw
        }
      }
    }

    // 3. Universal Fallback — log to console and DB, never crash the user flow
    // This handles: dev mode, missing config, OR SMTP port blocked by hosting (e.g. Render)
    console.log('\x1b[33m%s\x1b[0m', '--- [FALLBACK] EMAIL CONTENT LOG (SMTP unavailable or disabled) ---');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Type: ${type}`);
    console.log('-------------------------------------------------------');
    await this.logEmail(clientId, to, subject, type, disableEmail ? 'Logged (Emails Disabled)' : 'Logged (SMTP Unavailable)', 'FALLBACK_ID', attachmentName);
    return { success: true, method: disableEmail ? 'Disabled-Log' : 'Fallback-Log' };
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
