
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { meetingSchema, type Meeting } from "../meeting-schema";
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
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MeetingFormProps {
  onSubmit: (data: Meeting) => void;
  defaultValues?: Partial<Meeting>;
  onCancel: () => void;
  isEditing: boolean;
}

export function MeetingForm({ onSubmit, defaultValues, onCancel, isEditing }: MeetingFormProps) {
  const form = useForm<Meeting>({
    resolver: zodResolver(meetingSchema),
    defaultValues: defaultValues || {
      title: "",
      date: undefined,
      attendees: "",
      agenda: "",
      discussionPoints: "",
      decisionsMade: "",
      actionItemsText: "",
    },
  });

  const handleSubmit = (data: Meeting) => {
    onSubmit(data);
    if (!isEditing) {
      form.reset();
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

        <FormField
          control={form.control}
          name="agenda"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Agenda</FormLabel>
              <FormControl>
                <Textarea placeholder="Meeting agenda items..." {...field} rows={3} />
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
          <Button type="submit">{isEditing ? "Save Changes" : "Log Meeting"}</Button>
        </div>
      </form>
    </Form>
  );
}
