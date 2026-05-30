
"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { squadronVisitSchema, type SquadronVisit } from "../squadron-visit-schema"; // visitActionItemSchema used implicitly
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
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
// import { ScrollArea } from "@/components/ui/scroll-area"; // Not used directly in form, but in page
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


interface SquadronVisitFormProps {
  onSubmit: (data: SquadronVisit) => void;
  defaultValues?: Partial<SquadronVisit>;
  onCancel: () => void;
  isEditing: boolean;
  isSubmitting?: boolean; // For loading state
}

const FormCheckboxItem = ({ control, name, label, disabled }: { control: any, name: keyof SquadronVisit, label: string, disabled?: boolean }) => (
  <FormField
    control={control}
    name={name}
    render={({ field }) => (
      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 shadow-sm bg-background hover:bg-muted/50 transition-colors">
        <FormControl>
          <Checkbox
            checked={field.value as boolean | undefined}
            onCheckedChange={field.onChange}
            disabled={disabled}
          />
        </FormControl>
        <div className="space-y-1 leading-none">
          <FormLabel className={cn("font-normal", disabled ? "cursor-not-allowed text-muted-foreground" : "cursor-pointer")}>{label}</FormLabel>
        </div>
      </FormItem>
    )}
  />
);

export function SquadronVisitForm({ onSubmit, defaultValues, onCancel, isEditing, isSubmitting }: SquadronVisitFormProps) {
  const form = useForm<SquadronVisit>({
    resolver: zodResolver(squadronVisitSchema),
    defaultValues: defaultValues || {
      squadronName: "",
      visitDate: undefined,
      rxoName: "",
      coName: "",
      staffingListReviewed: false,
      staffingVacanciesDiscussed: false,
      staffingSuccessionPlanningNotes: "",
      staffingInductionVerified: false,
      staffingPerformanceIssuesAddressed: false,
      staffingWellbeingCheckConducted: false,
      staffingSectionNotes: "",
      trainingScheduleCurrent: false,
      trainingStaffCurrencyMaintained: false,
      trainingCadetPdpReviewed: false,
      trainingCourseParticipationConfirmed: false,
      trainingRecordsUpToDate: false,
      trainingSectionNotes: "",
      disciplineMattersDiscussed: false,
      disciplineProceduresFollowed: false,
      disciplineSupportProvided: false,
      disciplineRecordKeepingObserved: false,
      disciplineSectionNotes: "",
      activitiesCalendarReviewed: false,
      activitiesExternalApprovalsFlagged: false,
      activitiesPlannedEventsNoted: false,
      activitiesContingencyPlanningChecked: false,
      activitiesEngagementEvaluated: false,
      activitiesSectionNotes: "",
      issuesEquipmentShortages: false,
      issuesFacilityConcerns: false,
      issuesItAdminSupplyProblems: false,
      issuesUnresolvedSupportRequests: false,
      issuesEscalationRequestsNoted: false,
      issuesSectionNotes: "",
      safetyRiskRegisterReviewed: false,
      safetyIssuesAddressed: false,
      safetyIncidentReportsChecked: false,
      safetyFirstAidPpeEmergencyProcedures: false,
      safetyVehicleEquipmentCompliance: false,
      safetySectionNotes: "",
      generalComments: "",
      actionItems: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "actionItems",
  });

  const handleSubmit = (data: SquadronVisit) => {
    onSubmit(data); // ID logic handled by parent
    if (!isEditing) {
      form.reset(); // Reset only if creating new
    }
  };

  const discussionSections = [
    {
      value: "staffing", title: "Staffing",
      items: [
        { name: "staffingListReviewed", label: "Current staff list reviewed and up to date" },
        { name: "staffingVacanciesDiscussed", label: "Vacant positions identified and discussed" },
        { name: "staffingInductionVerified", label: "Staff induction and onboarding process verified" },
        { name: "staffingPerformanceIssuesAddressed", label: "Recent or pending staff performance issues addressed" },
        { name: "staffingWellbeingCheckConducted", label: "Staff wellbeing check conducted" },
      ] as const,
      notesField: "staffingSectionNotes" as keyof SquadronVisit,
      textField: { name: "staffingSuccessionPlanningNotes" as keyof SquadronVisit, label: "Succession Planning Notes (in place or required)" },
    },
    {
      value: "training", title: "Training / Personal Development",
      items: [
        { name: "trainingScheduleCurrent", label: "Cadet training schedule is current and implemented" },
        { name: "trainingStaffCurrencyMaintained", label: "Staff currency and competency maintained (e.g., WWCC, first aid, training quals)" },
        { name: "trainingCadetPdpReviewed", label: "Cadet personal development plans (promotion, classification) reviewed" },
        { name: "trainingCourseParticipationConfirmed", label: "Staff and cadet participation in recent or upcoming courses confirmed" },
        { name: "trainingRecordsUpToDate", label: "Records of training and attendance up to date (CadetNet or equivalent)" },
      ] as const,
      notesField: "trainingSectionNotes" as keyof SquadronVisit,
    },
    {
      value: "discipline", title: "Disciplinary Issues",
      items: [
        { name: "disciplineMattersDiscussed", label: "Any ongoing or recent disciplinary matters discussed" },
        { name: "disciplineProceduresFollowed", label: "Discipline procedures are being followed in accordance with policy" },
        { name: "disciplineSupportProvided", label: "Support provided for managing behaviour or welfare concerns" },
        { name: "disciplineRecordKeepingObserved", label: "Recordkeeping and confidentiality observed" },
      ] as const,
      notesField: "disciplineSectionNotes" as keyof SquadronVisit,
    },
    {
      value: "activities", title: "Upcoming Activities",
      items: [
        { name: "activitiesCalendarReviewed", label: "Squadron activity calendar reviewed (next 3-6 months)" },
        { name: "activitiesExternalApprovalsFlagged", label: "External activities requiring approvals/discussion flagged" },
        { name: "activitiesPlannedEventsNoted", label: "Planned courses, bivouacs, community events noted" },
        { name: "activitiesContingencyPlanningChecked", label: "Contingency planning (weather, cancellations, transport) checked" },
        { name: "activitiesEngagementEvaluated", label: "Cadet and staff engagement with activities evaluated" },
      ] as const,
      notesField: "activitiesSectionNotes" as keyof SquadronVisit,
    },
    {
      value: "issues", title: "Known Issues",
      items: [
        { name: "issuesEquipmentShortages", label: "Equipment or uniform shortages reported" },
        { name: "issuesFacilityConcerns", label: "Facility/venue concerns raised" },
        { name: "issuesItAdminSupplyProblems", label: "IT, admin, or supply problems flagged" },
        { name: "issuesUnresolvedSupportRequests", label: "Any unresolved regional support requests discussed" },
        { name: "issuesEscalationRequestsNoted", label: "Requests for escalation noted" },
      ] as const,
      notesField: "issuesSectionNotes" as keyof SquadronVisit,
    },
    {
      value: "safety", title: "Safety",
      items: [
        { name: "safetyRiskRegisterReviewed", label: "WHS Risk Register reviewed" },
        { name: "safetyIssuesAddressed", label: "Safety issues raised by staff or cadets addressed" },
        { name: "safetyIncidentReportsChecked", label: "Incident reports (recent) checked and follow-up confirmed" },
        { name: "safetyFirstAidPpeEmergencyProcedures", label: "First aid kits, PPE, and emergency procedures in place" },
        { name: "safetyVehicleEquipmentCompliance", label: "Vehicle and equipment safety compliance confirmed" },
      ] as const,
      notesField: "safetySectionNotes" as keyof SquadronVisit,
    },
  ];


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Visit Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="squadronName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Squadron</FormLabel>
                    <FormControl><Input placeholder="e.g., 123 Squadron" {...field} disabled={isSubmitting}/></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="visitDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date of Visit</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal",!field.value && "text-muted-foreground")} disabled={isSubmitting}>
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
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="rxoName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RXO Name</FormLabel>
                    <FormControl><Input placeholder="Name of RXO conducting visit" {...field} disabled={isSubmitting}/></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="coName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CO Name (Squadron)</FormLabel>
                    <FormControl><Input placeholder="Name of Squadron CO" {...field} disabled={isSubmitting}/></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Accordion type="multiple" className="w-full space-y-4" defaultValue={discussionSections.map(s => s.value)}>
          {discussionSections.map(section => (
            <AccordionItem value={section.value} key={section.value} className="border rounded-md shadow-sm bg-card">
              <AccordionTrigger className="px-4 py-3 hover:no-underline text-lg font-medium">
                {section.title}
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-0 space-y-4">
                {section.items.map(item => (
                  <FormCheckboxItem key={item.name} control={form.control} name={item.name as keyof SquadronVisit} label={item.label} disabled={isSubmitting}/>
                ))}
                {section.textField && (
                  <FormField
                    control={form.control}
                    name={section.textField.name}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{section.textField.label}</FormLabel>
                        <FormControl><Textarea placeholder="Notes..." {...field} rows={2} disabled={isSubmitting}/></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name={section.notesField}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Notes for {section.title}</FormLabel>
                      <FormControl><Textarea placeholder="Any other details for this section..." {...field} rows={3} disabled={isSubmitting}/></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <FormField
          control={form.control}
          name="generalComments"
          render={({ field }) => (
            <FormItem>
              <FormLabel>General Comments / Overall Notes</FormLabel>
              <FormControl><Textarea placeholder="Any overall comments or notes from the visit..." {...field} rows={4} disabled={isSubmitting}/></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Card>
          <CardHeader>
            <CardTitle>Action Items / Follow-Up</CardTitle>
          </CardHeader>
          <CardContent>
            {fields.map((field, index) => (
              <Card key={field.id} className="mb-4 p-4 space-y-3 shadow-sm border">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold text-md">Action Item {index + 1}</h4>
                  <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => remove(index)} disabled={isSubmitting}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <FormField
                  control={form.control}
                  name={`actionItems.${index}.description`}
                  render={({ field: itemField }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl><Textarea placeholder="Describe the action item" {...itemField} rows={2} disabled={isSubmitting}/></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name={`actionItems.${index}.responsible`}
                    render={({ field: itemField }) => (
                      <FormItem>
                        <FormLabel>Responsible</FormLabel>
                        <FormControl><Input placeholder="Person or role" {...itemField} disabled={isSubmitting}/></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`actionItems.${index}.dueDate`}
                    render={({ field: itemField }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Due Date (Optional)</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !itemField.value && "text-muted-foreground")} disabled={isSubmitting}>
                                {itemField.value ? format(itemField.value, "PPP") : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={itemField.value} onSelect={itemField.onChange} initialFocus disabled={isSubmitting}/>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`actionItems.${index}.status`}
                    render={({ field: itemField }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={itemField.onChange} defaultValue={itemField.value} disabled={isSubmitting}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {["Open", "In Progress", "Completed", "Deferred"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </Card>
            ))}
            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => append({ description: "", responsible: "", status: "Open" })} disabled={isSubmitting}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Action Item
            </Button>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Save Changes" : "Record Visit"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
