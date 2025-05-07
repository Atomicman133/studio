import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Gavel } from "lucide-react";

export default function DisciplinePage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Gavel className="h-6 w-6 text-primary" />
            <CardTitle>Discipline Actions</CardTitle>
          </div>
          <CardDescription>Record conversations and document serious breaches of code of conduct.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Discipline actions functionality will be implemented here. Users will be able to record and manage discipline-related information.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
