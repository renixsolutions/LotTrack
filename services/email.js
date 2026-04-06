const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendEmail = async (to, subject, html) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('Skipping email notification: SMTP credentials not set.');
    return;
  }
  
  try {
    const info = await transporter.sendMail({
      from: `"Renix Solutions" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`Email sent: ${info.messageId}`);
  } catch (error) {
    console.error('Email sending failed:', error);
  }
};

module.exports = {
  notifyDispatch: (shopEmail, lotId) => {
    sendEmail(
      shopEmail,
      'Lot Dispatched | Renix Solutions',
      `<h2>Lot #${lotId.substring(0, 8)} Dispatched</h2>
       <p>A new inventory lot has been dispatched to your shop.</p>
       <a href="${process.env.APP_URL || 'http://localhost:3000'}/lot/${lotId}">Track Incoming Lot</a>`
    );
  },
  
  notifyReceipt: (ownerEmail, shopName, lotId) => {
    sendEmail(
      ownerEmail,
      'Lot Received | Renix Solutions',
      `<h2>Lot Received Notification</h2>
       <p>Shop <strong>${shopName}</strong> has confirmed receipt of <strong>Lot #${lotId.substring(0, 8)}</strong>.</p>
       <p>Timestamp: ${new Date().toLocaleString()}</p>`
    );
  },
  
  notifyNewOrder: (ownerEmail, shopName) => {
    sendEmail(
      ownerEmail,
      'New Shop Order Received | Renix Solutions',
      `<h2>New Order Request</h2>
       <p>Shop <strong>${shopName}</strong> has placed a new order for inventory.</p>
       <p>Please check your dashboard to review and fulfill the order.</p>`
    );
  }
};
