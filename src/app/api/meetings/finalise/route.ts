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

        const agendaItems = meetingData.agendaItems || [];
        let agendaItemsHtml = "";
        
        if (agendaItems.length === 0) {
          agendaItemsHtml = "<p><em>No items were submitted to the agenda for this meeting.</em></p>";
        } else {
          agendaItemsHtml = `
            <div style="margin-top: 15px; margin-bottom: 20px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <thead>
                  <tr style="background-color: #f3f4f6; border-bottom: 2px solid #e5e7eb;">
                    <th style="padding: 8px; text-align: left; font-weight: bold; width: 60px;">No.</th>
                    <th style="padding: 8px; text-align: left; font-weight: bold;">Description</th>
                    <th style="padding: 8px; text-align: left; font-weight: bold; width: 150px;">Submitter</th>
                  </tr>
                </thead>
                <tbody>
                  ${agendaItems.map((item: any, index: number) => `
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                      <td style="padding: 8px; vertical-align: top;">${index + 1}</td>
                      <td style="padding: 8px; vertical-align: top;">
                        <strong>${item.description}</strong>
                        ${item.notes ? `<div style="font-size: 12px; color: #555; margin-top: 4px; font-style: italic;">Notes: ${item.notes}</div>` : ''}
                      </td>
                      <td style="padding: 8px; vertical-align: top; color: #4b5563;">${item.submitterName}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `;
        }

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937; line-height: 1.5;">
            <h2 style="color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 8px; margin-bottom: 20px;">Meeting Agenda Finalised</h2>
            <p>The agenda for the upcoming meeting <strong>${meetingData.title}</strong> has been finalised.</p>
            <p>Please find the final agenda attached to this email as a PDF, or review the agenda details below:</p>
            
            <p><strong>Meeting Details:</strong></p>
            <ul style="padding-left: 20px;">
              <li><strong>Date & Time:</strong> ${meetingData.dateTime.toDate().toLocaleString()}</li>
              <li><strong>Location:</strong> ${meetingData.location || "TBA"}</li>
            </ul>
            
            <h3 style="color: #1e3a8a; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-top: 25px;">Agenda Items</h3>
            ${agendaItemsHtml}
            
            <br/>
            <p>Thank you,</p>
            <p><strong>Squadron Manager System</strong></p>
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
