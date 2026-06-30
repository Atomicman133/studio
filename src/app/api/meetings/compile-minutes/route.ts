import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { format } from 'date-fns';

const parseActionDueDate = (dueDate: any): string => {
  if (!dueDate) return "";
  try {
    let dateObj: Date;
    if (dueDate instanceof Date) {
      dateObj = dueDate;
    } else if (dueDate && typeof dueDate.toDate === "function") {
      dateObj = dueDate.toDate();
    } else if (dueDate && dueDate.seconds !== undefined) {
      dateObj = new Date(dueDate.seconds * 1000);
    } else {
      dateObj = new Date(dueDate);
    }
    
    if (isNaN(dateObj.getTime())) return "";
    return format(dateObj, "yyyy-MM-dd");
  } catch (e) {
    console.error("Error parsing action due date in compile-minutes API:", e, dueDate);
    return "";
  }
};

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

    const presentEmailsNormalized = (meetingData.attendeesPresentEmails || []).map((e: string) => e.trim().toLowerCase());

    const presentInvitees = meetingData.invitees?.filter((i: any) => 
      i.email && presentEmailsNormalized.includes(i.email.trim().toLowerCase())
    ).map((i: any) => i.name) || [];

    const absentInvitees = meetingData.invitees?.filter((i: any) => 
      i.email && !presentEmailsNormalized.includes(i.email.trim().toLowerCase())
    ).map((i: any) => i.name) || [];

    const adhoc = meetingData.adhocAttendees || [];
    const allPresent = [...presentInvitees, ...adhoc];

    const presentStr = allPresent.length > 0 ? allPresent.join(", ") : "None";
    const absentStr = absentInvitees.length > 0 ? absentInvitees.join(", ") : "None";
    const dateVal = meetingData.dateTime?.toDate ? meetingData.dateTime.toDate() : new Date(meetingData.dateTime);
    const formattedDate = format(dateVal, "PPPP p");

    let compiledText = `# MEETING MINUTES\n`;
    compiledText += `====================\n\n`;
    compiledText += `Meeting Title: ${meetingData.title}\n`;
    compiledText += `Date & Time: ${formattedDate}\n`;
    compiledText += `Location: ${meetingData.location || "N/A"}\n\n`;

    compiledText += `# ATTENDANCE\n`;
    compiledText += `Present: ${presentStr}\n`;
    compiledText += `Absent: ${absentStr}\n\n`;

    compiledText += `# DISCUSSION & ACTIONS\n`;
    compiledText += `--------------------\n\n`;

    (meetingData.agendaItems || []).forEach((item: any, index: number) => {
      compiledText += `# Topic ${index + 1}: ${item.description}\n`;
      compiledText += `Submitted by: ${item.submitterName}\n\n`;
      
      compiledText += `Discussion:\n`;
      const notes = item.notes ? item.notes.trim() : "No notes recorded.";
      compiledText += notes.split('\n').map((line: string) => `   ${line}`).join('\n') + `\n\n`;

      compiledText += `Action Items:\n`;
      if (item.actionItems && item.actionItems.length > 0) {
        item.actionItems.forEach((action: any) => {
          const dueStr = parseActionDueDate(action.dueDate) || "No due date";
          compiledText += `   - ${action.description} (Assignee: ${action.assignee}, Due: ${dueStr})\n`;
        });
      } else {
        compiledText += `   - None assigned\n`;
      }
      compiledText += `\n`;
    });

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
