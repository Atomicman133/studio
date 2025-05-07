
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCheck, CheckSquare, CalendarClock, BellRing, BarChart3 } from "lucide-react";

export default function CompliancePage() {
  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <UserCheck className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-2xl">Staff Compliance</CardTitle>
              <CardDescription>Track staff member compliance with mandatory training, certifications, and other requirements.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <h3 className="text-lg font-semibold mb-2 text-foreground">Planned Features:</h3>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li className="flex items-center">
              <CheckSquare className="h-5 w-5 mr-3 text-primary/70" />
              Define and manage various compliance items (e.g., First Aid, WWCC, specific qualifications).
            </li>
            <li className="flex items-center">
              <CalendarClock className="h-5 w-5 mr-3 text-primary/70" />
              Track expiry dates for certifications and licenses for each staff member.
            </li>
            <li className="flex items-center">
              <BellRing className="h-5 w-5 mr-3 text-primary/70" />
              Automated reminders and notifications for upcoming renewals or overdue items.
            </li>
            <li className="flex items-center">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 text-primary/70"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c0 5 6 5 6 0v-5"></path></svg>
              Upload and store evidence of compliance (e.g., certificates, signed forms).
            </li>
            <li className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-3 text-primary/70" />
              Generate compliance status reports for individuals, roles, or the entire squadron.
            </li>
          </ul>
          <p className="mt-6 text-sm italic text-muted-foreground">
            The Staff Compliance module is currently under development. The features listed above represent the planned capabilities.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
