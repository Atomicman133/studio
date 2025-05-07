
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, ListChecks, BarChartHorizontalBig, UserCog, Trophy } from "lucide-react";

export default function TrainingPage() {
  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-2xl">Training Overview</CardTitle>
              <CardDescription>Record staff training, qualifications, accomplishments, and generate reports.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <h3 className="text-lg font-semibold mb-2 text-foreground">Planned Features:</h3>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li className="flex items-center">
              <ListChecks className="h-5 w-5 mr-3 text-primary/70" />
              Log completed training courses, workshops, and qualifications for each staff member.
            </li>
            <li className="flex items-center">
              <UserCog className="h-5 w-5 mr-3 text-primary/70" />
              Track instructor qualifications and endorsements.
            </li>
            <li className="flex items-center">
              <Trophy className="h-5 w-5 mr-3 text-primary/70" />
              Record significant achievements, awards, and recognitions.
            </li>
            <li className="flex items-center">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 text-primary/70"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c0 5 6 5 6 0v-5"></path></svg>
              Upload and manage training certificates and supporting documentation.
            </li>
            <li className="flex items-center">
              <BarChartHorizontalBig className="h-5 w-5 mr-3 text-primary/70" />
              Generate reports on training completion, qualification status, and skill gaps.
            </li>
          </ul>
          <p className="mt-6 text-sm italic text-muted-foreground">
            The Training Overview module is currently under development to provide a comprehensive view of your squadron's training landscape.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
