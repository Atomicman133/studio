"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Meeting, AgendaItem, ActionItem, MeetingInvitee } from "../../meeting-schema";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, Users, Play, Send, Calendar, CheckSquare, ListTodo } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const parseActionDueDate = (dueDate: any): string => {
  if (!dueDate) return "";
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
  return dateObj.toISOString().split('T')[0];
};

export default function ConductMeetingPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { toast } = useToast();
  
  const [meeting, setMeeting] = React.useState<Meeting | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [saving, setSaving] = React.useState(false);
  const [compiling, setCompiling] = React.useState(false);

  // Local state for the conduct form
  const [presentEmails, setPresentEmails] = React.useState<string[]>([]);
  const [adhocAttendees, setAdhocAttendees] = React.useState<string[]>([]);
  const [newAdhoc, setNewAdhoc] = React.useState("");
  const [agendaItems, setAgendaItems] = React.useState<AgendaItem[]>([]);

  const fetchMeeting = React.useCallback(async () => {
    try {
      const docRef = doc(db, "meetings", id);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        setError("Meeting not found");
      } else {
        const data = snap.data();
        const m = {
          ...data,
          dateTime: data.dateTime?.toDate ? data.dateTime.toDate() : new Date(data.dateTime),
        } as Meeting;
        
        setMeeting(m);
        setPresentEmails(m.attendeesPresentEmails || []);
        setAdhocAttendees(m.adhocAttendees || []);
        setAgendaItems(m.agendaItems || []);
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

  const handleTogglePresent = (email: string) => {
    setPresentEmails(prev => 
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  const handleAddAdhoc = () => {
    if (newAdhoc.trim()) {
      setAdhocAttendees(prev => [...prev, newAdhoc.trim()]);
      setNewAdhoc("");
    }
  };

  const handleRemoveAdhoc = (index: number) => {
    setAdhocAttendees(prev => prev.filter((_, i) => i !== index));
  };

  const updateAgendaNotes = (index: number, notesText: string) => {
    const updated = [...agendaItems];
    updated[index] = { ...updated[index], notes: notesText };
    setAgendaItems(updated);
  };

  const handleAddOtherBusiness = () => {
    const newItem: AgendaItem = {
      id: crypto.randomUUID(),
      description: "Other Business",
      submitterName: "Meeting Chair",
      notes: "",
      actionItems: [],
    };
    setAgendaItems(prev => [...prev, newItem]);
  };

  const addActionItem = (agendaIndex: number) => {
    const updated = [...agendaItems];
    const newAction: ActionItem = { id: crypto.randomUUID(), description: "", assignee: "", carriedForward: false, dueDate: null };
    updated[agendaIndex] = { 
      ...updated[agendaIndex], 
      actionItems: [...(updated[agendaIndex].actionItems || []), newAction] 
    };
    setAgendaItems(updated);
  };

  const updateActionItem = (agendaIndex: number, actionIndex: number, field: keyof ActionItem, value: any) => {
    const updated = [...agendaItems];
    const actions = [...(updated[agendaIndex].actionItems || [])];
    actions[actionIndex] = { ...actions[actionIndex], [field]: value };
    updated[agendaIndex] = { ...updated[agendaIndex], actionItems: actions };
    setAgendaItems(updated);
  };

  const removeActionItem = (agendaIndex: number, actionIndex: number) => {
    const updated = [...agendaItems];
    const actions = [...(updated[agendaIndex].actionItems || [])];
    actions.splice(actionIndex, 1);
    updated[agendaIndex] = { ...updated[agendaIndex], actionItems: actions };
    setAgendaItems(updated);
  };

  const handleSaveProgress = async () => {
    setSaving(true);
    try {
      const docRef = doc(db, "meetings", id);
      await updateDoc(docRef, {
        attendeesPresentEmails: presentEmails,
        adhocAttendees: adhocAttendees,
        agendaItems: agendaItems,
      });
      toast({ title: "Progress Saved", description: "Meeting details updated successfully." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error Saving", description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleCompileMinutes = async () => {
    setCompiling(true);
    // Auto-save before compile
    await handleSaveProgress();

    try {
      const compileRes = await fetch(`/api/meetings/compile-minutes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId: id }),
      });
      
      if (!compileRes.ok) throw new Error("Failed to compile minutes");
      const { compiledText } = await compileRes.json();

      const { generateMinutesPdfBase64 } = await import('@/lib/pdf-utils');
      const { base64, filename } = await generateMinutesPdfBase64(meeting!, compiledText);

      const sendRes = await fetch(`/api/meetings/send-minutes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId: id, pdfBase64: base64, pdfFilename: filename }),
      });

      if (!sendRes.ok) throw new Error("Failed to send minutes email");
      
      toast({ title: "Minutes Compiled & Sent", description: "AI has compiled the minutes and emailed attendees." });
      router.push("/meetings");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Compilation Error", description: err.message });
    } finally {
      setCompiling(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (error || !meeting) {
    return <div className="text-center p-12 text-destructive">{error || "Meeting not found"}</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sticky top-16 bg-background/95 backdrop-blur z-10 py-4 border-b">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Conduct Meeting</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <Calendar className="h-4 w-4" /> {format(meeting.dateTime, "PPP p")} | {meeting.location || "No location set"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSaveProgress} disabled={saving || compiling}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : "Save Progress"}
          </Button>
          <Button onClick={handleCompileMinutes} disabled={saving || compiling} className="bg-green-600 hover:bg-green-700">
            {compiling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
            Compile Minutes & End
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" /> Attendance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm mb-2 text-muted-foreground uppercase tracking-wider">Invitees</h4>
                {meeting.invitees && meeting.invitees.length > 0 ? (
                  <div className="space-y-2">
                    {meeting.invitees.map((invitee) => (
                      <div key={invitee.email} className="flex items-center space-x-2 bg-muted/50 p-2 rounded-md">
                        <Checkbox 
                          id={`present-${invitee.email}`} 
                          checked={presentEmails.includes(invitee.email)}
                          onCheckedChange={() => handleTogglePresent(invitee.email)}
                        />
                        <label htmlFor={`present-${invitee.email}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer">
                          {invitee.name}
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm italic text-muted-foreground">No invitees.</p>
                )}
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-2 text-muted-foreground uppercase tracking-wider">Adhoc Attendees</h4>
                <div className="space-y-2 mb-2">
                  {adhocAttendees.map((name, i) => (
                    <div key={i} className="flex items-center justify-between bg-muted/50 p-2 rounded-md text-sm">
                      <span>{name}</span>
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveAdhoc(i)} className="h-6 w-6 p-0 text-destructive">
                        &times;
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Guest Name" 
                    value={newAdhoc} 
                    onChange={e => setNewAdhoc(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && handleAddAdhoc()}
                    className="h-8 text-sm"
                  />
                  <Button variant="secondary" size="sm" onClick={handleAddAdhoc} className="h-8 px-2">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-xl flex items-center gap-2">
                <CheckSquare className="h-5 w-5" /> Agenda & Notes
              </CardTitle>
              <Button type="button" size="sm" onClick={handleAddOtherBusiness} variant="outline">
                <Plus className="h-4 w-4 mr-1" /> Add Other Business
              </Button>
            </CardHeader>
            <CardContent className="space-y-8">
              {agendaItems.length === 0 ? (
                <p className="text-muted-foreground italic">No agenda items for this meeting.</p>
              ) : (
                agendaItems.map((item, i) => (
                  <div key={item.id} className="p-4 border rounded-lg bg-card shadow-sm space-y-4">
                    <div className="flex gap-3 items-start">
                      <div className="font-bold text-xl text-primary">{i + 1}.</div>
                      <div className="flex-1 col-span-1">
                        {item.description.startsWith("Other Business") || item.submitterName === "Meeting Chair" ? (
                          <Input
                            value={item.description}
                            onChange={(e) => {
                              const updated = [...agendaItems];
                              updated[i] = { ...updated[i], description: e.target.value };
                              setAgendaItems(updated);
                            }}
                            className="font-semibold text-lg h-9 mb-1"
                            placeholder="Other Business Title"
                          />
                        ) : (
                          <p className="font-semibold text-lg">{item.description}</p>
                        )}
                        <p className="text-sm text-muted-foreground">Submitted by: {item.submitterName}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mt-4 pl-7">
                      <label className="text-sm font-semibold">Discussion Notes</label>
                      <Textarea 
                        placeholder="Type notes discussed during this topic..." 
                        value={item.notes || ""}
                        onChange={(e) => updateAgendaNotes(i, e.target.value)}
                        className="min-h-[100px] font-sans"
                      />
                    </div>

                    <div className="space-y-3 mt-4 pl-7">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold flex items-center gap-2">
                          <ListTodo className="h-4 w-4" /> Action Items
                        </label>
                        <Button variant="outline" size="sm" onClick={() => addActionItem(i)}>
                          <Plus className="h-4 w-4 mr-1" /> Add Action
                        </Button>
                      </div>
                      
                      {item.actionItems && item.actionItems.length > 0 ? (
                        <div className="space-y-3">
                          {item.actionItems.map((action, ai) => (
                            <div key={action.id} className="grid grid-cols-12 gap-2 items-center bg-muted/30 p-2 rounded-md border border-dashed">
                              <div className="col-span-12 md:col-span-5">
                                <Input 
                                  placeholder="What needs to be done?" 
                                  value={action.description} 
                                  onChange={e => updateActionItem(i, ai, "description", e.target.value)}
                                  className="h-8"
                                />
                              </div>
                              <div className="col-span-6 md:col-span-3">
                                <Input 
                                  placeholder="Assignee" 
                                  value={action.assignee} 
                                  onChange={e => updateActionItem(i, ai, "assignee", e.target.value)}
                                  className="h-8"
                                />
                              </div>
                              <div className="col-span-5 md:col-span-3">
                                <Input 
                                  type="date"
                                  value={parseActionDueDate(action.dueDate)} 
                                  onChange={e => updateActionItem(i, ai, "dueDate", e.target.value ? new Date(e.target.value) : null)}
                                  className="h-8 text-xs"
                                />
                              </div>
                              <div className="col-span-1 md:col-span-1 flex justify-end">
                                <Button variant="ghost" size="sm" onClick={() => removeActionItem(i, ai)} className="h-8 w-8 p-0 text-destructive">
                                  &times;
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No action items assigned for this topic.</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
