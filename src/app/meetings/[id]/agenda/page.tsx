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
import { Loader2, AlertTriangle, Plus, FileText, Send, Calendar, Users, Mail, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getAuth } from "firebase/auth";
import { useStaff } from "@/hooks/useStaffData";


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

  const { data: staffList = [], isLoading: isLoadingStaff } = useStaff();
  const [staffSearch, setStaffSearch] = React.useState("");
  const [showStaffDropdown, setShowStaffDropdown] = React.useState(false);
  const [customName, setCustomName] = React.useState("");
  const [customEmail, setCustomEmail] = React.useState("");

  const [isResendingInvites, setIsResendingInvites] = React.useState(false);
  const [isResendingAgenda, setIsResendingAgenda] = React.useState(false);
  const [isResendingMinutes, setIsResendingMinutes] = React.useState(false);

  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowStaffDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const existingEmails = React.useMemo(() => {
    return new Set(meeting?.invitees?.map(i => i.email.trim().toLowerCase()) || []);
  }, [meeting]);

  const availableStaff = React.useMemo(() => {
    return staffList.filter(s => s.email && !existingEmails.has(s.email.trim().toLowerCase()));
  }, [staffList, existingEmails]);

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

  const handleAddInvitee = async (name: string, email: string, staffId?: string) => {
    try {
      const newInvitee = { name, email, ...(staffId ? { staffId } : {}) };
      const docRef = doc(db, "meetings", id);
      await updateDoc(docRef, {
        invitees: arrayUnion(newInvitee)
      });
      toast({ title: "Invitee Added", description: `${name} has been added to the meeting.` });
      await fetchMeeting();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error adding invitee", description: err.message });
    }
  };

  const handleResendInvites = async () => {
    setIsResendingInvites(true);
    try {
      const res = await fetch("/api/meetings/send-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId: id }),
      });
      if (!res.ok) throw new Error("Failed to resend invitations");
      toast({ title: "Invites Resent", description: "Meeting invitations have been resent to all invitees." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setIsResendingInvites(false);
    }
  };

  const handleResendAgenda = async () => {
    setIsResendingAgenda(true);
    try {
      const { generateAgendaPdfBase64 } = await import('@/lib/pdf-utils');
      const { base64, filename } = await generateAgendaPdfBase64(meeting!);

      const res = await fetch(`/api/meetings/finalise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId: id, pdfBase64: base64, pdfFilename: filename, resend: true }),
      });
      if (!res.ok) throw new Error("Failed to resend agenda");
      
      toast({ title: "Agenda Resent", description: "Finalised agenda has been resent to all attendees." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setIsResendingAgenda(false);
    }
  };

  const handleResendMinutes = async () => {
    if (!meeting?.minutesCompiledText) {
      toast({ variant: "destructive", title: "Error", description: "Minutes have not been compiled yet." });
      return;
    }
    setIsResendingMinutes(true);
    try {
      const { generateMinutesPdfBase64 } = await import('@/lib/pdf-utils');
      const { base64, filename } = await generateMinutesPdfBase64(meeting, meeting.minutesCompiledText);

      const res = await fetch(`/api/meetings/send-minutes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId: id, pdfBase64: base64, pdfFilename: filename }),
      });
      if (!res.ok) throw new Error("Failed to resend minutes");
      
      toast({ title: "Minutes Resent", description: "Meeting minutes have been resent to all attendees." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setIsResendingMinutes(false);
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
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={meeting.status === "Draft" ? "secondary" : "default"} className="text-sm px-3 py-1">
            {meeting.status}
          </Badge>
          {isCreator && (
            <>
              {meeting.status === "Draft" && (
                <>
                  <Button onClick={handleManualFinalise} disabled={isFinalising}>
                    {isFinalising ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                    Finalise & Email Agenda
                  </Button>
                  <Button variant="outline" onClick={handleResendInvites} disabled={isResendingInvites}>
                    {isResendingInvites ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    Resend Invites
                  </Button>
                </>
              )}
              {(meeting.status === "Agenda Finalised" || meeting.status === "Completed") && (
                <Button variant="outline" onClick={handleResendAgenda} disabled={isResendingAgenda}>
                  {isResendingAgenda ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Resend Agenda
                </Button>
              )}
              {meeting.status === "Completed" && meeting.minutesCompiledText && (
                <Button variant="outline" onClick={handleResendMinutes} disabled={isResendingMinutes}>
                  {isResendingMinutes ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Resend Minutes
                </Button>
              )}
            </>
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

          {/* Invited Attendees */}
          <div className="space-y-3 pt-4 border-t">
            <label className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Invited Attendees
            </label>
            {meeting.invitees && meeting.invitees.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {meeting.invitees.map((invitee) => (
                  <Badge key={invitee.email} variant="secondary" className="px-3 py-1.5 flex items-center gap-1.5 text-sm bg-muted/60">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{invitee.name}</span>
                    <span className="text-xs text-muted-foreground">({invitee.email})</span>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No invitees yet.</p>
            )}
          </div>

          {/* Add Additional Invitees */}
          {isCreator && meeting.status !== "Completed" && (
            <div className="border border-dashed rounded-lg p-4 space-y-4 bg-muted/10 mt-6">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Plus className="h-4 w-4" /> Invite Additional Attendees
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Search Registered Staff */}
                <div className="space-y-2 relative" ref={dropdownRef}>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Squadron Staff Directory</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search staff by name or email..."
                      value={staffSearch}
                      onChange={(e) => {
                        setStaffSearch(e.target.value);
                        setShowStaffDropdown(true);
                      }}
                      onFocus={() => setShowStaffDropdown(true)}
                      className="h-9"
                    />
                    {staffSearch && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setStaffSearch("");
                          setShowStaffDropdown(false);
                        }}
                        className="px-2"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  
                  {showStaffDropdown && staffSearch.trim() && (
                    <div className="absolute z-20 w-full mt-1 bg-popover text-popover-foreground border rounded-md shadow-md max-h-48 overflow-y-auto">
                      {availableStaff
                        .filter(s => {
                          const fullName = `${s.rank || ""} ${s.firstName || ""} ${s.lastName || ""}`.toLowerCase();
                          const email = (s.email || "").toLowerCase();
                          return fullName.includes(staffSearch.toLowerCase()) || email.includes(staffSearch.toLowerCase());
                        })
                        .map((staff) => (
                          <button
                            key={staff.id}
                            type="button"
                            onClick={async () => {
                              await handleAddInvitee(
                                `${staff.rank} ${staff.firstName} ${staff.lastName}`,
                                staff.email,
                                staff.id
                              );
                              setStaffSearch("");
                              setShowStaffDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground border-b last:border-0 flex flex-col"
                          >
                            <span className="text-sm font-semibold">{staff.rank} {staff.firstName} {staff.lastName}</span>
                            <span className="text-xs text-muted-foreground">{staff.email}</span>
                          </button>
                        ))}
                      {availableStaff.filter(s => {
                        const fullName = `${s.rank || ""} ${s.firstName || ""} ${s.lastName || ""}`.toLowerCase();
                        const email = (s.email || "").toLowerCase();
                        return fullName.includes(staffSearch.toLowerCase()) || email.includes(staffSearch.toLowerCase());
                      }).length === 0 && (
                        <div className="px-3 py-2 text-sm text-muted-foreground italic">No matching staff available</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Custom/External Attendee */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Custom Invitee (External)</label>
                  <div className="flex gap-2 flex-col sm:flex-row">
                    <Input
                      placeholder="Full Name"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="h-9 flex-1"
                    />
                    <Input
                      placeholder="Email Address"
                      value={customEmail}
                      type="email"
                      onChange={(e) => setCustomEmail(e.target.value)}
                      className="h-9 flex-1"
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={!customName || !customEmail}
                      onClick={async () => {
                        await handleAddInvitee(customName, customEmail);
                        setCustomName("");
                        setCustomEmail("");
                      }}
                      className="h-9 px-4"
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

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
