
"use client";

import * as React from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { emailPasswordSchema, signUpSchema, type EmailPasswordFormData, type SignUpFormData } from "../auth-schema";
import { useAuth } from "@/contexts/auth-context";
import { Loader2 } from "lucide-react";
import { sendPasswordResetEmail } from "firebase/auth"; 
import { auth } from "@/lib/firebase/config"; 
import { useToast } from "@/hooks/use-toast"; 
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function AuthForm() {
  const { signInWithGoogle, signUpWithEmail, signInWithEmail } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("login");
  const { toast } = useToast();

  const [isDisclaimerOpen, setIsDisclaimerOpen] = React.useState(false);
  const [pendingLoginMethod, setPendingLoginMethod] = React.useState<'email' | 'google' | null>(null);

  const loginForm = useForm<EmailPasswordFormData>({
    resolver: zodResolver(emailPasswordSchema),
    defaultValues: { email: "", password: "" },
  });

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  const onLoginSubmit: SubmitHandler<EmailPasswordFormData> = () => {
    setPendingLoginMethod('email');
    setIsDisclaimerOpen(true);
  };
  
  const handleGoogleSignInClick = () => {
    setPendingLoginMethod('google');
    setIsDisclaimerOpen(true);
  };

  const handleAcceptAndProceed = async () => {
    setIsDisclaimerOpen(false);
    setIsSubmitting(true);

    if (pendingLoginMethod === 'email') {
        const data = loginForm.getValues();
        await signInWithEmail(data.email, data.password);
    } else if (pendingLoginMethod === 'google') {
        await signInWithGoogle();
    }

    setIsSubmitting(false);
    setPendingLoginMethod(null);
  };
  
  const handleCancelLogin = () => {
    setPendingLoginMethod(null);
    setIsDisclaimerOpen(false);
  };


  const onSignUpSubmit: SubmitHandler<SignUpFormData> = async (data) => {
    setIsSubmitting(true);
    await signUpWithEmail(data.email, data.password);
    setIsSubmitting(false);
  };

  const handlePasswordReset = async () => {
    const email = loginForm.getValues("email");
    if (!email) {
      loginForm.setError("email", { type: "manual", message: "Please enter your email to reset password." });
      return;
    }
    if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email)) {
        loginForm.setError("email", { type: "manual", message: "Please enter a valid email address." });
        return;
    }

    setIsSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast({ title: "Password Reset Email Sent", description: "If an account exists for this email, a password reset link has been sent. Please check your inbox (and spam folder)." });
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast({ variant: "destructive", title: "Password Reset Error", description: error.message });
    }
    setIsSubmitting(false);
  };

  return (
    <>
      <Card className="w-full max-w-md shadow-xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome to Squadron Manager</CardTitle>
            <CardDescription>Please sign in or create an account to continue.</CardDescription>
            <TabsList className="grid w-full grid-cols-2 mt-4">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
          </CardHeader>

          <TabsContent value="login">
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)}>
                <CardContent className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="m@example.com" {...field} disabled={isSubmitting} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex justify-between items-center">
                          <FormLabel>Password</FormLabel>
                          <Button
                            variant="link"
                            type="button"
                            onClick={handlePasswordReset}
                            className="text-xs h-auto p-0 text-muted-foreground hover:text-primary disabled:text-muted-foreground/70"
                            disabled={isSubmitting}
                          >
                            Forgot password?
                          </Button>
                        </div>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} disabled={isSubmitting} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting && activeTab === "login" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Login
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="signup">
            <Form {...signUpForm}>
              <form onSubmit={signUpForm.handleSubmit(onSignUpSubmit)}>
                <CardContent className="space-y-4">
                  <FormField
                    control={signUpForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="m@example.com" {...field} disabled={isSubmitting} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signUpForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Create a password" {...field} disabled={isSubmitting} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signUpForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Confirm your password" {...field} disabled={isSubmitting} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting && activeTab === "signup" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign Up
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
        <CardContent>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={handleGoogleSignInClick} disabled={isSubmitting}>
            {isSubmitting && pendingLoginMethod === 'google' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> :
              <svg role="img" viewBox="0 0 24 24" className="mr-2 h-4 w-4"><path fill="currentColor" d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.08-2.58 2.03-4.66 2.03-3.87 0-7.02-3.22-7.02-7.2s3.15-7.2 7.02-7.2c1.98 0 3.66.83 4.54 1.72l2.48-2.48C18.32.54 15.9.01 12.48.01 5.83.01 0 5.85 0 12.5s5.83 12.49 12.48 12.49c3.27 0 5.73-1.12 7.58-2.98 1.94-1.94 2.74-4.75 2.74-7.96v-.01c0-.8-.09-1.25-.24-1.61H12.48z"></path></svg>
            }
            Google
          </Button>
        </CardContent>
      </Card>
      <AlertDialog open={isDisclaimerOpen} onOpenChange={setIsDisclaimerOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Attention</AlertDialogTitle>
            <AlertDialogDescription asChild>
                <div className="space-y-4 text-sm text-muted-foreground">
                    <p>Squadron Manager is a supplementary tool and is **not** an official Australian Air Force Cadets (AAFC) information system.</p>
                    <p>Although it does not store sensitive or classified information, users must exercise care and sound judgement when accessing, entering, or using any information contained within this platform.</p>
                    <p>Access is restricted to authorised members of the Australian Air Force Cadets who have been specifically granted permission. By proceeding, you acknowledge your responsibility to handle all information appropriately, maintain confidentiality where required, and comply with all relevant AAFC policies, directives, and expectations.</p>
                    <p>Unauthorised access or misuse is strictly prohibited.</p>
                </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelLogin}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAcceptAndProceed}>
              Accept and Proceed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
    
    