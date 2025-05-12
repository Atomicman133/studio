"use client";

import type { User as FirebaseUser, ParsedToken, IdTokenResult } from 'firebase/auth';
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
        try {
            const idTokenResult: IdTokenResult = await firebaseUser.getIdTokenResult(true); // force refresh
            // Ensure email is available and set it on the user object for consistency
            const userEmailFromToken = idTokenResult.claims.email as string | undefined;
            
            setUser({
                ...firebaseUser,
                // Prioritize email from token if available, fallback to firebaseUser.email
                email: userEmailFromToken || firebaseUser.email, 
                customClaims: idTokenResult.claims 
            } as User);
        } catch (tokenError) {
            console.error("Error getting ID token result:", tokenError);
            // Fallback: use firebaseUser directly, email might be null or not yet fully propagated
            setUser(firebaseUser as User); 
        }
      } else {
        setUser(null);
      }
      setLoading(false); // setLoading should be here, after user state is fully determined
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast({ title: 'Success', description: 'Signed in with Google.' });
      router.push('/'); 
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      toast({ variant: 'destructive', title: 'Google Sign-In Error', description: error.message });
    }
  };

  const signUpWithEmail = async (email: string, pass: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, pass);
      toast({ title: 'Success', description: 'Account created successfully.' });
      router.push('/'); 
    } catch (error: any) {
      console.error('Sign up error:', error);
      toast({ variant: 'destructive', title: 'Sign Up Error', description: error.message });
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      toast({ title: 'Success', description: 'Signed in successfully.' });
      router.push('/'); 
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast({ variant: 'destructive', title: 'Sign In Error', description: error.message });
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
      router.push('/auth'); 
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