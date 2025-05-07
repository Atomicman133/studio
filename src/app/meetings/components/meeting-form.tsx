
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { meetingFormSchema, type Meeting, type MeetingFormData } from "../meeting-schema";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { convertFileToDataUrl } from "@/lib/utils"; // Assuming convertFileToDataUrl is moved to lib/utils

interface MeetingFormProps {
  onSubmit: (data: Meeting) => void; // Expects the final Meeting type
  defaultValues?: Partial<Meeting>; // Default values for Meeting type
  onCancel: () => void;
  isEditing: boolean;
}

export function MeetingForm({ onSubmit, defaultValues, onCancel, isEditing }: MeetingFormProps) {
  const [currentAgendaFileName, setCurrentAgendaFileName] = React.useState<string | undefined>(defaultValues?.agendaDocumentFileName);

  const form = useForm<MeetingFormData>({
    resolver: zodResolver(meetingFormSchema),
    defaultValues: {
      title: defaultValues?.title || "",
      date: defaultValues?.date || undefined,
      attendees: defaultValues?.attendees || "",
      agendaNotes: defaultValues?.agendaNotes || "",
      agendaDocumentFileName: defaultValues?.agendaDocumentFileName || undefined,
      agendaDocumentDataUrl: defaultValues?.agendaDocumentDataUrl || undefined,
      agendaDocumentFile: undefined, // File input always starts empty
      discussionPoints: defaultValues?.discussionPoints || "",
      decisionsMade: defaultValues?.decisionsMade || "",
      actionItemsText: defaultValues?.actionItemsText || "",
    },
  });

  React.useEffect(() => {
    setCurrentAgendaFileName(defaultValues?.agendaDocumentFileName);
  }, [defaultValues?.agendaDocumentFileName]);

  const handleAgendaFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue("agendaDocumentFile", file, { shouldValidate: true });
      setCurrentAgendaFileName(file.name);
    } else {
      form.setValue("agendaDocumentFile", undefined);
      // If clearing input and it's an edit form with existing file, keep currentAgendaFileName as is until explicit removal
    }
  };

  const handleRemoveAgendaDocument = () => {
    form.setValue("agendaDocumentFile", undefined, { shouldValidate: true });
    form.setValue("agendaDocumentFileName", undefined);
    form.setValue("agendaDocumentDataUrl", undefined);
    setCurrentAgendaFileName(undefined);
  };

  const handleSubmit = async (data: MeetingFormData) => {
    let agendaDocumentInfo: Partial<Meeting> = {};
    if (data.agendaDocumentFile) {
      try {
        const { name, dataUrl } = await convertFileToDataUrl(data.agendaDocumentFile);
        agendaDocumentInfo = { agendaDocumentFileName: name, agendaDocumentDataUrl: dataUrl };
      } catch (error) {
        console.error("Error converting agenda document file:", error);
        // Consider showing a toast message here
      }
    } else if (data.agendaDocumentFileName === undefined && data.agendaDocumentDataUrl === undefined && isEditing) {
      // This means the file was explicitly removed during edit
       agendaDocumentInfo = { agendaDocumentFileName: undefined, agendaDocumentDataUrl: undefined };
    }


    const finalMeetingData: Meeting = {
      id: defaultValues?.id || undefined, // Preserve ID if editing
      title: data.title,
      date: data.date,
      attendees: data.attendees,
      agendaNotes: data.agendaNotes,
      discussionPoints: data.discussionPoints,
      decisionsMade: data.decisionsMade,
      actionItemsText: data.actionItemsText,
      // Apply agenda document updates
      agendaDocumentFileName: agendaDocumentInfo.agendaDocumentFileName !== undefined ? agendaDocumentInfo.agendaDocumentFileName : (isEditing ? defaultValues?.agendaDocumentFileName : undefined),
      agendaDocumentDataUrl: agendaDocumentInfo.agendaDocumentDataUrl !== undefined ? agendaDocumentInfo.agendaDocumentDataUrl : (isEditing ? defaultValues?.agendaDocumentDataUrl : undefined),
    };
    
    // If a new file was uploaded, agendaDocumentInfo will have name/dataUrl.
    // If file was removed, data.agendaDocumentFileName/Url from form will be undefined.
    // If no change, rely on defaultValues for existing file info.

    if (data.agendaDocumentFile) { // If new file uploaded, it overrides
        finalMeetingData.agendaDocumentFileName = agendaDocumentInfo.agendaDocumentFileName;
        finalMeetingData.agendaDocumentDataUrl = agendaDocumentInfo.agendaDocumentDataUrl;
    } else if (currentAgendaFileName === undefined && isEditing) { // If file was explicitly removed
        finalMeetingData.agendaDocumentFileName = undefined;
        finalMeetingData.agendaDocumentDataUrl = undefined;
    } else if (isEditing && defaultValues?.agendaDocumentFileName && !data.agendaDocumentFile) { // Keep existing if not removed and no new file
        finalMeetingData.agendaDocumentFileName = defaultValues.agendaDocumentFileName;
        finalMeetingData.agendaDocumentDataUrl = defaultValues.agendaDocumentDataUrl;
    }


    onSubmit(finalMeetingData);

    if (!isEditing) {
      form.reset({
        title: "",
        date: undefined,
        attendees: "",
        agendaNotes: "",
        agendaDocumentFile: undefined,
        agendaDocumentFileName: undefined,
        agendaDocumentDataUrl: undefined,
        discussionPoints: "",
        decisionsMade: "",
        actionItemsText: "",
      });
      setCurrentAgendaFileName(undefined);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Meeting Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Weekly Staff Meeting" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Meeting Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="attendees"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Attendees</FormLabel>
              <FormControl>
                <Input placeholder="e.g., John Doe, Jane Smith" {...field} />
              </FormControl>
              <FormDescription>Comma-separated list of attendee names.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormItem>
          <FormLabel>Agenda Document (Optional)</FormLabel>
           {currentAgendaFileName && !form.watch("agendaDocumentFile") && (
            <div className="text-sm text-muted-foreground mb-2 flex items-center justify-between p-2 border rounded-md">
              <span>Current: {currentAgendaFileName}</span>
              <Button type="button" variant="ghost" size="sm" onClick={handleRemoveAgendaDocument} title="Remove current agenda document">
                <XCircle className="h-4 w-4 mr-1" /> Remove
              </Button>
            </div>
          )}
          <Input
            id="agendaDocumentFile"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
            onChange={handleAgendaFileChange}
            className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
          />
          <FormDescription>Upload PDF, DOC, DOCX, JPG, PNG, or WEBP file (Max 5MB).</FormDescription>
          <FormMessage>{form.formState.errors.agendaDocumentFile?.message}</FormMessage>
        </FormItem>


        <FormField
          control={form.control}
          name="agendaNotes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Agenda Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Key agenda points or notes..." {...field} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="discussionPoints"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Discussion Points (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Key topics discussed..." {...field} rows={4}/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="decisionsMade"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Decisions Made (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Decisions and outcomes..." {...field} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="actionItemsText"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Action Items (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g., - Send report (John Doe, due 2024-12-31)" {...field} rows={4} />
              </FormControl>
              <FormDescription>List action items, assignees, and due dates.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">{isEditing ? "Save Changes" : "Log Meeting Record"}</Button>
        </div>
      </form>
    </Form>
  );
}
