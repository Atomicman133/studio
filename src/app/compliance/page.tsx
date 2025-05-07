import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCheck } from "lucide-react";

export default function CompliancePage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-primary" />
            <CardTitle>Staff Compliance</CardTitle>
          </div>
          <CardDescription>Track staff member compliance with mandatory training and other items.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Staff compliance form functionality will be implemented here. Users will be able to capture and manage compliance data for staff members.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
