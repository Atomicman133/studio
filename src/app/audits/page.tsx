import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

export default function AuditsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <CardTitle>Safety Audits</CardTitle>
          </div>
          <CardDescription>Perform safety inspections, document hazards, and create action items.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Safety audits functionality will be implemented here. Users will be able to conduct inspections, record findings (including photos), and manage rectification actions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
