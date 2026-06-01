const proposalPdfTemplate = (data) => {
  // Split custom message by newlines robustly, filtering out any empty strings
  const paragraphs = data.customMessage 
    ? data.customMessage.split(/\r?\n\r?\n/).filter(p => p.trim() !== '') 
    : [
        "Please find the attached workspace proposal for your review. Thank you for considering DworkZ as your workspace partner.",
        "At DworkZ, we believe a workspace should be more than just a place to work—it should inspire productivity, collaboration, and growth. Our facilities are designed to enhance your work experience with high-speed internet, premium amenities, modern infrastructure, and a vibrant professional community.",
        "Whether you are a freelancer, startup, or growing business, DworkZ provides a flexible and professional environment tailored to your needs, helping you focus on what matters most—growing your business and achieving success.",
        "We look forward to welcoming you to the DworkZ community and building a long-term partnership with you.",
        "Thank you for your interest in DworkZ."
      ];

  const formattedParagraphs = paragraphs.map(p => `<p>${p.trim()}</p>`).join('');

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Workspace Proposal</title>
    <style>
        html, body {
            height: 100%;
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            background-color: #ffffff;
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            -webkit-print-color-adjust: exact;
        }
        
        .container {
            height: 100%;
            display: flex;
            flex-direction: column;
            border: 1px solid #eee;
            border-radius: 10px;
            overflow: hidden;
            background-color: #ffffff;
            box-sizing: border-box;
        }

        .header {
            background: #14b8a6;
            color: white;
            padding: 25px 20px;
            text-align: center;
        }

        .header h1 {
            margin: 0;
            font-size: 26px;
            letter-spacing: 2px;
        }

        .header p {
            margin: 4px 0 0;
            font-size: 14px;
            opacity: 0.9;
        }

        .content-area {
            flex: 1;
            padding: 40px 45px;
            box-sizing: border-box;
        }

        .intro h2 {
            color: #111;
            font-size: 24px;
            margin: 0 0 20px 0;
            border-bottom: 2px solid #14b8a6;
            display: inline-block;
            padding-bottom: 4px;
        }

        .intro p {
            font-size: 16px;
            line-height: 1.65;
            color: #2d3748;
            margin: 0 0 16px 0;
        }

        .pricing-card {
            background: #f9fafb;
            padding: 25px 30px;
            border-radius: 10px;
            margin: 35px 0;
            border: 1px solid #edf2f7;
            box-shadow: 0 4px 6px rgba(0,0,0,0.02);
        }

        .pricing-table {
            width: 100%;
            border-collapse: collapse;
        }

        .pricing-table td {
            padding: 12px 0;
            border-bottom: 1px solid #edf2f7;
        }

        .pricing-table tr:last-child td {
            border-bottom: none;
            padding-bottom: 0;
        }

        .label {
            font-size: 12px;
            font-weight: 700;
            color: #4a5568;
            text-transform: uppercase;
            letter-spacing: 1.2px;
        }

        .value {
            text-align: right;
            font-weight: 700;
            color: #1a202c;
            font-size: 16px;
        }

        .total-value {
            text-align: right;
            font-weight: 800;
            color: #14b8a6;
            font-size: 22px;
        }

        .outro {
            margin-top: 45px;
        }

        .sign-off {
            margin: 0;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 16px;
            color: #2d3748;
            line-height: 1.5;
        }

        .sign-off strong {
            color: #14b8a6;
            font-size: 17px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>DworkZ</h1>
            <p>Premium Workspace Solutions</p>
        </div>
        <div class="content-area">
            <div class="intro">
                <h2>Workspace Proposal</h2>
                <p style="margin-bottom: 15px;">Dear <strong>${data.name}</strong>,</p>
                ${formattedParagraphs}
            </div>

            <div class="pricing-card">
                <table class="pricing-table">
                    <tr>
                        <td class="label">Workspace Type</td>
                        <td class="value">${data.workspaceType}</td>
                    </tr>
                    <tr>
                        <td class="label">Capacity</td>
                        <td class="value">${data.seats} Seats</td>
                    </tr>
                    <tr>
                        <td class="label">Plan</td>
                        <td class="value">${data.planType}</td>
                    </tr>
                    <tr>
                        <td style="padding-top: 10px;" class="label">Monthly Payment</td>
                        <td style="padding-top: 10px;" class="total-value">₹${data.totalPrice.toLocaleString()}</td>
                    </tr>
                </table>
            </div>

            <div class="outro">
                <p class="sign-off">
                    Best Regards,<br>
                    <strong>Team DworkZ</strong>
                </p>
            </div>
        </div>
    </div>
</body>
</html>
  `;
};

module.exports = proposalPdfTemplate;
