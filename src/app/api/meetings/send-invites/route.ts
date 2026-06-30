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

    let host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    const proto = req.headers.get("x-forwarded-proto") || "https";

    if (process.env.NODE_ENV === "production") {
      host = "studio--squadron-manager-ekm3y.us-central1.hosted.app";
    }

    const origin = host ? `${proto}://${host}` : "https://studio--squadron-manager-ekm3y.us-central1.hosted.app";
    const agendaUrl = `${origin}/meetings/${meetingId}/agenda`;

    const emails = invitees.map((i: any) => i.email).filter(Boolean);

    if (emails.length > 0) {
      const subject = `Meeting Invitation: ${meetingData.title}`;
      const body = `You have been invited to a meeting.\n\nTitle: ${meetingData.title}\nDate/Time: ${dateStr}\nLocation: ${meetingData.location || "N/A"}\n\nPlease view the meeting agenda and submit your items here:\n${agendaUrl}\n\nNote: The agenda will be finalised 48 hours before the meeting.`;

      await sendEmail({
        to: emails.join(", "),
        subject,
        body,
      });
    }

    return NextResponse.json({ success: true, message: "Invites sent successfully." });
  } catch (error: any) {
    console.error("Error sending invites:", error);
    return NextResponse.json({ error: error.message || "Failed to send invites" }, { status: 500 });
  }
}
