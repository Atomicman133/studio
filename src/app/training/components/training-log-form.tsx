
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { trainingLogFormSchema, type TrainingLogFormData, type TrainingLog } from "../training-schema";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { CalendarIcon, Paperclip, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { RANKS } from "@/app/staff/staff-schema"; 
import * as React from "react";

interface TrainingLogFormProps {
  onSubmit: (data: TrainingLogFormData) => void;
  defaultValues?: Partial<TrainingLogFormData>; // Now includes potential certificateFile for initial display logic
  onCancel: () => void;
  isEditing: boolean;
}

export function TrainingLogForm({ onSubmit, defaultValues, onCancel, isEditing }: TrainingLogFormProps) {
  const [currentFileName, setCurrentFileName] = React.useState<string | undefined>(defaultValues?.certificateFileName);
  
  const form = useForm<TrainingLogFormData>({
    resolver: zodResolver(trainingLogFormSchema),
    defaultValues: {
      rank: defaultValues?.rank || undefined,
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
      certificateFile: undefined, // File input should always start empty
    },
  });

  React.useEffect(() => {
    setCurrentFileName(defaultValues?.certificateFileName);
  }, [defaultValues?.certificateFileName]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue("certificateFile", file);
      setCurrentFileName(file.name);
    } else {
      form.setValue("certificateFile", undefined);
      // If editing and user clears file input, keep original default file name if no new file is picked.
      // This logic is subtle: if they *remove* a file by clearing input, we don't want to lose the original unless they submit.
      // For now, clearing the input means no file will be submitted. If they *had* an old file, it would be kept.
      // The 'Remove Certificate' button is clearer for explicit removal.
      // setCurrentFileName(defaultValues?.certificateFileName); // Revert to original if input cleared without new selection
    }
  };
  
  const handleRemoveCertificate = () => {
    form.setValue("certificateFile", undefined, { shouldValidate: true }); // Clear the file input
    form.setValue("certificateFileName", undefined); // Signal removal of existing
    form.setValue("certificateDataUrl", undefined); // Signal removal of existing
    setCurrentFileName(undefined);
  };


  const handleSubmit = (data: TrainingLogFormData) => {
    onSubmit(data);
     if (!isEditing) {
      form.reset({
        rank: undefined,
        staffName: "",
        squadron: "",
        currentRole: "",
        courseName: "",
        completionDate: undefined,
        qualificationAchieved: "",
        instructorQualification: "",
        achievementDetails: "",
        certificateFile: undefined,
        certificateFileName: undefined,
        certificateDataUrl: undefined,
      });
      setCurrentFileName(undefined);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="rank"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rank</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select rank" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {RANKS.map((rank) => (
                      <SelectItem key={rank} value={rank}>
                        {rank}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="staffName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Staff Member Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Doe, John (Surname, Firstname)" {...field} />
                </FormControl>
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
                  <Input placeholder="e.g., 123 Squadron" {...field} />
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
                  <Input placeholder="e.g., Training Officer" {...field} />
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
              <FormLabel>Course/Training Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Advanced First Aid" {...field} />
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
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
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
          name="qualificationAchieved"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Qualification Achieved (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Certificate IV TAE" {...field} />
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
                <Input placeholder="e.g., Qualified Gliding Instructor" {...field} />
              </FormControl>
              <FormDescription>If this training resulted in an instructor qualification.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="achievementDetails"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Achievements/Awards (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Details of any awards or significant recognitions related to this training..." {...field} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormItem>
          <FormLabel>Certificate/Document (Optional)</FormLabel>
          {currentFileName && !form.watch("certificateFile") && (
            <div className="text-sm text-muted-foreground mb-2 flex items-center justify-between p-2 border rounded-md">
              <span>Current: {currentFileName}</span>
              <Button type="button" variant="ghost" size="sm" onClick={handleRemoveCertificate} title="Remove current certificate">
                <XCircle className="h-4 w-4 mr-1" /> Remove
              </Button>
            </div>
          )}
           <Input
              id="certificateFile"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={handleFileChange}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
          <FormDescription>Upload PDF, JPG, PNG, or WEBP file (Max 5MB).</FormDescription>
          <FormMessage>{form.formState.errors.certificateFile?.message}</FormMessage>
        </FormItem>


        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">{isEditing ? "Save Changes" : "Log Training Record"}</Button>
        </div>
      </form>
    </Form>
  );
}
