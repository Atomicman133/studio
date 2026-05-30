"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { trainingLogFormSchema, type TrainingLogFormData } from "../training-schema";
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
import { CalendarIcon, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { RANKS } from "@/app/staff/staff-schema"; // For rank dropdown

interface TrainingLogFormProps {
  onSubmit: (data: TrainingLogFormData) => void;
  defaultValues?: Partial<TrainingLogFormData>;
  onCancel: () => void;
  isEditing: boolean;
  isSubmitting?: boolean;
}

export function TrainingLogForm({
  onSubmit,
  defaultValues,
  onCancel,
  isEditing,
  isSubmitting,
}: TrainingLogFormProps) {
    const [currentFileName, setCurrentFileName] = React.useState<string | undefined>(defaultValues?.certificateFileName);

    const form = useForm<TrainingLogFormData>({
        resolver: zodResolver(trainingLogFormSchema),
        defaultValues: {
          rank: defaultValues?.rank,
          staffName: defaultValues?.staffName || "",
          squadron: defaultValues?.squadron || "",
          currentRole: defaultValues?.currentRole || "",
          courseName: defaultValues?.courseName || "",
          completionDate: defaultValues?.completionDate || undefined,
          qualificationAchieved: defaultValues?.qualificationAchieved || "",
          instructorQualification: defaultValues?.instructorQualification || "",
          achievementDetails: defaultValues?.achievementDetails || "",
          certificateFileName: defaultValues?.certificateFileName || undefined,
          certificateDataUrl: defaultValues?.certificateDataUrl || undefined,
          certificateFile: undefined,
          serviceNumber: defaultValues?.serviceNumber || "",
        },
    });

  React.useEffect(() => {
    setCurrentFileName(defaultValues?.certificateFileName);
  }, [defaultValues?.certificateFileName]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue("certificateFile", file, { shouldValidate: true });
      setCurrentFileName(file.name);
      form.setValue("certificateFileName", undefined); 
      form.setValue("certificateDataUrl", undefined);
    }
  };

  const handleRemoveFile = () => {
    form.setValue("certificateFile", undefined, { shouldValidate: true });
    form.setValue("certificateFileName", undefined);
    form.setValue("certificateDataUrl", undefined);
    setCurrentFileName(undefined);
  };

    const handleSubmit = (data: TrainingLogFormData) => {
        onSubmit(data);
        if (!isEditing) {
            form.reset();
            setCurrentFileName(undefined);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="staffName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Staff Member Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., John Doe" {...field} disabled={isSubmitting} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="serviceNumber"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Service Number</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., 8000000" {...field} disabled={isSubmitting} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="rank"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Rank</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                                    <FormControl>
                                        <SelectTrigger><SelectValue placeholder="Select a rank" /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {RANKS.map((rank) => (
                                            <SelectItem key={rank} value={rank}>{rank}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="squadron"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Squadron</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., 701 Squadron" {...field} disabled={isSubmitting} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="currentRole"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Current Role</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., Training Officer" {...field} disabled={isSubmitting} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                
                <FormField
                    control={form.control}
                    name="courseName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Course / Accomplishment Name</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., Defence Youth Safety Annual Awareness Training" {...field} disabled={isSubmitting} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="completionDate"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Completion Date</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")} disabled={isSubmitting}>
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
                    name="qualificationAchieved"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Qualification Achieved (Optional)</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., HLTAID003 Provide First Aid" {...field} disabled={isSubmitting} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="instructorQualification"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Instructor Qualification (Optional)</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., QGI" {...field} disabled={isSubmitting} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="achievementDetails"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Achievement Details / Notes (Optional)</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Any additional details..." {...field} rows={3} disabled={isSubmitting} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormItem>
                    <FormLabel>Certificate (Optional)</FormLabel>
                    {currentFileName && !form.watch("certificateFile") && (
                        <div className="text-sm text-muted-foreground mb-2 flex items-center justify-between p-2 border rounded-md">
                        <span>Current: {currentFileName}</span>
                        <Button type="button" variant="ghost" size="sm" onClick={handleRemoveFile} title="Remove current file" disabled={isSubmitting}>
                            <XCircle className="h-4 w-4 mr-1" /> Remove
                        </Button>
                        </div>
                    )}
                    <Input
                        id="certificateFile"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        onChange={handleFileChange}
                        disabled={isSubmitting}
                        className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                    />
                    <FormDescription>Upload PDF, JPG, PNG, or WEBP file (Max 5MB).</FormDescription>
                    <FormMessage>{form.formState.errors.certificateFile?.message}</FormMessage>
                </FormItem>

                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isEditing ? "Save Changes" : "Log Accomplishment"}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
