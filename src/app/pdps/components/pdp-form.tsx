
"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { pdpSchema, type Pdp, SMARTGoalSchema, type SMARTGoal } from "../pdp-schema";
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
import { CalendarIcon, PlusCircle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PdpFormProps {
  onSubmit: (data: Pdp) => void;
  defaultValues?: Partial<Pdp>;
  onCancel: () => void;
  isEditing: boolean;
}

export function PdpForm({ onSubmit, defaultValues, onCancel, isEditing }: PdpFormProps) {
  const form = useForm<Pdp>({
    resolver: zodResolver(pdpSchema),
    defaultValues: defaultValues || {
      staffName: "",
      pdpPeriod: "",
      goals: [{ specific: "", measurable: "", achievable: "", relevant: "", timeBound: "", status: "Not Started" }],
      developmentActivities: "",
      reviewDate: undefined,
      feedback: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "goals",
  });

  const handleSubmit = (data: Pdp) => {
    onSubmit(data);
    if (!isEditing) {
     form.reset({
        staffName: "",
        pdpPeriod: "",
        goals: [{ specific: "", measurable: "", achievable: "", relevant: "", timeBound: "", status: "Not Started" }],
        developmentActivities: "",
        reviewDate: undefined,
        feedback: "",
      });
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
              <FormLabel>Staff Member Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Jane Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="pdpPeriod"
          render={({ field }) => (
            <FormItem>
              <FormLabel>PDP Period</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 2024-2025 or Q3 2024" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <FormLabel>SMART Goals</FormLabel>
          {fields.map((field, index) => (
            <Card key={field.id} className="mt-2 mb-4 p-4 space-y-3 shadow-sm border">
              <div className="flex justify-between items-center mb-2">
                <CardTitle className="text-lg">Goal {index + 1}</CardTitle>
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <FormField
                control={form.control}
                name={`goals.${index}.specific`}
                render={({ field: goalField }) => (
                  <FormItem>
                    <FormLabel>Specific</FormLabel>
                    <FormControl><Input placeholder="What do you want to accomplish?" {...goalField} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`goals.${index}.measurable`}
                render={({ field: goalField }) => (
                  <FormItem>
                    <FormLabel>Measurable</FormLabel>
                    <FormControl><Input placeholder="How will you track progress?" {...goalField} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`goals.${index}.achievable`}
                render={({ field: goalField }) => (
                  <FormItem>
                    <FormLabel>Achievable</FormLabel>
                    <FormControl><Input placeholder="Is it realistic?" {...goalField} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`goals.${index}.relevant`}
                render={({ field: goalField }) => (
                  <FormItem>
                    <FormLabel>Relevant</FormLabel>
                    <FormControl><Input placeholder="Why is this goal important?" {...goalField} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`goals.${index}.timeBound`}
                render={({ field: goalField }) => (
                  <FormItem>
                    <FormLabel>Time-bound</FormLabel>
                    <FormControl><Input placeholder="What is the deadline?" {...goalField} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`goals.${index}.status`}
                render={({ field: goalField }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={goalField.onChange} defaultValue={goalField.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {["Not Started", "In Progress", "Completed", "On Hold"].map(status => (
                          <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Card>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => append({ specific: "", measurable: "", achievable: "", relevant: "", timeBound: "", status: "Not Started" })}
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Add Goal
          </Button>
           {form.formState.errors.goals && !form.formState.errors.goals.root && !Array.isArray(form.formState.errors.goals) && (
             <p className="text-sm font-medium text-destructive mt-1">{form.formState.errors.goals.message}</p>
           )}
        </div>

        <FormField
          control={form.control}
          name="developmentActivities"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Development Activities (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g., Attend leadership course, seek mentorship from SQNLDR X" {...field} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
            control={form.control}
            name="reviewDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Next Review Date (Optional)</FormLabel>
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
          name="feedback"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Feedback / Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Any feedback or notes related to this PDP..." {...field} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">{isEditing ? "Save Changes" : "Create PDP"}</Button>
        </div>
      </form>
    </Form>
  );
}
