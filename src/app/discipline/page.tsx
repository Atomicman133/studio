
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Gavel, FileSignature, UserX, Archive, ShieldAlert } from "lucide-react";

export default function DisciplinePage() {
  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Gavel className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-2xl">Discipline Actions</CardTitle>
              <CardDescription>Record conversations, document breaches of conduct, and manage disciplinary processes.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <h3 className="text-lg font-semibold mb-2 text-foreground">Planned Features:</h3>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li className="flex items-center">
              <FileSignature className="h-5 w-5 mr-3 text-primary/70" />
              Securely record details of informal discussions and formal disciplinary actions.
            </li>
            <li className="flex items-center">
              <UserX className="h-5 w-5 mr-3 text-primary/70" />
              Categorize incidents and breaches according to squadron/AAFC policy.
            </li>
            <li className="flex items-center">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 text-primary/70"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c0 5 6 5 6 0v-5"></path></svg>
              Attach supporting documents, witness statements, and other evidence.
            </li>
            <li className="flex items-center">
              <ShieldAlert className="h-5 w-5 mr-3 text-primary/70" />
              Track outcomes, sanctions, and appeal processes.
            </li>
            <li className="flex items-center">
              <Archive className="h-5 w-5 mr-3 text-primary/70" />
              Maintain a confidential and auditable record of all disciplinary matters.
            </li>
          </ul>
          <p className="mt-6 text-sm italic text-muted-foreground">
            The Discipline Actions module is currently under development, focusing on secure and compliant record-keeping.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
