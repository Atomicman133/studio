import nodemailer from "nodemailer";

export async function sendEmail({
  to,
  subject,
  body,
  html,
  pdfBase64,
  filename,
}: {
  to: string | string[];
  subject: string;
  body?: string;
  html?: string;
  pdfBase64?: string;
  filename?: string;
}) {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailPass) {
    throw new Error("SMTP credentials not configured on server.");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmailUser,
      pass: gmailPass,
    },
  });

  const mailOptions: any = {
    from: `"Squadron Manager" <${gmailUser}>`,
    to,
    subject,
  };
  if (html) mailOptions.html = html;
  if (body) mailOptions.text = body;

  if (pdfBase64 && filename) {
    mailOptions.attachments = [
      {
        filename: filename,
        content: pdfBase64,
        encoding: "base64",
        contentType: "application/pdf",
      },
    ];
  }

  await transporter.sendMail(mailOptions);
}
