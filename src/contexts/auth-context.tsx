
"use client";

import type { User as FirebaseUser, ParsedToken, IdTokenResult } from 'firebase/auth';
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile, 
  sendPasswordResetEmail, // Import sendPasswordResetEmail
} from 'firebase/auth';
import * as React from 'react';
import { auth } from '@/lib/firebase/config';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import type { ProfileUpdateFormData } from '@/app/profile/profile-schema'; 

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
  updateUserProfile: (data: ProfileUpdateFormData) => Promise<void>;
  changeUserPassword: () => Promise<void>; // Add this
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
            const idTokenResult: IdTokenResult = await firebaseUser.getIdTokenResult(true); 
            const userEmailFromToken = idTokenResult.claims.email as string | undefined;
            
            setUser({
                ...firebaseUser,
                email: userEmailFromToken || firebaseUser.email, 
                customClaims: idTokenResult.claims 
            } as User);
        } catch (tokenError) {
            console.error("Error getting ID token result:", tokenError);
            setUser(firebaseUser as User); 
        }
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

  const updateUserProfile = async (data: ProfileUpdateFormData) => {
    if (!auth.currentUser) {
      toast({ variant: 'destructive', title: 'Error', description: 'No user is currently signed in.' });
      return;
    }
    try {
      await updateProfile(auth.currentUser, {
        displayName: data.displayName,
        photoURL: data.photoURL || null, 
      });
      
      setUser(prevUser => {
        if (!prevUser) return null;
        const updatedFirebaseUser = { ...auth.currentUser } as FirebaseUser; 
        return {
          ...prevUser, 
          ...updatedFirebaseUser, 
          displayName: data.displayName,
          photoURL: data.photoURL || null,
        } as User;
      });
      toast({ title: 'Success', description: 'Profile updated successfully.' });
    } catch (error: any) {
      console.error('Profile update error:', error);
      toast({ variant: 'destructive', title: 'Profile Update Error', description: error.message });
    }
  };

  const changeUserPassword = async () => {
    if (!auth.currentUser || !auth.currentUser.email) {
      toast({ variant: 'destructive', title: 'Error', description: 'No authenticated user or email found.' });
      return;
    }
    // It's generally good practice to ensure the email is verified before sending a password reset,
    // but for password change of an ALREADY LOGGED IN user, we can assume they have access to their email.
    // Firebase sendPasswordResetEmail also implicitly handles this.
    try {
      await sendPasswordResetEmail(auth, auth.currentUser.email);
      toast({ title: 'Password Reset Email Sent', description: 'Please check your inbox (and spam folder) for a link to reset your password.' });
    } catch (error: any) {
      console.error('Password change (reset email) error:', error);
      toast({ variant: 'destructive', title: 'Password Change Error', description: error.message });
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signUpWithEmail, signInWithEmail, logout, updateUserProfile, changeUserPassword }}>
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
