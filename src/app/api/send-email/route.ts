import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const { to, subject, body, pdfBase64, filename } = await req.json();

    if (!to || !subject || !body) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, or body." },
        { status: 400 }
      );
    }

    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailPass) {
      return NextResponse.json(
        { error: "SMTP credentials not configured on server." },
        { status: 500 }
      );
    }

    // Configure Nodemailer transporter with Gmail SMTP
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
      text: body,
    };

    // Attach the PDF report if provided
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

    // Send the email
    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, message: "Email sent successfully." });
  } catch (error: any) {
    console.error("Nodemailer error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send email." },
      { status: 500 }
    );
  }
}
