
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { disciplineActionSchema, type DisciplineAction } from "../discipline-schema";
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
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DisciplineActionFormProps {
  onSubmit: (data: DisciplineAction) => void;
  defaultValues?: Partial<DisciplineAction>;
  onCancel: () => void;
  isEditing: boolean;
}

export function DisciplineActionForm({ onSubmit, defaultValues, onCancel, isEditing }: DisciplineActionFormProps) {
  const form = useForm<DisciplineAction>({
    resolver: zodResolver(disciplineActionSchema),
    defaultValues: defaultValues || {
      staffName: "",
      dateOfIncident: undefined,
      typeOfAction: undefined,
      incidentDescription: "",
      policyBreached: "",
      outcome: "",
      sanctionsApplied: "",
      appealProcessNotes: "",
    },
  });

  const handleSubmit = (data: DisciplineAction) => {
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
          name="staffName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Staff Member Involved</FormLabel>
              <FormControl>
                <Input placeholder="e.g., John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
            control={form.control}
            name="dateOfIncident"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date of Incident</FormLabel>
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
                      disabled={(date) => date > new Date()}
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
          name="typeOfAction"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type of Action</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type of action" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {["Informal Discussion", "Formal Warning", "Suspension", "Other"].map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="incidentDescription"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description of Incident/Breach</FormLabel>
              <FormControl>
                <Textarea placeholder="Detailed account of what happened..." {...field} rows={5} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="policyBreached"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Policy/Regulation Breached (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., AAFC Manual of Ground Training, Section 2.3" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="outcome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Outcome of Action (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g., Staff member counselled, action plan agreed." {...field} rows={3}/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="sanctionsApplied"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sanctions Applied (If any, Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Restricted duties for 1 month" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="appealProcessNotes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Appeal Process Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Details of any appeal lodged or outcomes..." {...field} rows={2} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">{isEditing ? "Save Changes" : "Record Action"}</Button>
        </div>
      </form>
    </Form>
  );
}
