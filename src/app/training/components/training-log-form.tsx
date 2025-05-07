
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { trainingLogSchema, type TrainingLog } from "../training-schema";
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
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrainingLogFormProps {
  onSubmit: (data: TrainingLog) => void;
  defaultValues?: Partial<TrainingLog>;
  onCancel: () => void;
  isEditing: boolean;
}

export function TrainingLogForm({ onSubmit, defaultValues, onCancel, isEditing }: TrainingLogFormProps) {
  const form = useForm<TrainingLog>({
    resolver: zodResolver(trainingLogSchema),
    defaultValues: defaultValues || {
      staffName: "",
      courseName: "",
      completionDate: undefined,
      qualificationAchieved: "",
      instructorQualification: "",
      achievementDetails: "",
    },
  });

  const handleSubmit = (data: TrainingLog) => {
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
              <FormLabel>Staff Member Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
