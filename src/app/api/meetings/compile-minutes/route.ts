import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ai } from '@/ai/genkit';

export async function POST(request: Request) {
  try {
    const { meetingId } = await request.json();

    if (!meetingId) {
      return NextResponse.json({ error: "meetingId is required" }, { status: 400 });
    }

    const meetingRef = doc(db, "meetings", meetingId);
    const docSnap = await getDoc(meetingRef);
    
    if (!docSnap.exists()) {
      throw new Error("Meeting not found");
    }
    
    const meetingData = docSnap.data() as any;

    const presentInvitees = meetingData.invitees?.filter((i: any) => meetingData.attendeesPresentEmails?.includes(i.email)).map((i: any) => i.name) || [];
    const absentInvitees = meetingData.invitees?.filter((i: any) => !meetingData.attendeesPresentEmails?.includes(i.email)).map((i: any) => i.name) || [];
    const adhoc = meetingData.adhocAttendees || [];
    const allPresent = [...presentInvitees, ...adhoc];

    const promptText = `
You are an expert meeting secretary. Compile the following meeting notes into formal, professional meeting minutes.

Meeting Details:
Title: ${meetingData.title}
Date: ${meetingData.dateTime.toDate().toLocaleString()}
Location: ${meetingData.location || "TBA"}

Attendance:
Present: ${allPresent.length > 0 ? allPresent.join(", ") : "None recorded"}
Absent: ${absentInvitees.length > 0 ? absentInvitees.join(", ") : "None recorded"}

Agenda Items & Notes:
${(meetingData.agendaItems || []).map((item: any, i: number) => `
${i + 1}. Topic: ${item.description} (Submitted by: ${item.submitterName})
   Discussion Notes: ${item.notes || "No notes recorded."}
   Action Items: ${item.actionItems?.length > 0 ? item.actionItems.map((a: any) => `- ${a.description} (Assignee: ${a.assignee}, Due: ${a.dueDate})`).join('\n   ') : "None"}
`).join('\n')}

Please format the minutes clearly. Start with a header, list the attendance, then summarize each agenda item's discussion and any associated action items. Be concise but capture the key points. Output in plain text (not markdown formatting characters like ** or #, as this will be printed directly to a PDF).
`;

    const response = await ai.generate(promptText);
    const compiledText = response.text;

    // Save to Firestore
    await updateDoc(meetingRef, {
      minutesCompiledText: compiledText,
      status: "Completed",
      minutesCompiled: true
    });

    return NextResponse.json({ success: true, compiledText });
  } catch (error: any) {
    console.error("Error compiling minutes:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
