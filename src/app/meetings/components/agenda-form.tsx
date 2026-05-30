
"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { agendaFormSchema, type AgendaFormData } from "../meeting-schema";
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
import { CalendarIcon, PlusCircle, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AgendaFormProps {
  onSubmit: (data: AgendaFormData) => Promise<void>; // Make onSubmit async
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function AgendaForm({ onSubmit, onCancel, isSubmitting }: AgendaFormProps) {
  const form = useForm<AgendaFormData>({
    resolver: zodResolver(agendaFormSchema),
    defaultValues: {
      meetingTitle: "",
      meetingDate: undefined,
      meetingTime: "",
      meetingLocation: "",
      meetingObjective: "",
      agendaItems: [{ description: "", presenter: "", timeAllocation: "" }], // Initialize optional fields
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "agendaItems",
  });

  const handleFormSubmit = async (data: AgendaFormData) => {
    await onSubmit(data);
    // Resetting form should be handled by parent if dialog closes on success
    // form.reset(); // Or reset selectively
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Meeting Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="meetingTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meeting Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Monthly Planning Session" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="meetingDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
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
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus disabled={isSubmitting} />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="meetingTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time</FormLabel>
                    <FormControl>
                      <Input type="time" placeholder="HH:MM" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="meetingLocation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location / Virtual Meeting Link (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Conference Room A / https://meet.example.com/123" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="meetingObjective"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Objective / Purpose (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Purpose of this meeting..." {...field} rows={2} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agenda Items</CardTitle>
            <FormDescription>Items to be discussed during the meeting. These will not be saved but used for PDF export.</FormDescription>
          </CardHeader>
          <CardContent>
            {fields.map((field, index) => (
              <Card key={field.id} className="mb-4 p-4 space-y-3 shadow-sm border">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold text-md">Item {index + 1}</h4>
                  {fields.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => remove(index)} disabled={isSubmitting}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <FormField
                  control={form.control}
                  name={`agendaItems.${index}.description`}
                  render={({ field: itemField }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl><Textarea placeholder="Describe the agenda item" {...itemField} rows={2} disabled={isSubmitting} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name={`agendaItems.${index}.presenter`}
                    render={({ field: itemField }) => (
                      <FormItem>
                        <FormLabel>Presenter (Optional)</FormLabel>
                        <FormControl><Input placeholder="e.g., John Doe" {...itemField} disabled={isSubmitting} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`agendaItems.${index}.timeAllocation`}
                    render={({ field: itemField }) => (
                      <FormItem>
                        <FormLabel>Time Allocation (Optional)</FormLabel>
                        <FormControl><Input placeholder="e.g., 15 mins" {...itemField} disabled={isSubmitting} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </Card>
            ))}
            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => append({ description: "", presenter: "", timeAllocation: "" })} disabled={isSubmitting}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Agenda Item
            </Button>
             {form.formState.errors.agendaItems && !Array.isArray(form.formState.errors.agendaItems) && (
                <p className="text-sm font-medium text-destructive mt-1">{form.formState.errors.agendaItems.message}</p>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Schedule Meeting & Export Agenda PDF
          </Button>
        </div>
      </form>
    </Form>
  );
}
