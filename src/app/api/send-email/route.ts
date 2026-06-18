import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email-utils";

export async function POST(req: NextRequest) {
  try {
    const { to, subject, body, pdfBase64, filename } = await req.json();

    if (!to || !subject || !body) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, or body." },
        { status: 400 }
      );
    }

    await sendEmail({ to, subject, body, pdfBase64, filename });

    return NextResponse.json({ success: true, message: "Email sent successfully." });
  } catch (error: any) {
    console.error("Email error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send email." },
      { status: 500 }
    );
  }
}
