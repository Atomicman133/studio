import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function MeetingsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <CardTitle>Meeting Logger</CardTitle>
          </div>
          <CardDescription>Record and document meeting minutes, action items, and decisions.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Meeting logger functionality will be implemented here. Users will be able to create, view, edit, and export meeting records.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
