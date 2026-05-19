const proposalTemplate = (data) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Workspace Proposal</title>
</head>
<body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f7f6;">
    <div style="max-width: 600px; margin: 20px auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); background-color: #ffffff;">
        <div style="background: #14b8a6; color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 2px;">DWORKZ</h1>
            <p style="margin: 5px 0 0; font-size: 14px; opacity: 0.9;">Premium Workspace Solutions</p>
        </div>
        <div style="padding: 40px;">
            <h2 style="color: #111; font-size: 20px; margin-bottom: 20px; border-bottom: 2px solid #14b8a6; display: inline-block; padding-bottom: 5px;">Workspace Proposal</h2>
            <p style="margin-bottom: 20px;">Dear <strong>${data.name}</strong>,</p>
            ${data.customMessage ? `<p style="margin-bottom: 20px; white-space: pre-line; color: #4a5568;">${data.customMessage}</p>` : ''}
            <p style="margin-bottom: 25px;">Thank you for your interest in DworkZ. We are excited to present you with a tailored workspace proposal for <strong>${data.companyName}</strong>.</p>
            
            <div style="background: #f9fafb; padding: 25px; border-radius: 12px; margin: 25px 0; border: 1px solid #edf2f7;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #edf2f7; font-size: 11px; font-weight: 800; color: #718096; text-transform: uppercase; letter-spacing: 1px;">Workspace Type</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #edf2f7; text-align: right; font-weight: 700; color: #1a202c; font-size: 14px;">${data.workspaceType}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #edf2f7; font-size: 11px; font-weight: 800; color: #718096; text-transform: uppercase; letter-spacing: 1px;">Capacity</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #edf2f7; text-align: right; font-weight: 700; color: #1a202c; font-size: 14px;">${data.seats} Seats</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #edf2f7; font-size: 11px; font-weight: 800; color: #718096; text-transform: uppercase; letter-spacing: 1px;">Plan</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #edf2f7; text-align: right; font-weight: 700; color: #1a202c; font-size: 14px;">${data.planType}</td>
                    </tr>
                    <tr>
                        <td style="padding: 15px 0 0; font-size: 11px; font-weight: 800; color: #718096; text-transform: uppercase; letter-spacing: 1px;">Monthly Payment</td>
                        <td style="padding: 15px 0 0; text-align: right; font-weight: 800; color: #14b8a6; font-size: 20px;">₹${data.totalPrice.toLocaleString()}</td>
                    </tr>
                </table>
            </div>

            <p style="margin-bottom: 15px; color: #4a5568;">Our facilities are designed to boost your productivity with high-speed internet, premium amenities, and a vibrant community.</p>
            
            <p style="background-color: #fffaf0; border-left: 4px solid #f6ad55; padding: 15px; font-size: 13px; color: #744210; margin: 25px 0;">
                <strong>PDF ATTACHED:</strong> We have attached the full proposal document to this email. Please download it to view the complete details, amenities, and terms.
            </p>
            
            <p style="margin-top: 30px; border-top: 1px solid #eee; pt: 20px;">Best Regards,<br><strong style="color: #14b8a6;">Team DworkZ</strong></p>
        </div>
        <div style="background: #f9fafb; padding: 20px; text-align: center; font-size: 11px; color: #a0aec0; border-top: 1px solid #eee;">
            <p style="margin: 0;">123 Tech Hub, Business Bay, Bangalore | +91 999 000 1111</p>
            <p style="margin: 5px 0 0;">&copy; 2026 DworkZ. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`;

module.exports = proposalTemplate;
