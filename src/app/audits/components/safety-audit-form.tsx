
"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { auditSchema, type SafetyAudit, auditFindingSchema, type AuditFinding } from "../audit-schema";
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

interface SafetyAuditFormProps {
  onSubmit: (data: SafetyAudit) => void;
  defaultValues?: Partial<SafetyAudit>;
  onCancel: () => void;
  isEditing: boolean;
}

export function SafetyAuditForm({ onSubmit, defaultValues, onCancel, isEditing }: SafetyAuditFormProps) {
  const form = useForm<SafetyAudit>({
    resolver: zodResolver(auditSchema),
    defaultValues: defaultValues || {
      auditTitle: "",
      auditType: "",
      auditDate: undefined,
      auditorName: "",
      scope: "",
      summary: "",
      findings: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "findings",
  });

  const handleSubmit = (data: SafetyAudit) => {
    onSubmit(data);
    if (!isEditing) {
      form.reset({
        auditTitle: "",
        auditType: "",
        auditDate: undefined,
        auditorName: "",
        scope: "",
        summary: "",
        findings: [],
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="auditTitle"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Audit Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Quarterly Barracks Safety Inspection" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="auditType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type of Audit</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Work Area Inspection, Facility Safety Check" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
            control={form.control}
            name="auditDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date of Audit</FormLabel>
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
          name="auditorName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Auditor(s) Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., FLTLT Safety Officer" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="scope"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Scope of Audit</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Squadron HQ Building, All Flight Simulators" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="summary"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Overall Summary (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Brief overview of the audit's findings and general state..." {...field} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <FormLabel>Findings / Corrective Actions</FormLabel>
          {fields.map((field, index) => (
            <Card key={field.id} className="mt-2 mb-4 p-4 space-y-3 shadow-sm border">
              <div className="flex justify-between items-center mb-2">
                <CardTitle className="text-lg">Finding {index + 1}</CardTitle>
                 <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
              </div>
              <FormField
                control={form.control}
                name={`findings.${index}.description`}
                render={({ field: findingField }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea placeholder="Describe the finding or hazard" {...findingField} rows={2} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name={`findings.${index}.severity`}
                  render={({ field: findingField }) => (
                    <FormItem>
                      <FormLabel>Severity</FormLabel>
                      <Select onValueChange={findingField.onChange} defaultValue={findingField.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select severity" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {["Low", "Medium", "High", "Critical"].map(sev => (
                            <SelectItem key={sev} value={sev}>{sev}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name={`findings.${index}.status`}
                  render={({ field: findingField }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={findingField.onChange} defaultValue={findingField.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {["Open", "In Progress", "Resolved", "Closed"].map(stat => (
                            <SelectItem key={stat} value={stat}>{stat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name={`findings.${index}.recommendedAction`}
                render={({ field: findingField }) => (
                  <FormItem>
                    <FormLabel>Recommended Corrective/Preventative Action (Optional)</FormLabel>
                    <FormControl><Textarea placeholder="What needs to be done?" {...findingField} rows={2} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name={`findings.${index}.assignedTo`}
                  render={({ field: findingField }) => (
                    <FormItem>
                      <FormLabel>Assigned To (Optional)</FormLabel>
                      <FormControl><Input placeholder="Name or Role" {...findingField} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`findings.${index}.dueDate`}
                  render={({ field: findingField }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Due Date (Optional)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !findingField.value && "text-muted-foreground")}>
                              {findingField.value ? format(findingField.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={findingField.value} onSelect={findingField.onChange} initialFocus />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Card>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => append({ description: "", severity: "Medium", status: "Open" })}
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Add Finding / CAPA
          </Button>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">{isEditing ? "Save Changes" : "Create Audit Record"}</Button>
        </div>
      </form>
    </Form>
  );
}
