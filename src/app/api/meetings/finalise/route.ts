import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import { doc, runTransaction } from 'firebase/firestore';
import { sendEmail } from '@/lib/email-utils';

export async function POST(request: Request) {
  try {
    const { meetingId, pdfBase64, pdfFilename } = await request.json();

    if (!meetingId) {
      return NextResponse.json({ error: "meetingId is required" }, { status: 400 });
    }

    const meetingRef = doc(db, "meetings", meetingId);
    
    return await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(meetingRef);
      if (!docSnap.exists()) {
        throw new Error("Meeting not found");
      }
      
      const meetingData = docSnap.data() as any;
      if (meetingData.status !== "Draft") {
        return NextResponse.json({ success: true, message: "Already finalised" });
      }

      // Update status to Agenda Finalised
      transaction.update(meetingRef, { status: "Agenda Finalised" });

      // If we have invitees, send them the email with the agenda attached
      const invitees = meetingData.invitees || [];
      const recipientEmails = invitees.map((i: any) => i.email).filter(Boolean);

      if (recipientEmails.length > 0 && pdfBase64 && pdfFilename) {
        const attachment = {
          filename: pdfFilename,
          content: pdfBase64,
          encoding: 'base64'
        };

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Meeting Agenda Finalised</h2>
            <p>The agenda for the upcoming meeting <strong>${meetingData.title}</strong> has been finalised.</p>
            <p>Please find the final agenda attached to this email as a PDF.</p>
            <br/>
            <p><strong>Meeting Details:</strong></p>
            <ul>
              <li><strong>Date & Time:</strong> ${meetingData.dateTime.toDate().toLocaleString()}</li>
              <li><strong>Location:</strong> ${meetingData.location || "TBA"}</li>
            </ul>
            <br/>
            <p>Thank you,</p>
            <p>Squadron Manager System</p>
          </div>
        `;

        await sendEmail({
          to: recipientEmails.join(','),
          subject: `Final Agenda: ${meetingData.title}`,
          html: emailHtml,
          attachments: [attachment]
        } as any);
      }

      return NextResponse.json({ success: true, message: "Finalised and sent" });
    });
  } catch (error: any) {
    console.error("Error finalising agenda:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
