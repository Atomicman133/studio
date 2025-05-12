
"use client";

import type { User as FirebaseUser, ParsedToken } from 'firebase/auth';
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import * as React from 'react';
import { auth } from '@/lib/firebase/config';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface User extends FirebaseUser {
  // You can extend the FirebaseUser type with custom properties if needed
  // For example: idTokenResult?: IdTokenResult;
  // For simplicity, we'll use the base FirebaseUser type
  // but you might want to store idToken or custom claims here.
  customClaims?: ParsedToken;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmail: (email: string, pass: string) => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const { toast } = useToast();
  const router = useRouter();

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Optionally get custom claims or ID token result
        // const idTokenResult = await firebaseUser.getIdTokenResult();
        // setUser({ ...firebaseUser, customClaims: idTokenResult.claims });

        setUser(firebaseUser as User); // Cast for now, extend User type if needed
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast({ title: 'Success', description: 'Signed in with Google.' });
      router.push('/'); // Redirect to dashboard after successful login
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      toast({ variant: 'destructive', title: 'Google Sign-In Error', description: error.message });
    }
  };

  const signUpWithEmail = async (email: string, pass: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, pass);
      toast({ title: 'Success', description: 'Account created successfully.' });
      router.push('/'); // Redirect to dashboard
    } catch (error: any) {
      console.error('Sign up error:', error);
      toast({ variant: 'destructive', title: 'Sign Up Error', description: error.message });
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      toast({ title: 'Success', description: 'Signed in successfully.' });
      router.push('/'); // Redirect to dashboard
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast({ variant: 'destructive', title: 'Sign In Error', description: error.message });
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
      router.push('/auth'); // Redirect to auth page after logout
    } catch (error: any) {
      console.error('Logout error:', error);
      toast({ variant: 'destructive', title: 'Logout Error', description: error.message });
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signUpWithEmail, signInWithEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
