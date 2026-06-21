import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email-utils";
import { db } from "@/lib/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { format } from "date-fns";

export async function POST(req: NextRequest) {
  try {
    const { meetingId } = await req.json();

    if (!meetingId) {
      return NextResponse.json({ error: "meetingId is required" }, { status: 400 });
    }

    const meetingRef = doc(db, "meetings", meetingId);
    const meetingSnap = await getDoc(meetingRef);

    if (!meetingSnap.exists()) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    const meetingData = meetingSnap.data();
    const invitees = meetingData.invitees || [];
    const dateStr = meetingData.dateTime ? format(meetingData.dateTime.toDate(), "PPP p") : "TBD";

    if (invitees.length === 0) {
      return NextResponse.json({ message: "No invitees to email", success: true });
    }

    const emails = invitees.map((i: any) => i.email).filter(Boolean);

    if (emails.length > 0) {
      const subject = `Cancelled: ${meetingData.title}`;
      const body = `Please note that the following meeting has been cancelled:\n\nTitle: ${meetingData.title}\nDate/Time: ${dateStr}\nLocation: ${meetingData.location || "N/A"}\n\nNo further action is required.`;

      await sendEmail({
        to: emails.join(", "),
        subject,
        body,
      });
    }

    return NextResponse.json({ success: true, message: "Cancellation emails sent successfully." });
  } catch (error: any) {
    console.error("Error sending cancellation emails:", error);
    return NextResponse.json({ error: error.message || "Failed to send cancellation emails" }, { status: 500 });
  }
}
