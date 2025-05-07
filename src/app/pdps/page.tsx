
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Target, BarChart2, UserRoundCheck, FileEdit } from "lucide-react";

export default function PdpsPage() {
  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Briefcase className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-2xl">Professional Development Planning (PDP)</CardTitle>
              <CardDescription>Create, manage, and track professional development plans for staff members.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <h3 className="text-lg font-semibold mb-2 text-foreground">Planned Features:</h3>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li className="flex items-center">
              <FileEdit className="h-5 w-5 mr-3 text-primary/70" />
              Create individualized PDPs for each staff member, outlining goals and development areas.
            </li>
            <li className="flex items-center">
              <Target className="h-5 w-5 mr-3 text-primary/70" />
              Set SMART (Specific, Measurable, Achievable, Relevant, Time-bound) goals and objectives.
            </li>
            <li className="flex items-center">
              <BarChart2 className="h-5 w-5 mr-3 text-primary/70" />
              Track progress against development activities, training courses, and mentorship programs.
            </li>
            <li className="flex items-center">
              <UserRoundCheck className="h-5 w-5 mr-3 text-primary/70" />
              Conduct periodic reviews and provide feedback on PDP progress.
            </li>
            <li className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 text-primary/70"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>
              Generate reports on PDP completion and overall staff development.
            </li>
          </ul>
          <p className="mt-6 text-sm italic text-muted-foreground">
            The PDP module is currently under development to support the growth and development of your squadron staff.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
