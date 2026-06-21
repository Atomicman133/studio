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
import { format } from "date-fns";
import { Loader2, Plus, Trash2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStaff } from "@/hooks/useStaffData";

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
      meetingTime: "",
    },
  });

  const { fields: inviteeFields, append: appendInvitee, remove: removeInvitee } = useFieldArray({
    control: form.control,
    name: "invitees",
  });

  const [customName, setCustomName] = React.useState("");
  const [customEmail, setCustomEmail] = React.useState("");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const filteredStaff = React.useMemo(() => {
    if (!searchTerm.trim()) return staffList;
    const query = searchTerm.toLowerCase();
    return staffList.filter((staff) => {
      const fullName = `${staff.rank || ""} ${staff.firstName || ""} ${staff.lastName || ""}`.toLowerCase();
      const email = (staff.email || "").toLowerCase();
      return fullName.includes(query) || email.includes(query);
    });
  }, [staffList, searchTerm]);

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
                <FormControl>
                  <Input 
                    type="date"
                    value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                    onChange={(e) => {
                      if (e.target.value) {
                        // Parse as local date at noon to avoid timezone shift issues
                        const [year, month, day] = e.target.value.split('-').map(Number);
                        field.onChange(new Date(year, month - 1, day, 12, 0, 0));
                      } else {
                        field.onChange(undefined);
                      }
                    }}
                    disabled={isSubmitting}
                  />
                </FormControl>
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
                  <Input type="time" placeholder="14:30" value={field.value || ""} onChange={field.onChange} disabled={isSubmitting} />
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
                <Input placeholder="e.g., HQ Room 1 or Teams Link" value={field.value || ""} onChange={field.onChange} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4 border p-4 rounded-md">
          <FormLabel>Invitees</FormLabel>
          <FormDescription>Select staff members or add custom guests. They will receive an email invitation to the agenda page.</FormDescription>
          
          <div className="flex flex-col md:flex-row gap-4 items-start">
            <div className="w-full md:w-1/2 relative" ref={dropdownRef}>
              <p className="text-sm font-medium mb-2">Select Staff</p>
              <Input
                type="text"
                placeholder={isLoadingStaff ? "Loading staff..." : "Search staff members..."}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                disabled={isSubmitting || isLoadingStaff}
              />
              {isOpen && !isLoadingStaff && (
                <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
                  {filteredStaff.length === 0 ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">No staff found.</div>
                  ) : (
                    <div className="space-y-1">
                      {filteredStaff.map((staff) => {
                        const isSelected = inviteeFields.some((i) => i.staffId === staff.id);
                        return (
                          <button
                            key={staff.id}
                            type="button"
                            className={cn(
                              "relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground text-left transition-colors",
                              isSelected && "bg-accent/50"
                            )}
                            onClick={() => {
                              handleToggleStaff(staff);
                            }}
                          >
                            <div className={cn("mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary", isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible")}>
                              <Check className="h-4 w-4" />
                            </div>
                            <span>{staff.rank} {staff.firstName} {staff.lastName}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
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
