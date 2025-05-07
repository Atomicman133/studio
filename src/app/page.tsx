import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Rocket } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-full p-4 sm:p-6 lg:p-8">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="items-center text-center">
          <div className="p-3 rounded-full bg-primary text-primary-foreground mb-4">
            <Rocket className="w-10 h-10" />
          </div>
          <CardTitle className="text-3xl font-bold">Welcome to Squadron Manager</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Your all-in-one solution for managing Australian Air Force Cadet Squadrons.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Streamline your squadron operations with dedicated modules for meeting logging, training overview, professional development, discipline actions, safety audits, and staff compliance.
          </p>
          <p className="text-muted-foreground">
            Navigate using the sidebar to access different features.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
