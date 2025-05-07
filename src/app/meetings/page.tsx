
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ListTodo, CalendarPlus, Users, DownloadCloud } from "lucide-react";

export default function MeetingsPage() {
  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-2xl">Meeting Logger</CardTitle>
              <CardDescription>Record and document meeting minutes, action items, and decisions efficiently.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <h3 className="text-lg font-semibold mb-2 text-foreground">Planned Features:</h3>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li className="flex items-center">
              <CalendarPlus className="h-5 w-5 mr-3 text-primary/70" />
              Create new meeting records with date, time, attendees, and agenda.
            </li>
            <li className="flex items-center">
              <Users className="h-5 w-5 mr-3 text-primary/70" />
              Manage attendee lists and track attendance.
            </li>
            <li className="flex items-center">
              <ListTodo className="h-5 w-5 mr-3 text-primary/70" />
              Document discussion points, decisions made, and assign action items with due dates and responsible persons.
            </li>
            <li className="flex items-center">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 text-primary/70"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c0 5 6 5 6 0v-5"></path></svg>
              Attach relevant documents or files to meeting records.
            </li>
            <li className="flex items-center">
              <DownloadCloud className="h-5 w-5 mr-3 text-primary/70" />
              Search, filter, and export meeting minutes and action item lists.
            </li>
          </ul>
           <p className="mt-6 text-sm italic text-muted-foreground">
            The Meeting Logger module is currently under development to streamline your meeting documentation process.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
