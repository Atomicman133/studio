
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { meetingFormSchema, type MeetingFormData } from "../meeting-schema"; // Use MeetingFormData
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
import { CalendarIcon, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MeetingFormProps {
  onSubmit: (data: MeetingFormData) => void; // Now expects MeetingFormData
  defaultValues?: Partial<MeetingFormData>; // defaultValues is MeetingFormData
  onCancel: () => void;
  isEditing: boolean;
  isSubmitting?: boolean; // For loading state
}

export function MeetingForm({ onSubmit, defaultValues, onCancel, isEditing, isSubmitting }: MeetingFormProps) {
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
      agendaDocumentFile: undefined,
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
      // Clear existing filename/dataurl if new file is selected (they will be re-populated on submit)
      form.setValue("agendaDocumentFileName", undefined); 
      form.setValue("agendaDocumentDataUrl", undefined);
    } else {
      form.setValue("agendaDocumentFile", undefined);
      // If input is cleared, we will rely on existing data if editing, or submit undefined if new
      // We need to handle if they previously had a file and cleared it.
      // Let currentAgendaFileName manage what's displayed. Submission logic will sort it out.
    }
  };

  const handleRemoveAgendaDocument = () => {
    form.setValue("agendaDocumentFile", undefined, { shouldValidate: true });
    form.setValue("agendaDocumentFileName", undefined); // Explicitly set to undefined
    form.setValue("agendaDocumentDataUrl", undefined);  // Explicitly set to undefined
    setCurrentAgendaFileName(undefined);
  };

  const handleSubmit = (data: MeetingFormData) => {
    // The parent component (MeetingsPage) will now handle the conversion of file to dataUrl
    // and merge it with other data before calling the mutation.
    // This form just passes the MeetingFormData as is.
    onSubmit(data);

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
                <Input placeholder="e.g., Weekly Staff Meeting" {...field} disabled={isSubmitting} />
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
                      disabled={isSubmitting}
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
                    disabled={isSubmitting}
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
                <Input placeholder="e.g., John Doe, Jane Smith" {...field} disabled={isSubmitting}/>
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
              <Button type="button" variant="ghost" size="sm" onClick={handleRemoveAgendaDocument} title="Remove current agenda document" disabled={isSubmitting}>
                <XCircle className="h-4 w-4 mr-1" /> Remove
              </Button>
            </div>
          )}
          <Input
            id="agendaDocumentFile"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
            onChange={handleAgendaFileChange}
            disabled={isSubmitting}
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
                <Textarea placeholder="Key agenda points or notes..." {...field} rows={3} disabled={isSubmitting}/>
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
                <Textarea placeholder="Key topics discussed..." {...field} rows={4} disabled={isSubmitting}/>
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
                <Textarea placeholder="Decisions and outcomes..." {...field} rows={3} disabled={isSubmitting}/>
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
                <Textarea placeholder="e.g., - Send report (John Doe, due 2024-12-31)" {...field} rows={4} disabled={isSubmitting}/>
              </FormControl>
              <FormDescription>List action items, assignees, and due dates.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Save Changes" : "Log Meeting Record"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
