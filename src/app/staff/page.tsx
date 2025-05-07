import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

export default function StaffPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            <CardTitle>Staff Management</CardTitle>
          </div>
          <CardDescription>Manage staff member records and information.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Staff management functionality will be implemented here. Users will be able to add, view, edit, and manage staff details.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
