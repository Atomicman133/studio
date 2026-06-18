"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, updateDoc, Timestamp, arrayUnion } from "firebase/firestore";
import { Meeting, AgendaItem, actionItemSchema } from "../../meeting-schema";
import { format, differenceInHours } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertTriangle, Plus, FileText, Send, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getAuth } from "firebase/auth";

export default function MeetingAgendaPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { toast } = useToast();
  
  const [meeting, setMeeting] = React.useState<Meeting | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [newItemDesc, setNewItemDesc] = React.useState("");
  const [newItemSubmitter, setNewItemSubmitter] = React.useState("");
  const [isAdding, setIsAdding] = React.useState(false);

  const [isFinalising, setIsFinalising] = React.useState(false);

  const fetchMeeting = React.useCallback(async () => {
    try {
      const docRef = doc(db, "meetings", id);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        setError("Meeting not found");
      } else {
        const data = snap.data();
        setMeeting({
          ...data,
          dateTime: data.dateTime instanceof Timestamp ? data.dateTime.toDate() : data.dateTime,
        } as Meeting);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    if (id) fetchMeeting();
  }, [id, fetchMeeting]);

  // Implicit finalisation (Option A)
  React.useEffect(() => {
    if (meeting && meeting.status === "Draft") {
      const hoursUntil = differenceInHours(meeting.dateTime, new Date());
      if (hoursUntil <= 48 && hoursUntil > 0) {
        // Less than 48 hours away, trigger implicit finalisation if not already triggering
        const autoFinalise = async () => {
          try {
            // Wait, we need the PDF generated on the client
            const { generateAgendaPdfBase64 } = await import('@/lib/pdf-utils');
            const { base64, filename } = await generateAgendaPdfBase64(meeting);

            await fetch(`/api/meetings/finalise`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ meetingId: id, pdfBase64: base64, pdfFilename: filename }),
            });
            fetchMeeting(); // refresh to show "Agenda Finalised"
          } catch (e) {
            console.error("Auto finalisation failed", e);
          }
        };
        // We will show a warning in the UI, and the API will finalise it.
        autoFinalise();
      }
    }
  }, [meeting, id, fetchMeeting]);

  const handleAddItem = async () => {
    if (!newItemDesc || !newItemSubmitter) return;
    setIsAdding(true);
    try {
      const newAgendaItem: AgendaItem = {
        id: crypto.randomUUID(),
        description: newItemDesc,
        submitterName: newItemSubmitter,
        actionItems: [],
      };
      
      const docRef = doc(db, "meetings", id);
      await updateDoc(docRef, {
        agendaItems: arrayUnion(newAgendaItem),
      });

      setNewItemDesc("");
      toast({ title: "Item Added", description: "Agenda item successfully added." });
      await fetchMeeting();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setIsAdding(false);
    }
  };

  const handleManualFinalise = async () => {
    setIsFinalising(true);
    try {
      const { generateAgendaPdfBase64 } = await import('@/lib/pdf-utils');
      const { base64, filename } = await generateAgendaPdfBase64(meeting!);

      const res = await fetch(`/api/meetings/finalise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId: id, pdfBase64: base64, pdfFilename: filename }),
      });
      if (!res.ok) throw new Error("Failed to finalise agenda");
      
      toast({ title: "Agenda Finalised", description: "Agenda has been locked and emailed to attendees." });
      await fetchMeeting();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setIsFinalising(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (error || !meeting) {
    return <div className="text-center p-12 text-destructive">{error || "Meeting not found"}</div>;
  }

  const hoursUntil = differenceInHours(meeting.dateTime, new Date());
  const showAutoFinaliseWarning = meeting.status === "Draft" && hoursUntil <= 48 && hoursUntil > 0;
  const isLocked = meeting.status !== "Draft";

  // Check if current user is the creator
  const auth = getAuth();
  const isCreator = auth.currentUser?.uid === meeting.creatorId;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meeting Agenda</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <Calendar className="h-4 w-4" /> {format(meeting.dateTime, "PPP p")} | {meeting.location || "No location set"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={meeting.status === "Draft" ? "secondary" : "default"} className="text-sm px-3 py-1">
            {meeting.status}
          </Badge>
          {isCreator && meeting.status === "Draft" && (
            <Button onClick={handleManualFinalise} disabled={isFinalising}>
              {isFinalising ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Finalise & Email Agenda
            </Button>
          )}
        </div>
      </div>

      {showAutoFinaliseWarning && (
        <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-4">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle>Agenda Auto-Finalisation Triggered</AlertTitle>
          <AlertDescription>
            This meeting is less than 48 hours away. The agenda is automatically being finalised and an email will be sent to all attendees shortly. You can no longer add items once it completes.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{meeting.title}</CardTitle>
          <CardDescription>
            {meeting.invitees?.length || 0} attendees invited.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2 flex items-center gap-2">
              <FileText className="h-5 w-5" /> Agenda Items
            </h3>
            
            {meeting.agendaItems && meeting.agendaItems.length > 0 ? (
              <div className="space-y-4">
                {meeting.agendaItems.map((item, i) => (
                  <div key={item.id} className="p-4 border rounded-md bg-card shadow-sm">
                    <div className="flex gap-3">
                      <div className="font-bold text-muted-foreground">{i + 1}.</div>
                      <div className="flex-1 space-y-1">
                        <p className="font-medium text-base">{item.description}</p>
                        <p className="text-sm text-muted-foreground">Submitted by: {item.submitterName}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground italic py-4">No agenda items submitted yet.</p>
            )}
          </div>

          {!isLocked && !showAutoFinaliseWarning && (
            <div className="bg-muted/50 p-6 rounded-lg border border-dashed mt-8">
              <h4 className="font-semibold mb-4 text-lg">Add an Agenda Item</h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Your Name</label>
                  <Input 
                    placeholder="John Doe" 
                    value={newItemSubmitter} 
                    onChange={(e) => setNewItemSubmitter(e.target.value)} 
                    disabled={isAdding}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Item Description</label>
                  <Textarea 
                    placeholder="Briefly describe the topic..." 
                    value={newItemDesc} 
                    onChange={(e) => setNewItemDesc(e.target.value)}
                    disabled={isAdding}
                  />
                </div>
                <Button onClick={handleAddItem} disabled={!newItemSubmitter || !newItemDesc || isAdding}>
                  {isAdding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  Submit Item
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
