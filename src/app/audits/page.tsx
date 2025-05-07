
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, ListChecks, FilePlus2, Activity, FileText } from "lucide-react";

export default function AuditsPage() {
  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-2xl">Safety Audits</CardTitle>
              <CardDescription>Perform safety inspections, document hazards, and create action items.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <h3 className="text-lg font-semibold mb-2 text-foreground">Planned Features:</h3>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li className="flex items-center">
              <ListChecks className="h-5 w-5 mr-3 text-primary/70" />
              Create and manage customizable audit templates and checklists.
            </li>
            <li className="flex items-center">
              <FilePlus2 className="h-5 w-5 mr-3 text-primary/70" />
              Schedule and assign audits to responsible personnel.
            </li>
            <li className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 text-primary/70"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path><circle cx="12" cy="13" r="3"></circle></svg>
              Conduct audits with integrated checklists, note-taking, and photo/document uploads.
            </li>
            <li className="flex items-center">
              <Activity className="h-5 w-5 mr-3 text-primary/70" />
              Track findings, assign corrective and preventative actions (CAPAs), and monitor resolution progress.
            </li>
            <li className="flex items-center">
              <FileText className="h-5 w-5 mr-3 text-primary/70" />
              Generate comprehensive audit reports and analyze safety trends.
            </li>
          </ul>
           <p className="mt-6 text-sm italic text-muted-foreground">
            The full Safety Audits module is currently under development. The features listed above represent the planned capabilities.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
