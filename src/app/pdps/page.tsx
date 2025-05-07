import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase } from "lucide-react";

export default function PdpsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            <CardTitle>Professional Development Planning</CardTitle>
          </div>
          <CardDescription>Create and export professional development plans for staff members.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Professional Development Planning functionality will be implemented here. Users will be able to create and manage PDPs.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
