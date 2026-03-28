'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
    User,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    signOut,
    updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db, firebaseConfigured } from '@/lib/firebase';

export type UserRole = 'user' | 'admin';

interface UserProfile {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    role: UserRole;
    region: string;
}

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    loginWithEmail: (email: string, password: string) => Promise<void>;
    registerWithEmail: (email: string, password: string, name: string) => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async (u: User): Promise<UserProfile | null> => {
        if (!db) return null;
        try {
            const docRef = doc(db, 'users', u.uid);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                return snap.data() as UserProfile;
            }
            const newProfile: UserProfile = {
                uid: u.uid,
                email: u.email,
                displayName: u.displayName,
                photoURL: u.photoURL,
                role: 'user',
                region: '',
            };
            await setDoc(docRef, { ...newProfile, createdAt: serverTimestamp() });
            return newProfile;
        } catch {
            console.error('Error fetching profile');
            return null;
        }
    };

    useEffect(() => {
        if (!auth || !firebaseConfigured) {
            setLoading(false);
            return;
        }
        const unsub = onAuthStateChanged(auth, async (u) => {
            setUser(u);
            if (u) {
                const p = await fetchProfile(u);
                setProfile(p);
            } else {
                setProfile(null);
            }
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const loginWithEmail = async (email: string, password: string) => {
        if (!auth) throw new Error('Firebase not configured');
        await signInWithEmailAndPassword(auth, email, password);
    };

    const registerWithEmail = async (email: string, password: string, name: string) => {
        if (!auth || !db) throw new Error('Firebase not configured');
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: name });
        const newProfile: UserProfile = {
            uid: cred.user.uid,
            email: cred.user.email,
            displayName: name,
            photoURL: null,
            role: 'user',
            region: '',
        };
        await setDoc(doc(db, 'users', cred.user.uid), { ...newProfile, createdAt: serverTimestamp() });
        setProfile(newProfile);
    };

    const loginWithGoogle = async () => {
        if (!auth || !googleProvider) throw new Error('Firebase not configured');
        await signInWithPopup(auth, googleProvider);
    };

    const logout = async () => {
        if (!auth) return;
        await signOut(auth);
        setProfile(null);
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, loginWithEmail, registerWithEmail, loginWithGoogle, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
