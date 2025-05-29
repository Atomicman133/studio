
"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Palette, Bell, ShieldQuestion } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";

function ClientThemeToggle() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-10 w-24 rounded-md bg-muted animate-pulse" />; // Placeholder for button
  }

  return (
    <Button
      variant="outline"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
    >
      {theme === "light" ? (
        <Moon className="mr-2 h-4 w-4" />
      ) : (
        <Sun className="mr-2 h-4 w-4" />
      )}
      Switch to {theme === "light" ? "Dark" : "Light"} Mode
    </Button>
  );
}


export default function SettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 max-w-3xl">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Settings</CardTitle>
          <CardDescription>Manage your application preferences and account settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-3 flex items-center">
              <Palette className="mr-2 h-5 w-5 text-primary" /> Appearance
            </h2>
            <div className="p-4 border rounded-lg bg-card">
              <p className="text-sm text-muted-foreground mb-2">
                Customize the look and feel of the application.
              </p>
              <ClientThemeToggle />
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 flex items-center">
              <Bell className="mr-2 h-5 w-5 text-primary" /> Notifications
            </h2>
            <div className="p-4 border rounded-lg bg-card">
              <p className="text-sm text-muted-foreground">
                Notification settings are not yet available.
              </p>
              {/* Placeholder for future notification settings */}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 flex items-center">
             <ShieldQuestion className="mr-2 h-5 w-5 text-primary" /> Account
            </h2>
             <div className="p-4 border rounded-lg bg-card">
              <p className="text-sm text-muted-foreground mb-2">
                Manage your account details. Password changes and account deletion are handled through your Google account or email provider directly if using email/password sign-in (not directly within this app).
              </p>
              <Button variant="outline" onClick={() => router.push('/profile')}>
                View/Edit Profile
              </Button>
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
