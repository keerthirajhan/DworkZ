const agreementTemplate = (data) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 20px auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
        .header { background: #334155; color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 2px; }
        .content { padding: 40px; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; }
        .button { background: #334155; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; margin-top: 20px; }
        .info-box { border-left: 4px solid #334155; background: #f8fafc; padding: 15px; margin: 20px 0; font-style: italic; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>DWORKZ</h1>
            <p>Legal & Agreements</p>
        </div>
        <div class="content">
            <h2>Workspace Agreement Ready</h2>
            <p>Dear <strong>${data.name}</strong>,</p>
            <p>We are thrilled to welcome <strong>${data.companyName}</strong> to the DworkZ community! Your workspace agreement is now ready for review and signature.</p>
            
            <div class="info-box">
                "Our agreement outlines the standard terms of service, community guidelines, and workspace specifics to ensure a productive environment for everyone."
            </div>

            <p>Please click the button below to review the agreement and complete the digital signature process.</p>
            
            <a href="${data.ctaLink}" class="button">Review & Sign Agreement</a>
            
            <p style="margin-top: 30px;">Once signed, a copy will be automatically sent to you for your records.<br><br>Welcome aboard!<br><strong>Compliance Team | DworkZ</strong></p>
        </div>
        <div class="footer">
            <p>123 Tech Hub, Business Bay, Bangalore | +91 999 000 1111</p>
            <p>&copy; 2026 DworkZ. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`;

module.exports = agreementTemplate;
