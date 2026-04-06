const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const getHtmlLayout = (title, content, ctaText = null, ctaUrl = null) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'DM Sans', Arial, sans-serif; background-color: #F5F4F0; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
        .wrapper { width: 100%; table-layout: fixed; padding-bottom: 60px; }
        .main { background-color: #ffffff; margin: 40px auto; width: 100%; max-width: 600px; border-radius: 20px; border: 1px solid #E2DDD4; box-shadow: 0 10px 40px rgba(0,0,0,0.05); overflow: hidden; }
        .header { background-color: #2D6A4F; padding: 40px 20px; text-align: center; }
        .logo { font-family: 'Syne', sans-serif; font-size: 28px; font-weight: 800; color: #ffffff; letter-spacing: -1px; text-decoration: none; }
        .content { padding: 40px 30px; color: #1A1814; line-height: 1.6; }
        h1 { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 700; color: #1A1814; margin-bottom: 20px; margin-top: 0; }
        p { font-size: 15px; color: #6B6560; margin-bottom: 24px; }
        .btn-wrap { padding: 0 30px 40px; text-align: center; }
        .btn { display: inline-block; background-color: #2D6A4F; color: #ffffff; padding: 14px 32px; border-radius: 12px; font-size: 15px; font-weight: 700; text-decoration: none; transition: transform 0.2s; }
        .footer { text-align: center; color: #9B948C; font-size: 12px; padding: 0 20px; }
        .badge { display: inline-block; padding: 4px 12px; background-color: #D8F3DC; color: #2D6A4F; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-bottom: 15px; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="main">
          <div class="header">
            <div class="logo">LotTrack</div>
          </div>
          <div class="content">
            <div class="badge">${title}</div>
            ${content}
          </div>
          ${ctaText && ctaUrl ? `
          <div class="btn-wrap">
            <a href="${ctaUrl}" class="btn">${ctaText}</a>
          </div>` : ''}
        </div>
        <div class="footer">
          <p>© 2026 LotTrack System • Premium Parcel Assembly<br>Managed by Renix Solutions</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const sendEmail = async (to, subject, html) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('Skipping email notification: SMTP credentials not set.');
    return;
  }
  
  try {
    const info = await transporter.sendMail({
      from: `"LotTrack Notifications" <${process.env.SMTP_USER}>`,
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
    const title = 'Parcel Dispatched';
    const content = `
      <h1>Incoming Shipment Verified</h1>
      <p>A new inventory lot <strong>#${lotId.substring(0, 8)}</strong> has been prepared and dispatched to your shop location. Please be ready to scan and receive the items upon arrival.</p>
    `;
    sendEmail(
      shopEmail,
      `Shipment Dispatched: Lot #${lotId.substring(0, 8)}`,
      getHtmlLayout(title, content, 'View Shipment Details', `${BASE_URL}/lot/${lotId}`)
    );
  },
  
  notifyReceipt: (ownerEmail, shopName, lotId) => {
    const title = 'Shipment Received';
    const content = `
      <h1>Delivery Confirmed</h1>
      <p>The shop <strong>${shopName}</strong> has just confirmed the receipt of <strong>Lot #${lotId.substring(0, 8)}</strong>. The inventory has been successfully checked into their location.</p>
      <p style="font-size: 13px; font-style: italic;">Verified at: ${new Date().toLocaleString()}</p>
    `;
    sendEmail(
      ownerEmail,
      `Receipt Confirmed: Lot #${lotId.substring(0, 8)}`,
      getHtmlLayout(title, content, 'Review Dashboard', `${BASE_URL}`)
    );
  },
  
  notifyNewOrder: (ownerEmail, shopName) => {
    const title = 'New Inventory Request';
    const content = `
      <h1>Action Required: New Order</h1>
      <p><strong>${shopName}</strong> has placed a new order for inventory assembly. Please log in to your logistics dashboard to review the requirements and start the packing process.</p>
    `;
    sendEmail(
      ownerEmail,
      `New Order Alert: ${shopName}`,
      getHtmlLayout(title, content, 'Process Order', `${BASE_URL}/orders`)
    );
  }
};
