import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap } from "lucide-react";

export default function TrainingPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            <CardTitle>Training Overview</CardTitle>
          </div>
          <CardDescription>Record staff training, accomplishments, and generate reports.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Training overview functionality will be implemented here. Squadron Executives will be able to manage training records and produce reports.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
