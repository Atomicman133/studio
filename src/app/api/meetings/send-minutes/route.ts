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

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Meeting Minutes Available</h2>
          <p>The minutes for the meeting <strong>${meetingData.title}</strong> have been compiled.</p>
          <p>Please find the final minutes attached to this email as a PDF.</p>
          <br/>
          <p>Thank you,</p>
          <p>Squadron Manager System</p>
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
