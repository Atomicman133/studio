import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { sendEmail } from '@/lib/email-utils';

export async function POST(request: Request) {
  try {
    const { meetingId, pdfBase64, pdfFilename } = await request.json();

    if (!meetingId || !pdfBase64 || !pdfFilename) {
      return NextResponse.json({ error: "meetingId, pdfBase64, and pdfFilename are required" }, { status: 400 });
    }

    const meetingRef = doc(db, "meetings", meetingId);
    const docSnap = await getDoc(meetingRef);
    
    if (!docSnap.exists()) {
      throw new Error("Meeting not found");
    }
    
    const meetingData = docSnap.data() as any;

    const recipientEmails = meetingData.invitees?.map((i: any) => i.email).filter(Boolean) || [];

    if (recipientEmails.length > 0) {
      const attachment = {
        filename: pdfFilename,
        content: pdfBase64,
        encoding: 'base64'
      };

      const minutesHtml = (meetingData.minutesCompiledText || "")
        .split('\n')
        .map((line: string) => {
          const trimmed = line.trim();
          if (trimmed.startsWith('#')) {
            return `<h3 style="color: #1e3a8a; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-top: 20px; font-size: 16px;">${trimmed.replace(/^#+\s*/, '')}</h3>`;
          }
          if (trimmed.startsWith('==') || trimmed.startsWith('--')) {
            return '';
          }
          if (trimmed.startsWith('-')) {
            return `<li style="margin-left: 20px; font-size: 14px;">${trimmed.substring(1).trim()}</li>`;
          }
          if (trimmed) {
            return `<p style="margin: 6px 0; font-size: 14px;">${line}</p>`;
          }
          return `<div style="height: 8px;"></div>`;
        })
        .join('\n');

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937; line-height: 1.5;">
          <h2 style="color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 8px; margin-bottom: 20px;">Meeting Minutes</h2>
          <p>The minutes for the meeting <strong>${meetingData.title}</strong> have been compiled.</p>
          <p>Please find the final minutes attached to this email as a PDF, or review the minutes details below:</p>
          
          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 15px; border-radius: 4px; margin-top: 20px; margin-bottom: 20px;">
            ${minutesHtml}
          </div>
          
          <br/>
          <p>Thank you,</p>
          <p><strong>Squadron Manager System</strong></p>
        </div>
      `;

      await sendEmail({
        to: recipientEmails.join(','),
        subject: `Meeting Minutes: ${meetingData.title}`,
        html: emailHtml,
        attachments: [attachment]
      } as any);
    }

    return NextResponse.json({ success: true, message: "Minutes emailed successfully" });
  } catch (error: any) {
    console.error("Error sending minutes:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
