
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { recordOfConversationSchema, type RecordOfConversation } from "../discipline-schema";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecordOfConversationFormProps {
  onSubmit: (data: RecordOfConversation) => void;
  defaultValues?: Partial<RecordOfConversation>;
  onCancel: () => void;
  isEditing: boolean;
  isSubmitting?: boolean; // For loading state
}

export function RecordOfConversationForm({ onSubmit, defaultValues, onCancel, isEditing, isSubmitting }: RecordOfConversationFormProps) {
  const form = useForm<RecordOfConversation>({
    resolver: zodResolver(recordOfConversationSchema),
    defaultValues: defaultValues || {
      referenceNumber: "",
      interviewingOfficerName: "",
      interviewingOfficerPosition: "",
      interviewDate: undefined,
      interviewTime: "",
      interviewType: undefined,
      subject: "",
      personsPresent: "",
      conversationWithName: "",
      conversationWithDeptUnitFirm: "",
      conversationWithSquadron: "",
      conversationWithTelephone: "",
      background: "",
      conversation: "",
      actionsTaken: "",
      questionsAsked: "",
      followUp: "",
    },
  });

  const handleSubmit = (data: RecordOfConversation) => {
    onSubmit(data); // ID logic handled by parent
    if (!isEditing) {
      form.reset();
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="referenceNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reference/CEA Incident Number (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., CEA2024/001" {...field} disabled={isSubmitting}/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="interviewingOfficerName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Interviewing Officer</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., FLTLT John Doe" {...field} disabled={isSubmitting}/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="interviewingOfficerPosition"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Interviewing Officer Position</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Wing XSO" {...field} disabled={isSubmitting}/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="interviewDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date of Interview</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                        disabled={isSubmitting}
                      >
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus disabled={isSubmitting}/>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="interviewTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Time</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 14:30" {...field} disabled={isSubmitting}/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="interviewType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Interview Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="In Person">In Person</SelectItem>
                    <SelectItem value="Telephone Conversation">Telephone Conversation</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subject</FormLabel>
              <FormControl>
                <Input placeholder="Subject of the conversation" {...field} disabled={isSubmitting}/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="personsPresent"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Persons Present (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="List all persons present..." {...field} rows={2} disabled={isSubmitting}/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="border p-4 rounded-md space-y-4">
            <h3 className="text-lg font-medium">Conversation With</h3>
            <FormField
            control={form.control}
            name="conversationWithName"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Name (including title or rank)</FormLabel>
                <FormControl>
                    <Input placeholder="e.g., SGT Jane Citizen" {...field} disabled={isSubmitting}/>
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="conversationWithDeptUnitFirm"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Department, Unit, or Firm (inc. address) (Optional)</FormLabel>
                <FormControl>
                    <Input placeholder="e.g., 702 SQN, 123 Fake St, Anytown" {...field} disabled={isSubmitting}/>
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="conversationWithSquadron"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Squadron (Optional)</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., 702 Squadron" {...field} disabled={isSubmitting}/>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="conversationWithTelephone"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Telephone Number (Optional)</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., 0400123456" {...field} disabled={isSubmitting}/>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
        </div>


        <FormField
          control={form.control}
          name="background"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Background</FormLabel>
              <FormControl>
                <Textarea placeholder="Provide background information leading to this conversation..." {...field} rows={4} disabled={isSubmitting}/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="conversation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Conversation</FormLabel>
              <FormControl>
                <Textarea placeholder="Detail the conversation, key points discussed..." {...field} rows={6} disabled={isSubmitting}/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="actionsTaken"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Actions (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Actions taken or agreed upon..." {...field} rows={3} disabled={isSubmitting}/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="questionsAsked"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Questions (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Key questions asked during the conversation..." {...field} rows={3} disabled={isSubmitting}/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="followUp"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Follow Up (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Follow-up actions or notes..." {...field} rows={3} disabled={isSubmitting}/>
              </FormControl>
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
            {isEditing ? "Save Changes" : "Record Conversation"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
