const invoiceTemplate = (data) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 20px auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
        .header { background: #0f172a; color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 2px; }
        .content { padding: 40px; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; }
        .button { background: #0f172a; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; margin-top: 20px; }
        .invoice-box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .status-paid { color: #10b981; font-weight: bold; text-transform: uppercase; }
        .status-pending { color: #f59e0b; font-weight: bold; text-transform: uppercase; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>DWORKZ</h1>
            <p>Billing & Invoicing</p>
        </div>
        <div class="content">
            <h2>Invoice Generated</h2>
            <p>Dear <strong>${data.name}</strong>,</p>
            <p>An invoice has been generated for your workspace subscription at DworkZ.</p>
            
            <div class="invoice-box">
                <p><strong>Invoice #:</strong> ${data.invoiceNumber}</p>
                <p><strong>Period:</strong> ${data.period}</p>
                <p><strong>Amount Due:</strong> <span style="font-size: 18px;">₹${data.amount.toLocaleString()}</span></p>
                <p><strong>Due Date:</strong> ${data.dueDate}</p>
                <p><strong>Status:</strong> <span class="status-${data.status.toLowerCase()}">${data.status}</span></p>
            </div>

            <p>You can view and pay your invoice by clicking the button below or by logging into your member portal.</p>
            
            <a href="${data.ctaLink}" class="button">Pay Invoice Now</a>
            
            <p style="margin-top: 30px;">If you have already paid, please ignore this email.<br><br>Best Regards,<br><strong>Billing Team | DworkZ</strong></p>
        </div>
        <div class="footer">
            <p>123 Tech Hub, Business Bay, Bangalore | +91 999 000 1111</p>
            <p>&copy; 2026 DworkZ. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`;

module.exports = invoiceTemplate;
