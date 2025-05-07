
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { RANKS } from "@/app/staff/staff-schema"; // Import RANKS

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
      rank: undefined,
      staffName: "",
      squadron: "",
      currentRole: "",
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
      });
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
                  <Input placeholder="e.g., John Doe (Surname, Firstname)" {...field} />
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
