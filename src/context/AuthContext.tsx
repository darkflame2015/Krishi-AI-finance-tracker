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
import { auth, googleProvider, firebaseConfigured } from '@/lib/firebase';

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

const PROFILES_KEY = 'krishi_user_profiles';

function getAdminEmails(): string[] {
    const raw = process.env.NEXT_PUBLIC_ADMIN_EMAILS || 'dsagnik2005@gmail.com';
    return raw.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
}

function isAdminEmail(email: string | null): boolean {
    if (!email) return false;
    const adminEmails = getAdminEmails();
    return adminEmails.includes(email.toLowerCase());
}

function getStoredProfiles(): Record<string, UserProfile> {
    if (typeof window === 'undefined') return {};
    try {
        const stored = localStorage.getItem(PROFILES_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
}

function setStoredProfile(profile: UserProfile): void {
    if (typeof window === 'undefined') return;
    try {
        const profiles = getStoredProfiles();
        profiles[profile.uid] = profile;
        localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
    } catch (err) {
        console.error('Failed to save profile:', err);
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const buildProfile = (u: User): UserProfile => {
        const profiles = getStoredProfiles();
        const existing = profiles[u.uid];
        
        // Always re-check admin status from env (overrides stale localStorage)
        const role: UserRole = isAdminEmail(u.email) ? 'admin' : 'user';
        
        const updatedProfile: UserProfile = {
            uid: u.uid,
            email: u.email,
            displayName: u.displayName || existing?.displayName || null,
            photoURL: u.photoURL || existing?.photoURL || null,
            role,
            region: existing?.region || '',
        };
        
        setStoredProfile(updatedProfile);
        return updatedProfile;
    };

    useEffect(() => {
        if (!auth || !firebaseConfigured) {
            setLoading(false);
            return;
        }
        const unsub = onAuthStateChanged(auth, async (u) => {
            setUser(u);
            if (u) {
                const p = buildProfile(u);
                setProfile(p);
            } else {
                setProfile(null);
            }
            setLoading(false);
        });
        return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loginWithEmail = async (email: string, password: string) => {
        if (!auth) throw new Error('Firebase not configured');
        await signInWithEmailAndPassword(auth, email, password);
    };

    const registerWithEmail = async (email: string, password: string, name: string) => {
        if (!auth) throw new Error('Firebase not configured');
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: name });
        
        const role: UserRole = isAdminEmail(cred.user.email) ? 'admin' : 'user';
        const newProfile: UserProfile = {
            uid: cred.user.uid,
            email: cred.user.email,
            displayName: name,
            photoURL: null,
            role,
            region: '',
        };

        setStoredProfile(newProfile);
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
