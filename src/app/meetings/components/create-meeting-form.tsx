"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createMeetingFormSchema, type CreateMeetingFormData } from "../meeting-schema";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Plus, Trash2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStaff } from "@/hooks/useStaffData";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

interface CreateMeetingFormProps {
  onSubmit: (data: CreateMeetingFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function CreateMeetingForm({ onSubmit, onCancel, isSubmitting }: CreateMeetingFormProps) {
  const { data: staffList = [], isLoading: isLoadingStaff } = useStaff();

  const form = useForm<CreateMeetingFormData>({
    resolver: zodResolver(createMeetingFormSchema),
    defaultValues: {
      title: "",
      location: "",
      invitees: [],
    },
  });

  const { fields: inviteeFields, append: appendInvitee, remove: removeInvitee } = useFieldArray({
    control: form.control,
    name: "invitees",
  });

  const [customName, setCustomName] = React.useState("");
  const [customEmail, setCustomEmail] = React.useState("");

  const handleAddCustomInvitee = () => {
    if (customName && customEmail) {
      appendInvitee({ name: customName, email: customEmail });
      setCustomName("");
      setCustomEmail("");
    }
  };

  const handleToggleStaff = (staff: any) => {
    const existingIndex = inviteeFields.findIndex((i) => i.staffId === staff.id);
    if (existingIndex >= 0) {
      removeInvitee(existingIndex);
    } else {
      appendInvitee({
        staffId: staff.id,
        name: `${staff.rank} ${staff.firstName} ${staff.lastName}`,
        email: staff.email,
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="meetingDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Meeting Date</FormLabel>
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
                <FormLabel>Meeting Time (24h)</FormLabel>
                <FormControl>
                  <Input type="time" placeholder="14:30" {...field} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location / Link (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., HQ Room 1 or Teams Link" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4 border p-4 rounded-md">
          <FormLabel>Invitees</FormLabel>
          <FormDescription>Select staff members or add custom guests. They will receive an email invitation to the agenda page.</FormDescription>
          
          <div className="flex flex-col md:flex-row gap-4 items-start">
            <div className="w-full md:w-1/2">
              <p className="text-sm font-medium mb-2">Select Staff</p>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between" disabled={isSubmitting || isLoadingStaff}>
                    {isLoadingStaff ? "Loading staff..." : "Select staff members..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search staff..." />
                    <CommandList>
                      <CommandEmpty>No staff found.</CommandEmpty>
                      <CommandGroup>
                        {staffList.map((staff) => {
                          const isSelected = inviteeFields.some((i) => i.staffId === staff.id);
                          return (
                            <CommandItem key={staff.id} onSelect={() => handleToggleStaff(staff)}>
                              <div className={cn("mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary", isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible")}>
                                <Check className={cn("h-4 w-4")} />
                              </div>
                              {staff.rank} {staff.firstName} {staff.lastName}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="w-full md:w-1/2 space-y-2">
               <p className="text-sm font-medium">Add Custom Guest</p>
               <div className="flex gap-2">
                 <Input placeholder="Name" value={customName} onChange={(e) => setCustomName(e.target.value)} disabled={isSubmitting} className="flex-1" />
                 <Input placeholder="Email" type="email" value={customEmail} onChange={(e) => setCustomEmail(e.target.value)} disabled={isSubmitting} className="flex-1" />
                 <Button type="button" onClick={handleAddCustomInvitee} disabled={!customName || !customEmail || isSubmitting} variant="secondary">
                   <Plus className="h-4 w-4" />
                 </Button>
               </div>
            </div>
          </div>

          <div className="mt-4">
            {inviteeFields.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No invitees added yet.</p>
            ) : (
              <ul className="space-y-2">
                {inviteeFields.map((field, index) => (
                  <li key={field.id} className="flex justify-between items-center text-sm p-2 bg-secondary/20 rounded-md">
                    <div>
                      <span className="font-medium">{field.name}</span> <span className="text-muted-foreground text-xs">({field.email})</span>
                      {field.staffId && <span className="ml-2 text-[10px] bg-primary/10 text-primary px-1 rounded">Staff</span>}
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeInvitee(index)} disabled={isSubmitting} className="h-6 w-6 p-0 text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <FormMessage>{form.formState.errors.invitees?.message}</FormMessage>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create & Send Invites
          </Button>
        </div>
      </form>
    </Form>
  );
}
