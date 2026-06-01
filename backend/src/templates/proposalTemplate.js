const proposalTemplate = (data) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Workspace Proposal</title>
</head>
<body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #ffffff;">
    <div style="max-width: 100%; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); background-color: #ffffff;">
        <div style="background: #14b8a6; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; letter-spacing: 2px;">DworkZ</h1>
            <p style="margin: 5px 0 0; font-size: 14px; opacity: 0.9;">Premium Workspace Solutions</p>
        </div>
        <div style="padding: 20px;">
            <h2 style="color: #111; font-size: 20px; margin-bottom: 10px; border-bottom: 2px solid #14b8a6; display: inline-block; padding-bottom: 5px;">Workspace Proposal</h2>
            <p style="margin-bottom: 10px;">Dear <strong>${data.name}</strong>,</p>
            ${data.customMessage ? `<p style="margin-bottom: 15px; white-space: pre-line; color: #4a5568; line-height: 1.7;">${data.customMessage}</p>` : `
            <p style="margin-bottom: 15px; color: #4a5568; line-height: 1.7;">Please find the attached workspace proposal for your review. Thank you for considering DworkZ as your workspace partner.</p>
            <p style="margin-bottom: 15px; color: #4a5568; line-height: 1.7;">At DworkZ, we believe a workspace should be more than just a place to work—it should inspire productivity, collaboration, and growth. Our facilities are designed to enhance your work experience with high-speed internet, premium amenities, modern infrastructure, and a vibrant professional community.</p>
            <p style="margin-bottom: 15px; color: #4a5568; line-height: 1.7;">Whether you are a freelancer, startup, or growing business, DworkZ provides a flexible and professional environment tailored to your needs, helping you focus on what matters most—growing your business and achieving success.</p>
            <p style="margin-bottom: 15px; color: #4a5568; line-height: 1.7;">We look forward to welcoming you to the DworkZ community and building a long-term partnership with you.</p>
            <p style="margin-bottom: 15px; color: #4a5568; line-height: 1.7;">Thank you for your interest in DworkZ.</p>
            `}

            <div style="background: #f9fafb; padding: 10px 15px; border-radius: 12px; margin: 10px 0; border: 1px solid #edf2f7;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #edf2f7; font-size: 11px; font-weight: 800; color: #718096; text-transform: uppercase; letter-spacing: 1px;">Workspace Type</td>
                        <td style="padding: 8px 0; border-bottom: 1px solid #edf2f7; text-align: right; font-weight: 700; color: #1a202c; font-size: 14px;">${data.workspaceType}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #edf2f7; font-size: 11px; font-weight: 800; color: #718096; text-transform: uppercase; letter-spacing: 1px;">Capacity</td>
                        <td style="padding: 8px 0; border-bottom: 1px solid #edf2f7; text-align: right; font-weight: 700; color: #1a202c; font-size: 14px;">${data.seats} Seats</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #edf2f7; font-size: 11px; font-weight: 800; color: #718096; text-transform: uppercase; letter-spacing: 1px;">Plan</td>
                        <td style="padding: 8px 0; border-bottom: 1px solid #edf2f7; text-align: right; font-weight: 700; color: #1a202c; font-size: 14px;">${data.planType}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0 0; font-size: 11px; font-weight: 800; color: #718096; text-transform: uppercase; letter-spacing: 1px;">Monthly Payment</td>
                        <td style="padding: 10px 0 0; text-align: right; font-weight: 800; color: #14b8a6; font-size: 20px;">₹${data.totalPrice.toLocaleString()}</td>
                    </tr>
                </table>
            </div>

            <p style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;">Best Regards,<br><strong style="color: #14b8a6;">Team DworkZ</strong></p>
        </div>
        <div style="background: #f9fafb; padding: 10px; text-align: center; font-size: 11px; color: #a0aec0; border-top: 1px solid #eee;">
            <p style="margin: 0;">123 Tech Hub, Business Bay, Bangalore | +91 999 000 1111</p>
            <p style="margin: 5px 0 0;">&copy; 2026 DworkZ. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`;

module.exports = proposalTemplate;
